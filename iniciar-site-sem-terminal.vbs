Option Explicit
Dim shell, files, folder, request
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
folder = files.GetParentFolderName(WScript.ScriptFullName)

' Se o site já estiver respondendo, não inicia outra cópia.
On Error Resume Next
Set request = CreateObject("MSXML2.ServerXMLHTTP.6.0")
request.setTimeouts 500, 500, 500, 500
request.Open "GET", "http://localhost:3100/api/config", False
request.Send
If Err.Number = 0 Then
  If request.Status = 200 Then WScript.Quit 0
End If
Err.Clear
On Error GoTo 0

shell.Run "cmd.exe /c cd /d """ & folder & """ && node server.js", 0, False
