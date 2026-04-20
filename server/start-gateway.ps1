$ErrorActionPreference = "Stop"

$installDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$logDir = Join-Path $env:ProgramData "MardelTech\SistemaTickets\logs"
$configPath = Join-Path $installDir "server.config.json"

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

$env:SISTEMA_TICKETS_OUTPUT_PATH = Join-Path $env:ProgramData "MardelTech\SistemaTickets\pdfs"
New-Item -ItemType Directory -Force -Path $env:SISTEMA_TICKETS_OUTPUT_PATH | Out-Null

$stdout = Join-Path $logDir "gateway.out.log"
$stderr = Join-Path $logDir "gateway.err.log"

Set-Location $installDir
Start-Process -FilePath (Join-Path $installDir "Sistema Tecnico y Caja.exe") -ArgumentList "--gateway" -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr
