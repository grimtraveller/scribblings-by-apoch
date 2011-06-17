//
// Input Mapping Demo
// By Mike Lewis, June 2011
// http://scribblings-by-apoch.googlecode.com/
//
// Helper functions for file I/O
//

#pragma once

// Dependencies
#include <istream>


//
// Helper for attempting to read from a file (or other istream-compatible interface)
//
template <typename OutType>
OutType AttemptRead(std::wistream& stream)
{
	OutType out;
	if(!(stream >> out))
		throw std::exception("Failed to read a required value");

	return out;
}
