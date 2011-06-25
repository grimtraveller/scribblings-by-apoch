//
// FileWatch filesystem monitoring utility
// By Mike Lewis, June 2011
// http://scribblings-by-apoch.googlecode.com/
//
// Precompiled header stub file
//

#pragma once


// Windows platform specific headers
#ifdef WIN32

#ifndef WINVER
#define WINVER 0x0501		// XP or later
#endif

#ifndef _WIN32_WINNT
#define _WIN32_WINNT 0x0501	// XP or later
#endif						

#define WIN32_LEAN_AND_MEAN
#include <windows.h>

#else

#error Platform not supported; Win32 only!

#endif
