@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "INSTALL_DIR=%~1"
if "%INSTALL_DIR%"=="" (
  for %%I in ("%SCRIPT_DIR%..\..") do set "INSTALL_DIR=%%~fI"
)

set "POWER_SHELL=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
set "LOG_DIR=%ProgramData%\MardelTech\SistemaTickets\installer"
set "LOG_FILE=%LOG_DIR%\server-repair-cmd.log"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo [%date% %time%] Reparacion servidor MardelTech > "%LOG_FILE%"
echo INSTALL_DIR=%INSTALL_DIR%>> "%LOG_FILE%"

echo Preparando base de datos...
call "%SCRIPT_DIR%setup-database.cmd" "%INSTALL_DIR%" >> "%LOG_FILE%" 2>&1
if errorlevel 1 goto :fail

echo Registrando inicio automatico...
call "%SCRIPT_DIR%register-startup-tasks.cmd" "%INSTALL_DIR%" >> "%LOG_FILE%" 2>&1
if errorlevel 1 goto :fail

echo Iniciando PostgreSQL...
set "SISTEMA_TICKETS_INSTALL_DIR=%INSTALL_DIR%"
"%POWER_SHELL%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "%SCRIPT_DIR%start-postgresql.ps1" >> "%LOG_FILE%" 2>&1
if errorlevel 1 goto :fail

echo Iniciando gateway...
"%POWER_SHELL%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "%SCRIPT_DIR%start-gateway.ps1" >> "%LOG_FILE%" 2>&1
if errorlevel 1 goto :fail

echo Verificando health...
"%POWER_SHELL%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(60); $ok=$false; while((Get-Date) -lt $deadline){ try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000/health' -TimeoutSec 5; if($r.Content -match 'ok'){ $ok=$true; break } } catch {} ; Start-Sleep -Seconds 2 }; if(-not $ok){ exit 1 }" >> "%LOG_FILE%" 2>&1
if errorlevel 1 goto :fail

echo Servidor reparado correctamente.
echo Log: %LOG_FILE%
exit /b 0

:fail
echo No se pudo reparar el servidor. Revise el log:
echo %LOG_FILE%
echo [%date% %time%] Error reparacion servidor.>> "%LOG_FILE%"
exit /b 1
