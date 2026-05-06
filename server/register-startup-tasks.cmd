@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "INSTALL_DIR=%~1"
if "%INSTALL_DIR%"=="" for %%I in ("%SCRIPT_DIR%..\..") do set "INSTALL_DIR=%%~fI"

set "POWER_SHELL=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
set "PG_TASK_SCRIPT=%SCRIPT_DIR%install-postgresql-task.ps1"
set "GW_TASK_SCRIPT=%SCRIPT_DIR%install-gateway-task.ps1"

if not exist "%PG_TASK_SCRIPT%" (
  echo No se encontro %PG_TASK_SCRIPT%
  exit /b 1
)

if not exist "%GW_TASK_SCRIPT%" (
  echo No se encontro %GW_TASK_SCRIPT%
  exit /b 1
)

"%POWER_SHELL%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "%PG_TASK_SCRIPT%" -InstallDir "%INSTALL_DIR%"
if errorlevel 1 exit /b %errorlevel%

"%POWER_SHELL%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "%GW_TASK_SCRIPT%" -InstallDir "%INSTALL_DIR%"
exit /b %errorlevel%
