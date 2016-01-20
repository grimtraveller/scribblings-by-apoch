# PowerShell #
I'm a big fan of Windows PowerShell in general. It's a terrific extension of the idea of chaining together lots of tiny, simple utilities into one complex and powerful command line system. If you're not familiar with it, just picture a Unix-style pipe-heavy environment with .NET objects on the pipeline instead of plain text.

This is the kind of thing that will elicit precisely one of three responses:

  * What's a eunuch-pipe have to do with anything?
  * Get your damn objects away from my plain-text pipeline, you philistine!

Or, in my case:

  * Sweeeeeet.


# Scribblings #
From time to time I'll share some PowerShell goodies here on the Scribblings repository. You can see all of the stuff I've posted in the PowerShell category by [browsing the Mercurial repo for the site](http://code.google.com/p/scribblings-by-apoch/source/browse/#hg%2FPowershell).

If you want to play with one of these modules, and aren't sure about PowerShell, here's some step-by-step instructions for getting started:

  1. Download the appropriate `.PSM1` file into a convenient path. I keep all my modules in `My Documents/WindowsPowerShell/FooModule/FooModule.psm1` just to keep things simple, since PowerShell can automatically find modules that are thusly placed.
  1. Start up a PowerShell instance; it comes on recent versions of Windows, so you can just do a Start-menu search for it and it should pop right up.
  1. Type `Import-Module C:\Path\To\FooModule`
  1. You can get detailed help on the commands involved by typing `Get-Help FooCommand` at this point

If anything turns red and yells at you, well... number one, I'm sorry for the terrible instructions; and number two, Google is now your best friend.


Happy shelling!