//
// Input Mapping Demo
// By Mike Lewis, June 2011
// http://scribblings-by-apoch.googlecode.com/
//
// Wrapper class for managing input contexts
//

#include "pch.h"
#include "InputContext.h"

#include "FileIO.h"

#include <fstream>


using namespace InputMapping;


//
// Construct and initialize an input context given data in a file
//
InputContext::InputContext(const std::wstring& contextfilename)
	: Conversions(NULL)
{
	std::wifstream infile(contextfilename.c_str());

	unsigned rangecount = AttemptRead<unsigned>(infile);
	for(unsigned i = 0; i < rangecount; ++i)
	{
		RawInputAxis axis = static_cast<RawInputAxis>(AttemptRead<unsigned>(infile));
		Range range = static_cast<Range>(AttemptRead<unsigned>(infile));
		RangeMap[axis] = range;
	}

	unsigned statecount = AttemptRead<unsigned>(infile);
	for(unsigned i = 0; i < statecount; ++i)
	{
		RawInputButton button = static_cast<RawInputButton>(AttemptRead<unsigned>(infile));
		State state = static_cast<State>(AttemptRead<unsigned>(infile));
		StateMap[button] = state;
	}

	unsigned actioncount = AttemptRead<unsigned>(infile);
	for(unsigned i = 0; i < actioncount; ++i)
	{
		RawInputButton button = static_cast<RawInputButton>(AttemptRead<unsigned>(infile));
		Action action = static_cast<Action>(AttemptRead<unsigned>(infile));
		ActionMap[button] = action;
	}

	Conversions = new RangeConverter(infile);

	unsigned sensitivitycount = AttemptRead<unsigned>(infile);
	for(unsigned i = 0; i < sensitivitycount; ++i)
	{
		Range range = static_cast<Range>(AttemptRead<unsigned>(infile));
		double sensitivity = AttemptRead<double>(infile);
		SensitivityMap[range] = sensitivity;
	}
}

//
// Destruct and clean up an input context
//
InputContext::~InputContext()
{
	delete Conversions;
}


//
// Attempt to map a raw button to an action
//
bool InputContext::MapButtonToAction(RawInputButton button, Action& out) const
{
	std::map<RawInputButton, Action>::const_iterator iter = ActionMap.find(button);
	if(iter == ActionMap.end())
		return false;

	out = iter->second;
	return true;
}

//
// Attempt to map a raw button to a state
//
bool InputContext::MapButtonToState(RawInputButton button, State& out) const
{
	std::map<RawInputButton, State>::const_iterator iter = StateMap.find(button);
	if(iter == StateMap.end())
		return false;

	out = iter->second;
	return true;
}

//
// Attempt to map a raw axis to a range
//
bool InputContext::MapAxisToRange(RawInputAxis axis, Range& out) const
{
	std::map<RawInputAxis, Range>::const_iterator iter = RangeMap.find(axis);
	if(iter == RangeMap.end())
		return false;

	out = iter->second;
	return true;
}


//
// Retrieve the sensitivity associated with a given range
//
double InputContext::GetSensitivity(Range range) const
{
	std::map<Range, double>::const_iterator iter = SensitivityMap.find(range);
	if(iter == SensitivityMap.end())
		return 1.0;

	return iter->second;
}

