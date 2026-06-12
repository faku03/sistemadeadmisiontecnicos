$ErrorActionPreference = "Stop"

$installDir = $env:SISTEMA_TICKETS_INSTALL_DIR
if (-not $installDir) {
  $installDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
}
$postgresPrefix = Join-Path $installDir "resources\postgresql\runtime"
$dataDir = "C:\mardeltech\postgresql\data"
$port = 3585
$logDir = Join-Path $env:ProgramData "MardelTech\SistemaTickets\logs"

$postgresExePath = Join-Path $postgresPrefix "bin\postgres.exe"
$pgIsReadyPath = Join-Path $postgresPrefix "bin\pg_isready.exe"
$logPath = Join-Path $logDir "postgresql-startup.log"

if (-not (Test-Path $postgresExePath)) {
  throw "No se encontro postgres.exe en $postgresExePath"
}

if (-not (Test-Path $pgIsReadyPath)) {
  throw "No se encontro pg_isready en $pgIsReadyPath"
}

if (-not (Test-Path $dataDir)) {
  throw "No se encontro el directorio de datos en $dataDir"
}

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$null = & $pgIsReadyPath -h 127.0.0.1 -p $port -U postgres 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Output "PostgreSQL ya estaba operativo."
  exit 0
}

$stdout = Join-Path $logDir "postgresql.out.log"
$stderr = Join-Path $logDir "postgresql.err.log"

Start-Process `
  -FilePath $postgresExePath `
  -ArgumentList @("-D", $dataDir, "-p", "$port") `
  -WorkingDirectory $postgresPrefix `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr | Out-Null

$deadline = (Get-Date).AddSeconds(60)
while ((Get-Date) -lt $deadline) {
  $null = & $pgIsReadyPath -h 127.0.0.1 -p $port -U postgres 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Output "PostgreSQL iniciado correctamente."
    exit 0
  }
  Start-Sleep -Seconds 2
}

throw "No se pudo iniciar PostgreSQL dentro del tiempo esperado."
