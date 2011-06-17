Input Mapping Demo
By Mike Lewis, June 2011
http://scribblings-by-apoch.googlecode.com/


This is a simple demonstration of an input mapping framework for games (or
other suitable applications) as described in the article at GameDev.Net:

http://www.gamedev.net/blog/355/entry-2250186-designing-a-robust-input-handling-system-for-games/


All code is original, and provided by Mike Lewis free of charge, under the
New BSD license (see accompanying License.txt for details).


If you have trouble compiling this demo, ensure you have a C++98 compliant
compiler and the appropriate Win32 SDK installed. Currently, the demo only
targets Windows, specifically in a 32-bit build. A Visual Studio 2005 file
for the project/solution is provided, but other compilers can be supported
easily enough. Unicode is assumed.

If you have trouble running this program, make sure you set up the working
path to the Build folder, so that the app can find its data files.


The file formats bear a little bit of description, although they should be
easy enough to figure out from the code.

ContextList.txt stores a listing of all contexts valid in the program. For
simplicity, it consists of a number of contexts, followed by a sequence of
context declarations, one per context. Each declaration is simply the name
of the context, followed by a space, followed by the file name of the data
file holding the context information. Spaces are not permitted in the file
names.

To make things easy, we store both the mapping configuration and the lists
of applicable actions/states/ranges within a single context file. For most
situations, we would actually want to separate these two, so that we don't
have to blend non-changing data (which inputs are valid in which contexts)
with changing data (how the user wants to map raw inputs to final inputs).

A context file consists of several sections. The first section specifies a
number of ranges, followed by an entry for each one. Each entry is made up
of a pair of values: a raw axis ID, and a range ID. This controls not only
which axes are usable in the context, but what ranges they map to.

The second section is similar, except mapping buttons to states. Next, the
third section maps buttons to actions. After this is a list of converters,
which specify the minimum and maximum input values and output values for a
range, in that order; each converter is prefixed with a range ID. Finally,
the last section lists a range ID and its corresponding sensitivity value.

Note that all range-related values (converters and sensitivities) are read
as double-precision floating-point numbers. All other values are integers.


Some improvements which might be nice:

 - Use pretty names instead of numbers for range/action/state IDs
 - Use pretty names for raw input axes/buttons
 - Switch from plain text to XML for more self-documenting data
 - Separate static data from configurable data
 - Provide a remapping UI for demonstration purposes
 - Generally polish up/improve the existing UI
 - Allow support for other platforms, probably by rewriting the UI

