' 登录后以隐藏窗口方式启动风水网站服务
' 如果网站打不开，先检查下面的 node.exe 路径是否仍然存在
Option Explicit

Dim shell, nodePath, scriptPath
Set shell = CreateObject("WScript.Shell")

nodePath = "C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
scriptPath = "D:\fengshui\server.js"

shell.CurrentDirectory = "D:\fengshui"
shell.Run Chr(34) & nodePath & Chr(34) & " " & Chr(34) & scriptPath & Chr(34), 0, False
