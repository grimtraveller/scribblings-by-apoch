//
// Input Mapping Demo
// By Mike Lewis, June 2011
// http://scribblings-by-apoch.googlecode.com/
//
// Wrapper class for mapping inputs
//

#include "pch.h"

#include "InputMapper.h"
#include "InputContext.h"

#include "FileIO.h"

#include <fstream>


using namespace InputMapping;


//
// Construct and initialize an input mapper
//
InputMapper::InputMapper()
{
	unsigned count;
	std::wifstream infile(L"ContextList.txt");
	if(!(infile >> count))
		throw std::exception("Failed to read ContextList.txt");
	for(unsigned i = 0; i < count; ++i)
	{
		std::wstring name = AttemptRead<std::wstring>(infile);
		std::wstring file = AttemptRead<std::wstring>(infile);
		InputContexts[name] = new InputContext(file);
	}
}

//
// Destruct and clean up an input mapper
//
InputMapper::~InputMapper()
{
	for(std::map<std::wstring, InputContext*>::iterator iter = InputContexts.begin(); iter != InputContexts.end(); ++iter)
		delete iter->second;
}


//
// Clear all mapped input
//
void InputMapper::Clear()
{
	CurrentMappedInput.Actions.clear();
	CurrentMappedInput.Ranges.clear();
	// Note: we do NOT clear states, because they need to remain set
	// across frames so that they don't accidentally show "off" for
	// a tick or two while the raw input is still pending.
}

//
// Set the state of a raw button
//
void InputMapper::SetRawButtonState(RawInputButton button, bool pressed, bool previouslypressed)
{
	Action action;
	State state;

	if(pressed && !previouslypressed)
	{
		if(MapButtonToAction(button, action))
		{
			CurrentMappedInput.Actions.insert(action);
			return;
		}
	}

	if(pressed)
	{
		if(MapButtonToState(button, state))
		{
			CurrentMappedInput.States.insert(state);
			return;
		}
	}

	MapAndEatButton(button);
}

//
// Set the raw axis value of a given axis
//
void InputMapper::SetRawAxisValue(RawInputAxis axis, double value)
{
	for(std::list<InputContext*>::const_iterator iter = ActiveContexts.begin(); iter != ActiveContexts.end(); ++iter)
	{
		const InputContext* context = *iter;

		Range range;
		if(context->MapAxisToRange(axis, range))
		{
			CurrentMappedInput.Ranges[range] = context->GetConversions().Convert(range, value * context->GetSensitivity(range));
			break;
		}
	}
}


//
// Dispatch input to all registered callbacks
//
void InputMapper::Dispatch() const
{
	MappedInput input = CurrentMappedInput;
	for(std::multimap<int, InputCallback>::const_iterator iter = CallbackTable.begin(); iter != CallbackTable.end(); ++iter)
		(*iter->second)(input);
}

//
// Add a callback to the dispatch table
//
void InputMapper::AddCallback(InputCallback callback, int priority)
{
	CallbackTable.insert(std::make_pair(priority, callback));
}


//
// Push an active input context onto the stack
//
void InputMapper::PushContext(const std::wstring& name)
{
	std::map<std::wstring, InputContext*>::iterator iter = InputContexts.find(name);
	if(iter == InputContexts.end())
		throw std::exception("Invalid input context pushed");

	ActiveContexts.push_front(iter->second);
}

//
// Pop the current input context off the stack
//
void InputMapper::PopContext()
{
	if(ActiveContexts.empty())
		throw std::exception("Cannot pop input context, no contexts active!");

	ActiveContexts.pop_front();
}


//
// Helper: map a button to an action in the active context(s)
//
bool InputMapper::MapButtonToAction(RawInputButton button, Action& action) const
{
	for(std::list<InputContext*>::const_iterator iter = ActiveContexts.begin(); iter != ActiveContexts.end(); ++iter)
	{
		const InputContext* context = *iter;

		if(context->MapButtonToAction(button, action))
			return true;
	}

	return false;
}

//
// Helper: map a button to a state in the active context(s)
//
bool InputMapper::MapButtonToState(RawInputButton button, State& state) const
{
	for(std::list<InputContext*>::const_iterator iter = ActiveContexts.begin(); iter != ActiveContexts.end(); ++iter)
	{
		const InputContext* context = *iter;

		if(context->MapButtonToState(button, state))
			return true;
	}

	return false;
}

//
// Helper: eat all input mapped to a given button
//
void InputMapper::MapAndEatButton(RawInputButton button)
{
	Action action;
	State state;

	if(MapButtonToAction(button, action))
		CurrentMappedInput.EatAction(action);

	if(MapButtonToState(button, state))
		CurrentMappedInput.EatState(state);
}

