FileWatch File Activity Montioring Utility (DLL)
By Mike Lewis, June 2011
http://scribblings-by-apoch.googlecode.com/


This is a demonstration of monitoring a Windows file system for activities
including creation, deletion, renaming, and modification of both files and
directories.


All code is original, and provided by Mike Lewis free of charge, under the
New BSD license (see accompanying License.txt for details).


If you have trouble compiling this demo, ensure you have a C++98 compliant
compiler and the appropriate Win32 SDK installed. Currently, the demo only
targets Windows, specifically in a 32-bit build. A Visual Studio 2005 file
for the project/solution is provided, but other compilers can be supported
easily enough. Unicode is assumed.

Note that this DLL does not offer a UI or any form of usage of the monitor
APIs; for that, see the accompanying C# project FileWatchUI.


Some improvements that might be nice:

 - Add functionality to stop monitoring individual paths on demand
 - Encapsulate the file monitor API into a class for RAII semantics
 - Allow users to specify what specific types of activity to watch for


