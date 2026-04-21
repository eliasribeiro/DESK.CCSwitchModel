Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
parentDir = fso.GetParentFolderName(scriptDir)
WshShell.CurrentDirectory = parentDir
WshShell.Run "npm start", 0, False
Set WshShell = Nothing
