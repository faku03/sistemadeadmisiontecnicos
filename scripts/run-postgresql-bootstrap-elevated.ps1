param(
  [string]$InstallDir = "C:\mardeltech\sistemadetickets\SistemaServidor",
  [string]$RuntimePath = "C:\developerfaku\sistemadeticket\installer\postgresql\runtime",
  [string]$LogPath = "C:\ProgramData\MardelTech\postgres-bootstrap-elevated.log"
)

$ErrorActionPreference = "Stop"

$scriptPath = Join-Path (Split-Path -Parent $PSScriptRoot) "server\install-postgresql-unattended.ps1"
if (-not (Test-Path $scriptPath)) {
  throw "No se encontro $scriptPath"
}

$logDir = Split-Path -Parent $LogPath
if ($logDir -and -not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null
}

$tempScriptPath = Join-Path $logDir "postgres-bootstrap-runner.ps1"
$runner = @"
`$ErrorActionPreference = 'Stop'
try {
  Start-Transcript -Path '$LogPath' -Force | Out-Null
} catch {}

try {
  Write-Output '=== Inicio bootstrap PostgreSQL elevado ==='
  Write-Output 'InstallDir=$InstallDir'
  Write-Output 'RuntimePath=$RuntimePath'
  & '$scriptPath' -InstallDir '$InstallDir' -RuntimePath '$RuntimePath' -AdminToken 'TEST_ADMIN_TOKEN'
  Write-Output '=== Bootstrap completado correctamente ==='
  exit 0
} catch {
  Write-Output '=== Bootstrap fallo ==='
  Write-Output ('Mensaje: ' + `$_.Exception.Message)
  Write-Output ('Tipo: ' + `$_.Exception.GetType().FullName)
  if (`$_.ScriptStackTrace) { Write-Output `$_.ScriptStackTrace }
  if (`$_.InvocationInfo) { Write-Output ('Linea: ' + `$_.InvocationInfo.PositionMessage) }
  exit 1
} finally {
  try { Stop-Transcript | Out-Null } catch {}
}
"@

Set-Content -Path $tempScriptPath -Value $runner -Encoding UTF8

$process = Start-Process powershell.exe -Verb RunAs -ArgumentList @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", $tempScriptPath
) -Wait -PassThru

Write-Output "Bootstrap elevado ejecutado (ExitCode=$($process.ExitCode)). Revisar log: $LogPath"
