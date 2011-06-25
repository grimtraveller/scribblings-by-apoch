//
// FileWatch filesystem monitoring utility
// By Mike Lewis, June 2011
// http://scribblings-by-apoch.googlecode.com/
//
// Internal implementation details of the file monitor routines
//

#include "Pch.h"
#include "FileWatch.h"
#include "FileWatchImpl.h"

#include <vector>
#include <string>


//
// Constants
//
static const DWORD NotificationFilter = FILE_NOTIFY_CHANGE_SIZE | FILE_NOTIFY_CHANGE_ATTRIBUTES | FILE_NOTIFY_CHANGE_DIR_NAME | FILE_NOTIFY_CHANGE_FILE_NAME | FILE_NOTIFY_CHANGE_LAST_WRITE;


//
// Internal implementation
//
namespace
{
	//
	// Record describing a list of paths being watched
	//
	// This includes various information such as the name of the root path
	// that was monitored, the callback that should be invoked when activity
	// is detected on that path, a buffer for holding information about the
	// activity/activities that were detected (this is parsed internally and
	// translated into an ActivityType enum value), the handle to the open
	// directory that is being monitored, and a helper structure for use with
	// the Windows Overlapped I/O subsystems.
	//
	struct WatchedPath
	{
		std::wstring Path;
		FileWatchCallback Callback;
		std::vector<char> Buffer;
		HANDLE Directory;
		OVERLAPPED Overlapped;
	};

	//
	// List of all actively watched paths and their tracking records
	//
	std::list<WatchedPath> WatchedPaths;


	//
	// I/O completion routine for handling file monitoring callbacks
	//
	// This routine is invoked asynchronously by Windows when the monitor thread
	// is in an alertable state, and something in one of the monitored paths has
	// occurred. Essentially, it just parses the activity notifications from the
	// OS and relays them up to the provided callback functions.
	//
	void WINAPI FileWatchCompletionRoutine(DWORD error, DWORD bytes, LPOVERLAPPED overlapped)
	{
		//
		// Ignore the routine if something has gone wrong
		//
		// Ideally we should try and cope with error conditions, but in practice
		// they are exceedingly rare, and usually only occur during teardown, so
		// we're probably already coping with them by shutting down the monitor.
		//
		if(error || !bytes)
			return;

		//
		// Parse out the notification details provided
		//
		WatchedPath& wp = *reinterpret_cast<WatchedPath*>(overlapped->hEvent);

		FILE_NOTIFY_INFORMATION* info = reinterpret_cast<FILE_NOTIFY_INFORMATION*>(&wp.Buffer[0]);
		while(true)
		{
			// The provided path strings are Unicode and NOT null-terminated,
			// so we need to do some intermediate juggling to get them into a
			// string wrapper that is easy to deal with.
			std::vector<wchar_t> buffer;
			buffer.reserve(info->FileNameLength + 1);
			std::copy(info->FileName, info->FileName + (info->FileNameLength / sizeof(wchar_t)), std::back_inserter(buffer));
			buffer.push_back(L'\0');

			// Determine what kind of activity transpired
			ActivityType activity = Activity_Unknown;
			switch(info->Action)
			{
			case FILE_ACTION_ADDED:				activity = Activity_Create;		break;
			case FILE_ACTION_REMOVED:			activity = Activity_Delete;		break;
			case FILE_ACTION_MODIFIED:			activity = Activity_Change;		break;
			case FILE_ACTION_RENAMED_OLD_NAME:	activity = Activity_NameFrom;	break;
			case FILE_ACTION_RENAMED_NEW_NAME:	activity = Activity_NameTo;		break;
			}

			// Construct the full path to the file/directory that was affected
			std::wstring fullpath(wp.Path);
			fullpath += L'\\';
			fullpath += &buffer[0];
			wp.Callback(activity, fullpath.c_str());

			// Stop processing once no further entries are available
			if(info->NextEntryOffset == 0)
				break;

			// Advance to the next notification record
			info = reinterpret_cast<FILE_NOTIFY_INFORMATION*>(reinterpret_cast<char*>(info) + info->NextEntryOffset);
		}

		// Reset the monitor to detect additional activity in the future
		if(!::ReadDirectoryChangesW(wp.Directory, &wp.Buffer[0], static_cast<DWORD>(wp.Buffer.size()), TRUE, NotificationFilter, NULL, &wp.Overlapped, FileWatchCompletionRoutine))
		{
			// If something went wrong, silently shut down the monitor for this path
			for(std::list<WatchedPath>::iterator iter = WatchedPaths.begin(); iter != WatchedPaths.end(); ++iter)
			{
				if(&(*iter) == &wp)
				{
					::CloseHandle(wp.Directory);
					WatchedPaths.erase(iter);
					break;
				}
			}
		}
	}

}


//
// Implementation details exposed to the outside
//
namespace FileWatchImpl
{

	//
	// Variables used for tracking the implementation's internal state
	//

	HANDLE WakeEvent = INVALID_HANDLE_VALUE;		// Event used to wake up the monitor thread

	std::list<Command> Commands;					// List of pending commands for the monitor thread

	Threads::CriticalSection CommandCritSec;		// Critical section protecting the Commands list



	//
	// Thread procedure for the monitoring system
	//
	// This thread is spun up when the file monitor is initialized, and remains asleep
	// for the majority of the time. When it is awoken, it will either be because of a
	// command that has been injected into the command list (in which case it wakes up
	// because the WakeEvent was signalled) or because file activity has occurred. For
	// the latter case, the thread proc doesn't actually execute directly. Instead, we
	// get a call to the I/O completion routine (see above) which handles the activity
	// and dispatches notifications out to the provided callbacks. Note that since the
	// callbacks are received on the file watcher thread, all invoked code will run in
	// that context! Therefore clients should handle their callbacks carefully so they
	// don't introduce threading issues. See FileWatchUI for an example.
	//
	DWORD WINAPI FileWatcherThreadProc(void*)
	{
		bool running = true;

		while(running)
		{
			// Sleep on the wake-up event, remaining in an alertable state so
			// Windows can dispatch our I/O completion routine as necessary
			DWORD ret = ::WaitForSingleObjectEx(WakeEvent, INFINITE, TRUE);
			if(ret == WAIT_OBJECT_0)
			{
				// If the wake event was signalled, it's because we have new
				// commands to process. Lock the critical section and have a
				// look at what we need to do.
				Threads::CriticalSection::Auto lock(CommandCritSec);

				for(std::list<Command>::const_iterator iter = Commands.begin(); iter != Commands.end(); ++iter)
				{
					switch(iter->WhichCommand)
					{
					// Add a new path to the watch list
					case Command::AddPath:
						{
							HANDLE directory = ::CreateFile(iter->Path.c_str(), FILE_LIST_DIRECTORY, FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE, NULL, OPEN_EXISTING, FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OVERLAPPED, NULL);
							if(directory == INVALID_HANDLE_VALUE)
								break;

							WatchedPaths.push_back(WatchedPath());
							WatchedPath& wp = WatchedPaths.back();
							wp.Path = iter->Path;
							wp.Callback = iter->Callback;
							wp.Buffer.resize(10000);		// Arbitrary, but needs to be large in case of high activity
							wp.Overlapped.hEvent = &wp;
							wp.Directory = directory;

							if(!::ReadDirectoryChangesW(directory, &wp.Buffer[0], static_cast<DWORD>(wp.Buffer.size()), TRUE, NotificationFilter, NULL, &wp.Overlapped, FileWatchCompletionRoutine))
								WatchedPaths.pop_back();
						}
						break;

					// Shut down the entire file monitoring system and exit the thread
					case Command::Shutdown:
						for(std::list<WatchedPath>::const_iterator iter = WatchedPaths.begin(); iter != WatchedPaths.end(); ++iter)
							::CloseHandle(iter->Directory);

						::CloseHandle(WakeEvent);
						WakeEvent = INVALID_HANDLE_VALUE;
						running = false;
						break;
					}
				}

				// We've processed everything, so clear the command queue
				Commands.clear();
			}
		}

		return 0;
	}

}

