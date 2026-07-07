$ErrorActionPreference = "Stop"

$installDir = $env:SISTEMA_TICKETS_INSTALL_DIR
if (-not $installDir) {
  $installDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
}
$postgresPrefix = Join-Path $installDir "resources\postgresql\runtime"
$logDir = Join-Path $env:ProgramData "MardelTech\SistemaTickets\logs"
$configPath = Join-Path $installDir "server.config.json"

if (-not (Test-Path $configPath)) {
  $parentConfigPath = Join-Path (Split-Path -Parent $installDir) "server.config.json"
  if (Test-Path $parentConfigPath) {
    $configPath = $parentConfigPath
  }
}

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

if (Test-Path $configPath) {
  $config = Get-Content $configPath -Raw | ConvertFrom-Json

  if ($config.PGHOST) { $env:PGHOST = [string]$config.PGHOST }
  if ($config.PGPORT) { $env:PGPORT = [string]$config.PGPORT }
  if ($config.PGDATABASE) { $env:PGDATABASE = [string]$config.PGDATABASE }
  if ($config.PGUSER) { $env:PGUSER = [string]$config.PGUSER }
  if ($config.PGPASSWORD) { $env:PGPASSWORD = [string]$config.PGPASSWORD }
  if ($config.DATABASE_URL) { $env:DATABASE_URL = [string]$config.DATABASE_URL }
  if ($config.SISTEMA_TICKETS_API_PORT) { $env:SISTEMA_TICKETS_API_PORT = [string]$config.SISTEMA_TICKETS_API_PORT }
  if ($config.SISTEMA_TICKETS_ADMIN_TOKEN) { $env:SISTEMA_TICKETS_ADMIN_TOKEN = [string]$config.SISTEMA_TICKETS_ADMIN_TOKEN }
}

if (-not $env:PGHOST) { $env:PGHOST = "127.0.0.1" }
if (-not $env:PGPORT) { $env:PGPORT = "3585" }
if (-not $env:PGDATABASE) { $env:PGDATABASE = "sistema_tickets" }
if (-not $env:PGUSER) { $env:PGUSER = "mardeltech_app" }
if (-not $env:PGPASSWORD) { $env:PGPASSWORD = "mardeltech_app" }
if (-not $env:SISTEMA_TICKETS_API_PORT) { $env:SISTEMA_TICKETS_API_PORT = "3000" }

$pgIsReadyPath = Join-Path $postgresPrefix "bin\pg_isready.exe"
if ((Test-Path $pgIsReadyPath) -and $env:PGHOST -and $env:PGPORT -and (($env:PGHOST -eq "127.0.0.1") -or ($env:PGHOST -eq "localhost"))) {
  $pgProbeUser = "postgres"
  if ($env:PGUSER) {
    $pgProbeUser = $env:PGUSER
  }
  $deadline = (Get-Date).AddSeconds(60)
  while ((Get-Date) -lt $deadline) {
    $null = & $pgIsReadyPath -h $env:PGHOST -p $env:PGPORT -U $pgProbeUser 2>$null
    if ($LASTEXITCODE -eq 0) {
      break
    }
    $postgresStarter = Join-Path $PSScriptRoot "start-postgresql.ps1"
    if (Test-Path $postgresStarter) {
      powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File $postgresStarter *> $null
    }
    Start-Sleep -Seconds 2
  }
}

$preferredOutputPath = Join-Path $env:ProgramData "MardelTech\SistemaTickets\pdfs"
$fallbackOutputPath = Join-Path $env:LOCALAPPDATA "MardelTech\SistemaTickets\pdfs"
$env:SISTEMA_TICKETS_OUTPUT_PATH = $preferredOutputPath
try {
  New-Item -ItemType Directory -Force -Path $preferredOutputPath -ErrorAction Stop | Out-Null
} catch {
  $env:SISTEMA_TICKETS_OUTPUT_PATH = $fallbackOutputPath
  New-Item -ItemType Directory -Force -Path $fallbackOutputPath | Out-Null
}

$stdout = Join-Path $logDir "gateway.out.log"
$stderr = Join-Path $logDir "gateway.err.log"
$gatewayExe = @(
  (Join-Path $installDir "FaroDeskServidor.exe"),
  (Join-Path $installDir "SistemaServidor.exe"),
  (Join-Path $installDir "sistemadetickets.exe"),
  (Join-Path $installDir "Sistema Tecnico y Caja.exe"),
  (Join-Path $installDir "Sistema de Tickets.exe")
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $gatewayExe) {
  throw "No se encontro el ejecutable del gateway en $installDir"
}

Set-Location $installDir
Start-Process -FilePath $gatewayExe -ArgumentList "--gateway" -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr
