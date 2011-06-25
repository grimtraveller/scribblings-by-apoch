//
// FileWatch filesystem monitoring utility
// By Mike Lewis, June 2011
// http://scribblings-by-apoch.googlecode.com/
//
// Implementation of critical section wrapper for thread synchronization
//
// Appropriated from the Epoch Language Project
// http://epoch-language.googlecode.com/
//

#include "Pch.h"

#include "CriticalSection.h"


using namespace Threads;


//-------------------------------------------------------------------------------
// Critical section
//-------------------------------------------------------------------------------

//
// Construct and initialize a critical section wrapper
//
CriticalSection::CriticalSection()
{
	::InitializeCriticalSection(&CritSec);
}


//
// Release the system critical section
//
CriticalSection::~CriticalSection()
{
	::DeleteCriticalSection(&CritSec);
}

//
// Enter the critical section, blocking until another thread leaves it, if necessary
//
void CriticalSection::Enter() const
{
	// This is an evil cast, but we do it anyways so that critical section holders
	// can lock safely in const member functions.
	::EnterCriticalSection(const_cast<LPCRITICAL_SECTION>(&CritSec));
}

//
// Leave the critical section, allowing other threads to utilize it
//
void CriticalSection::Exit() const
{
	// This is an evil cast, but we do it anyways so that critical section holders
	// can lock safely in const member functions.
	::LeaveCriticalSection(const_cast<LPCRITICAL_SECTION>(&CritSec));
}

