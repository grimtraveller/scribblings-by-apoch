<# 
 .Synopsis
  Provides simple line-of-code statistics.

 .Description
  Counts up the number of lines of code in files contained in a given directory structure.

 .Parameter Path
  The path at which to begin searching for code.

 .Parameter Filter
  File wildcard filter specifying what files and extensions to examine; can be an array.


 .Example
   # Retrieve LOC stats for the current path
   Show-LOC

 .Example
   # Retrieve C-language LOC stats for C:\Foo\CProgram
   Show-LOC -Path "C:\Foo\CProgram" -Filter ("*.c", "*.h")
#>
function Show-LOC
{
    param
    (
        [String] $path = ".",
        [String[]] $filter = ("*.cpp", "*.h", "*.inl")
    )

    $files = Get-ChildItem -re -in $filter $path
    $results = @()
    $totallines = 0
    $i = 0
    
    ForEach($file in $files)
    {
        $stats = Get-Content $file.FullName | Measure-Object -line
        [int] $linecount = $stats.Lines
        $totallines += $linecount
        $statinfo = New-Object System.Object
        $statinfo | Add-Member -type NoteProperty -name Lines -value $linecount
        $statinfo | Add-Member -type NoteProperty -name File -value $file.FullName
        $results += $statinfo
        
        Write-Progress -activity "Counting lines of code..." -status $file.FullName -PercentComplete (($i / $files.Count)  * 100)
        $i++
    }
    
    $results | Sort-Object Lines -descending | Format-Table -AutoSize
    
    Write-Host "Totals"
    Write-Host "------"
    Write-Host ("Lines: " + $totallines)
    Write-Host ("Files: " + $files.Count)
}


#
# Module exports
#
Export-ModuleMember -function Show-LOC

