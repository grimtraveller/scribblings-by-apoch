//
// FileWatch filesystem monitoring utility
// By Mike Lewis, June 2011
// http://scribblings-by-apoch.googlecode.com/
//
// Export declarations for sharing FileWatch API with external clients
//

#pragma once


// For easy use from C++ clients
#ifdef FILEWATCH_EXPORTS
#define FILEWATCH_API __declspec(dllexport)
#else
#define FILEWATCH_API __declspec(dllimport)
#endif


//
// Types of reported file activity
//
enum ActivityType
{
	Activity_Unknown = 0,
	Activity_StartWatch = 1,
	Activity_EndWatch = 2,
	Activity_Create = 3,
	Activity_Delete = 4,
	Activity_Change = 5,
	Activity_NameFrom = 6,
	Activity_NameTo = 7,
};


//
// Handy type shortcut for callbacks
//
typedef void (__stdcall *FileWatchCallback)(ActivityType activity, LPCTSTR filename);


//
// Exported functions
//
extern "C"
{
	FILEWATCH_API void Initialize();
	FILEWATCH_API void Shutdown();

	FILEWATCH_API void WatchPath(LPCTSTR path, FileWatchCallback callback);
}

