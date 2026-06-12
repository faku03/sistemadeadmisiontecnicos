@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "INSTALL_DIR=%~1"
if "%INSTALL_DIR%"=="" (
  for %%I in ("%SCRIPT_DIR%..\..") do set "INSTALL_DIR=%%~fI"
)
set "POWER_SHELL=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
set "LOG_DIR=%ProgramData%\MardelTech\SistemaTickets\installer"
set "LOG_FILE=%LOG_DIR%\server-bootstrap-cmd.log"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo [%date% %time%] Inicio bootstrap cmd > "%LOG_FILE%"

echo [%date% %time%] Registrando ServerTickets en inicio de Windows...>> "%LOG_FILE%"
call "%SCRIPT_DIR%register-startup-tasks.cmd" "%INSTALL_DIR%" >> "%LOG_FILE%" 2>&1
if errorlevel 1 echo [%date% %time%] Advertencia: no se pudo registrar ServerTickets en este equipo.>> "%LOG_FILE%"

echo [%date% %time%] Instalando y configurando PostgreSQL...>> "%LOG_FILE%"
call "%SCRIPT_DIR%setup-database.cmd" "%INSTALL_DIR%" >> "%LOG_FILE%" 2>&1
if errorlevel 1 goto :fail

echo [%date% %time%] Solicitando arranque de ServerTickets...>> "%LOG_FILE%"
call "%SCRIPT_DIR%register-startup-tasks.cmd" "%INSTALL_DIR%" >> "%LOG_FILE%" 2>&1
if errorlevel 1 echo [%date% %time%] Advertencia: no se pudo relanzar ServerTickets en este equipo.>> "%LOG_FILE%"

echo [%date% %time%] Esperando respuesta de health...>> "%LOG_FILE%"
"%POWER_SHELL%" -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command ^
  "$deadline=(Get-Date).AddSeconds(60); $ok=$false; while((Get-Date) -lt $deadline){ try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000/health' -TimeoutSec 5; if($r.Content -match 'ok'){ $ok=$true; break } } catch {} ; Start-Sleep -Seconds 2 }; if(-not $ok){ exit 1 }" >> "%LOG_FILE%" 2>&1
if errorlevel 1 goto :fail

goto :success

:fail
echo [%date% %time%] Error bootstrap cmd.>> "%LOG_FILE%"
exit /b 1

:success
echo [%date% %time%] Bootstrap cmd finalizado correctamente.>> "%LOG_FILE%"
exit /b 0
