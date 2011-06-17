
// Input Mapping Demo
// By Mike Lewis, June 2011
// http://scribblings-by-apoch.googlecode.com/
//
// Entry point for the demo program
//

#include "pch.h"

// Quick sanity check; we don't support non-Windows builds at this point.
#ifndef WIN32

#error No entry point is defined for this platform/build environment. This demo is only intended to execute on Windows.

#else


//
// Additional headers
//
#include "Resource.h"
#include "InputMapper.h"

#include <sstream>


//
// Constants
//

#define MAX_STRING_LENGTH 100
#define TIMER_REDRAW 1000
#define TIMER_SCROLL 1001


//
// Input mapper object (evil global!)
//

InputMapping::InputMapper Mapper;


//
// Output log (more evil globals!)
//

std::wstring LogLine1;
std::wstring LogLine2;
std::wstring LogLine3;
std::wstring LogLine4 = L"Press some number keys";


//
// Some state tracking (oh teh noes the globals are taking over!)
//

double AxisX = 0;
double AxisY = 0;

int LastX = 0;
int LastY = 0;

bool StateOne = false;
bool StateTwo = false;
bool StateThree = false;


//
// Forward declarations
//
bool RegisterDemoWndClass(const wchar_t windowclassname[], HINSTANCE hInstance);
LRESULT CALLBACK WndProc(HWND hWnd, UINT msg, WPARAM wparam, LPARAM lparam);
INT_PTR CALLBACK About(HWND hWnd, UINT msg, WPARAM wparam, LPARAM lparam);
void InputCallback(InputMapping::MappedInput& inputs);


//
// Entry point function
//
int APIENTRY wWinMain(HINSTANCE hInstance, HINSTANCE, LPTSTR, int showflag)
{
	// Load strings
	wchar_t windowclassname[128];
	wchar_t windowtitle[128];

	::LoadString(hInstance, IDC_INPUTMAPPING, windowclassname, sizeof(windowclassname) / sizeof(wchar_t));
	::LoadString(hInstance, IDS_APP_TITLE, windowtitle, sizeof(windowtitle) / sizeof(wchar_t));


	// Create main window
	if(!RegisterDemoWndClass(windowclassname, hInstance))
		return 0;

	HWND hWnd = ::CreateWindow(windowclassname, windowtitle, WS_OVERLAPPEDWINDOW, CW_USEDEFAULT, 0, CW_USEDEFAULT, 0, NULL, NULL, hInstance, NULL);
	if (!hWnd)
		return FALSE;

	::ShowWindow(hWnd, showflag);
	::UpdateWindow(hWnd);

	::SetTimer(hWnd, TIMER_REDRAW, 50, NULL);
	::SetTimer(hWnd, TIMER_SCROLL, 1000, NULL);


	// Load accelerators (hotkeys)
	HACCEL accelerators = ::LoadAccelerators(hInstance, MAKEINTRESOURCE(IDC_INPUTMAPPING));


	// Configure input
	Mapper.PushContext(L"maincontext");
	Mapper.AddCallback(InputCallback, 0);

	
	// Message pump
	MSG msg;
	while(::GetMessage(&msg, NULL, 0, 0))
	{
		if(!::TranslateAccelerator(msg.hwnd, accelerators, &msg))
		{
			::TranslateMessage(&msg);
			::DispatchMessage(&msg);
		}
	}

	return 0;
}

//
// Register the window class used for the application's main window
//
bool RegisterDemoWndClass(const wchar_t windowclassname[], HINSTANCE hInstance)
{
	WNDCLASSEX wndclass;
	wndclass.cbSize = sizeof(WNDCLASSEX);
	wndclass.style = CS_HREDRAW | CS_VREDRAW;
	wndclass.lpfnWndProc = WndProc;
	wndclass.cbClsExtra = 0;
	wndclass.cbWndExtra = 0;
	wndclass.hInstance = hInstance;
	wndclass.hIcon = ::LoadIcon(hInstance, MAKEINTRESOURCE(IDI_INPUTMAPPING));
	wndclass.hCursor = ::LoadCursor(NULL, IDC_ARROW);
	wndclass.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
	wndclass.lpszMenuName = MAKEINTRESOURCE(IDC_INPUTMAPPING);
	wndclass.lpszClassName = windowclassname;
	wndclass.hIconSm = ::LoadIcon(hInstance, MAKEINTRESOURCE(IDI_SMALL));

	return (::RegisterClassEx(&wndclass) != 0);
}


namespace
{
	//
	// Helper for converting VK codes into raw input button codes
	//
	bool ConvertWParamToRawButton(WPARAM wparam, InputMapping::RawInputButton& button)
	{
		switch(wparam)
		{
		case 0x30:		button = InputMapping::RAW_INPUT_BUTTON_ZERO;	break;
		case 0x31:		button = InputMapping::RAW_INPUT_BUTTON_ONE;	break;
		case 0x32:		button = InputMapping::RAW_INPUT_BUTTON_TWO;	break;
		case 0x33:		button = InputMapping::RAW_INPUT_BUTTON_THREE;	break;
		case 0x34:		button = InputMapping::RAW_INPUT_BUTTON_FOUR;	break;
		case 0x35:		button = InputMapping::RAW_INPUT_BUTTON_FIVE;	break;
		case 0x36:		button = InputMapping::RAW_INPUT_BUTTON_SIX;	break;
		case 0x37:		button = InputMapping::RAW_INPUT_BUTTON_SEVEN;	break;
		case 0x38:		button = InputMapping::RAW_INPUT_BUTTON_EIGHT;	break;
		case 0x39:		button = InputMapping::RAW_INPUT_BUTTON_NINE;	break;
		default:		return false;									break;
		}

		return true;
	}

	//
	// Internal helper for appending to the scrolling log lines
	//
	void PushLogLine(const wchar_t* line)
	{
		LogLine1 = LogLine2;
		LogLine2 = LogLine3;
		LogLine3 = LogLine4;
		LogLine4 = line;
	}
}


//
// Window procedure for the main window
//
LRESULT CALLBACK WndProc(HWND hWnd, UINT msg, WPARAM wparam, LPARAM lparam)
{
	switch(msg)
	{
	case WM_COMMAND:
		{
			switch(LOWORD(wparam))
			{
			case IDM_ABOUT:
				::DialogBox(::GetModuleHandle(NULL), MAKEINTRESOURCE(IDD_ABOUTBOX), hWnd, About);
				break;

			case IDM_EXIT:
				::DestroyWindow(hWnd);
				break;
			}
		}
		break;

	case WM_PAINT:
		{
			Mapper.Dispatch();
			Mapper.Clear();

			PAINTSTRUCT ps;
			HDC hdc = ::BeginPaint(hWnd, &ps);

			std::wostringstream display;
			display << L"Timer: " << ::GetTickCount() << L"\n\nAxis X: ";
			display << AxisX;
			display << L"    Axis Y: ";
			display << AxisY;
			display << L"\nState 1: " << (StateOne ? L"Y" : L"N") << "    ";
			display << L"State 2: " << (StateTwo ? L"Y" : L"N") << "    ";
			display << L"State 3: " << (StateThree ? L"Y" : L"N") << "\n";
			display << L"\n\n\n" << LogLine1 << L"\n";
			display << LogLine2 << L"\n";
			display << LogLine3 << L"\n";
			display << LogLine4 << L"\n";

			RECT rect;
			::GetClientRect(hWnd, &rect);
			::DrawText(hdc, display.str().c_str(), -1, &rect, 0);

			::EndPaint(hWnd, &ps);
		}
		return 0;

	case WM_DESTROY:
		PostQuitMessage(0);
		return 0;

	case WM_TIMER:
		if(wparam == TIMER_REDRAW)
		{
			::InvalidateRect(hWnd, NULL, TRUE);
			::SetTimer(hWnd, TIMER_REDRAW, 50, NULL);
		}
		else if(wparam == TIMER_SCROLL)
		{
			PushLogLine(L"");
			::SetTimer(hWnd, TIMER_SCROLL, 1000, NULL);
		}
		return 0;

	case WM_MOUSEMOVE:
		{
			int x = LOWORD(lparam);
			int y = HIWORD(lparam);

			Mapper.SetRawAxisValue(InputMapping::RAW_INPUT_AXIS_MOUSE_X, static_cast<double>(x - LastX));
			Mapper.SetRawAxisValue(InputMapping::RAW_INPUT_AXIS_MOUSE_Y, static_cast<double>(y - LastY));

			LastX = x;
			LastY = y;
		}
		break;

	case WM_KEYDOWN:
		{
			InputMapping::RawInputButton button;
			bool previouslydown = ((lparam & (1 << 31)) != 0);

			if(ConvertWParamToRawButton(wparam, button))
				Mapper.SetRawButtonState(button, true, previouslydown);
		}
		break;

	case WM_KEYUP:
		{
			InputMapping::RawInputButton button;
			if(ConvertWParamToRawButton(wparam, button))
				Mapper.SetRawButtonState(button, false, true);
		}
		break;
	}

	return ::DefWindowProc(hWnd, msg, wparam, lparam);
}


//
// Dialog procedure for the about box
//
INT_PTR CALLBACK About(HWND hDlg, UINT msg, WPARAM wparam, LPARAM)
{
	switch(msg)
	{
	case WM_INITDIALOG:
		return static_cast<INT_PTR>(true);

	case WM_COMMAND:
		if(LOWORD(wparam) == IDOK || LOWORD(wparam) == IDCANCEL)
		{
			::EndDialog(hDlg, LOWORD(wparam));
			return static_cast<INT_PTR>(true);
		}
		break;
	}

	return static_cast<INT_PTR>(false);
}


//
// Callback for handling input
//
void InputCallback(InputMapping::MappedInput& inputs)
{
	AxisX = inputs.Ranges[InputMapping::RANGE_ONE];
	AxisY = inputs.Ranges[InputMapping::RANGE_TWO];

	StateOne = inputs.States.find(InputMapping::STATE_ONE) != inputs.States.end();
	StateTwo = inputs.States.find(InputMapping::STATE_TWO) != inputs.States.end();
	StateThree = inputs.States.find(InputMapping::STATE_THREE) != inputs.States.end();

	if(inputs.Actions.find(InputMapping::ACTION_ONE) != inputs.Actions.end())
		PushLogLine(L"Action 1 fired!");

	if(inputs.Actions.find(InputMapping::ACTION_TWO) != inputs.Actions.end())
		PushLogLine(L"Action 2 fired!");

	if(inputs.Actions.find(InputMapping::ACTION_THREE) != inputs.Actions.end())
		PushLogLine(L"Action 3 fired!");

	if(inputs.Actions.find(InputMapping::ACTION_FOUR) != inputs.Actions.end())
		PushLogLine(L"Action 4 fired!");

	if(inputs.Actions.find(InputMapping::ACTION_FIVE) != inputs.Actions.end())
		PushLogLine(L"Action 5 fired!");

	if(inputs.Actions.find(InputMapping::ACTION_SIX) != inputs.Actions.end())
		PushLogLine(L"Action 6 fired!");

	if(inputs.Actions.find(InputMapping::ACTION_SEVEN) != inputs.Actions.end())
		PushLogLine(L"Action 7 fired!");
}

#endif

