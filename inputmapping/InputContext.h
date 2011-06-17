//
// Input Mapping Demo
// By Mike Lewis, June 2011
// http://scribblings-by-apoch.googlecode.com/
//
// Wrapper class for managing input contexts
//

#pragma once


// Dependencies
#include "RawInputConstants.h"
#include "InputConstants.h"
#include "RangeConverter.h"
#include <map>


namespace InputMapping
{

	class InputContext
	{
	// Construction and destruction
	public:
		explicit InputContext(const std::wstring& contextfilename);
		~InputContext();

	// Mapping interface
	public:
		bool MapButtonToAction(RawInputButton button, Action& out) const;
		bool MapButtonToState(RawInputButton button, State& out) const;
		bool MapAxisToRange(RawInputAxis axis, Range& out) const;

		double GetSensitivity(Range range) const;
		
		const RangeConverter& GetConversions() const
		{ return *Conversions; }

	// Internal tracking
	private:
		std::map<RawInputButton, Action> ActionMap;
		std::map<RawInputButton, State> StateMap;
		std::map<RawInputAxis, Range> RangeMap;

		std::map<Range, double> SensitivityMap;
		RangeConverter* Conversions;
	};

}

