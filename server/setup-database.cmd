@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "INSTALL_DIR=%~1"
if "%INSTALL_DIR%"=="" for %%I in ("%SCRIPT_DIR%..\..") do set "INSTALL_DIR=%%~fI"

set "POWER_SHELL=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
set "PS_SCRIPT=%SCRIPT_DIR%install-postgresql-unattended.ps1"

if not exist "%PS_SCRIPT%" (
  echo No se encontro %PS_SCRIPT%
  exit /b 1
)

"%POWER_SHELL%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "%PS_SCRIPT%" -InstallDir "%INSTALL_DIR%"
exit /b %errorlevel%
