$ErrorActionPreference = "Stop"

$configPath = "C:\mardeltech\sistemadetickets\server.config.json"

if (Test-Path $configPath) {
  $config = Get-Content $configPath -Raw | ConvertFrom-Json

  if ($config.PGHOST) { $env:PGHOST = [string]$config.PGHOST }
  if ($config.PGPORT) { $env:PGPORT = [string]$config.PGPORT }
  if ($config.PGDATABASE) { $env:PGDATABASE = [string]$config.PGDATABASE }
  if ($config.PGUSER) { $env:PGUSER = [string]$config.PGUSER }
  if ($config.PGPASSWORD) { $env:PGPASSWORD = [string]$config.PGPASSWORD }
}

$env:SISTEMA_TICKETS_API_PORT = "3011"
Set-Location "C:\developerfaku\sistemadeticket"
node server\index.js
