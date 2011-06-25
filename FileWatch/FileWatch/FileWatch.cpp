//
// FileWatch filesystem monitoring utility
// By Mike Lewis, June 2011
// http://scribblings-by-apoch.googlecode.com/
//
// Exported routines for using the FileWatch API as a C-compatible DLL
//

#include "Pch.h"
#include "FileWatch.h"
#include "FileWatchImpl.h"


using namespace FileWatchImpl;


//
// Initialize the thread for file monitoring
//
// Only needs to be called once, but subsequent duplicate calls have no effect,
// so it is technically safe to call repeatedly (at the cost of entering the safety
// critical section for each call, which may slow down the file monitor thread if
// there's a lot of file activity going on). Should be paired with a call to the
// Shutdown() function to ensure everything gets cleaned up.
//
extern "C" FILEWATCH_API void Initialize()
{
	Threads::CriticalSection::Auto lock(CommandCritSec);

	if(WakeEvent == INVALID_HANDLE_VALUE)
	{
		WakeEvent = ::CreateEvent(NULL, FALSE, FALSE, NULL);
		::CreateThread(NULL, 0, FileWatcherThreadProc, NULL, 0, NULL);
	}
}

//
// Shut down and clean up the file monitor
//
// It is important that this be done, or the thread will remain idle and potentially
// lock system resources (including monitored files!) after the program exits. To be
// safe, always call Shutdown() prior to exiting your client program. Note that this
// will force the monitor to stop regardless of how many times Initialize() has been
// called previously.
//
extern "C" FILEWATCH_API void Shutdown()
{
	Threads::CriticalSection::Auto lock(CommandCritSec);

	if(WakeEvent != INVALID_HANDLE_VALUE)
	{
		Commands.push_back(Command(Command::Shutdown));
		::SetEvent(WakeEvent);
	}
}


//
// Add a path to watch to the watchlist, dispatching activity notifications to the given callback
// 
extern "C" FILEWATCH_API void WatchPath(LPCTSTR path, FileWatchCallback callback)
{
	callback(Activity_StartWatch, path);

	{
		Threads::CriticalSection::Auto lock(CommandCritSec);
		Commands.push_back(Command(Command::AddPath, path, callback));
	}

	::SetEvent(WakeEvent);
}

