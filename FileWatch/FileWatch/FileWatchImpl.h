//
// FileWatch filesystem monitoring utility
// By Mike Lewis, June 2011
// http://scribblings-by-apoch.googlecode.com/
//
// Internal implementation details of the file monitor routines
//

#pragma once


// Dependencies
#include <list>

#include "CriticalSection.h"



namespace FileWatchImpl
{

	//
	// Record describing a command to the file watcher subsystem
	//
	struct Command
	{
		enum CommandEnum
		{
			AddPath,
			Shutdown,
		};

		explicit Command(CommandEnum command)
			: WhichCommand(command),
			  Callback(NULL)
		{
		}

		Command(CommandEnum command, const std::wstring& path, FileWatchCallback callback)
			: WhichCommand(command),
			  Path(path),
			  Callback(callback)
		{
		}

		CommandEnum WhichCommand;
		std::wstring Path;
		FileWatchCallback Callback;
	};

	//
	// Externally accessible variables
	//
	extern std::list<Command> Commands;
	extern Threads::CriticalSection CommandCritSec;
	extern HANDLE WakeEvent;


	// Thread procedure for spinning up the monitor thread
	DWORD WINAPI FileWatcherThreadProc(void*);

}