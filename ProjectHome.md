# Scribblings by Apoch #
This is my public scratch pad for various thoughts, ideas, tools, utilities, code samples, and other random accumulated goodies.

All of my code is provided free of charge and free for any usage via the New BSD License. Each project contains an accompanying `License.txt` which sets forth the terms of the license in legalese, so you can show your lawyers if you really want to.


---


## What's Here? ##
Over time, I'll continually post stuff here that I find handy or cool, or that I want to use for demonstrative purposes. A lot of it comes directly from my musings over at [GameDev.Net](http://www.gamedev.net/), where I actively participate in and moderate the discussion forums. Some of it is the result of research I've done on the [Epoch programming language](http://epoch-language.googlecode.com/). And a little bit more is cruft culled from my experiences working for various companies, currently [ArenaNet](http://www.arena.net/).


---


## What's New? ##
The latest and greatest Scribblings!

  * **2012-04-09 - Source LOC counter in PowerShell** For all you PowerShell addicts who want to know how many lines of code you're writing, check out [this new scribbling](http://code.google.com/p/scribblings-by-apoch/source/browse/Powershell/ShowLOC.psm1)! Demonstrates some PowerShell functionality and offers a handy LOC counter to boot.

  * **2011-07-23 - Blazing Fast AST Generation with Boost::Spirit** Release 12 of [the Epoch Programming Language](http://epoch-language.googlecode.com/) includes a vastly optimized compiler. [See how I made the parsing process over 1000 times faster](http://code.google.com/p/scribblings-by-apoch/wiki/OptimizingBoostSpirit) - yes, you read that right!

  * **2011-06-27 - C++ Template Metaprogramming** Ever wished you could safely disable code if a certain type conversion was not possible? Now you can, thanks to the miry evil of C++ and template metaprogramming. Check out [the Wiki article](http://code.google.com/p/scribblings-by-apoch/wiki/MetaProgrammingEnableIfConvertible) for details!

  * **2011-06-25 - FileWatch Utility** Experiments in file system monitoring utilities for Windows led to the creation of this tiny little demo. Consists of two parts: a C++ DLL for actually monitoring your Windows file system for changes, and a C# GUI app that uses the DLL to display a realtime list of the goings-on within your hard drive. [Download](http://code.google.com/p/scribblings-by-apoch/downloads/detail?name=FileWatch%20Version%201.zip&can=2&q=) the utility (includes source and 32-bit Windows binaries) or [browse](http://code.google.com/p/scribblings-by-apoch/source/browse/#hg%2FFileWatch) the repository.

  * **2011-06-17 - Input Mapping Demo** Based on the design set forth in [this GDNet article](http://www.gamedev.net/blog/355/entry-2250186-designing-a-robust-input-handling-system-for-games/), I've implemented a simple demonstration of how to do input mapping for games (or other suitable programs). This is a full end-to-end solution that takes raw Win32 input and converts it to high-level, abstract forms similar to what one would expect in a game implementation. Note that for simplicity's sake it takes some shortcuts; these are documented in the accompanying `ReadMe.txt`. [Download](http://code.google.com/p/scribblings-by-apoch/downloads/detail?name=Input%20Mapping%20Demo%20Version%201.zip&can=2&q=) the demo (includes source and a compiled 32-bit Windows binary) or [browse](http://code.google.com/p/scribblings-by-apoch/source/browse/#hg%2Finputmapping) the repository.


---


## Who's Apoch? ##
My real name is Mike Lewis, although I go by Apoch for slightly humorous reasons long lost to the mists of time. I'm a full-time programmer for [ArenaNet](http://www.arena.net/), currently focused on server implementation for [Guild Wars 2](http://www.guildwars2.com/en/). You can find out more at my [LinkedIn profile page](http://www.linkedin.com/profile/view?id=43834215&trk=tab_pro)... although unless you're deeply into cyber-stalking, there's not much to learn.