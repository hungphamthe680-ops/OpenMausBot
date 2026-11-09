@echo off
setlocal
set "AGENT_DIR=%~dp0"
if not exist "%AGENT_DIR%.venv\Scripts\python.exe" (
  echo Chua cai Office Agent. Hay chay setup.ps1 truoc.
  exit /b 1
)
"%AGENT_DIR%.venv\Scripts\python.exe" "%AGENT_DIR%server.py"
