param(
  [string]$InstallDir = "C:\mardeltech\sistemadetickets",
  [string]$PostgresPrefix = "C:\mardeltech\postgresql",
  [string]$DataDir = "C:\mardeltech\postgresql\data",
  [int]$ServerPort = 3585,
  [string]$SuperAccount = "postgres",
  [string]$SuperPassword = "postgres",
  [string]$AppDbName = "sistema_tickets",
  [string]$AppDbUser = "mardeltech_app",
  [string]$AppDbPassword = "mardeltech_app",
  [string]$AdminToken = "CAMBIAR_TOKEN_ADMIN"
)

$ErrorActionPreference = "Stop"

function Ensure-Directory {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
  }
}

function Invoke-PsqlFile {
  param(
    [string]$PsqlPath,
    [string]$Database,
    [string]$SqlPath,
    [string]$User = $SuperAccount,
    [string]$Password = $SuperPassword
  )

  $stdoutPath = Join-Path $env:TEMP ("psql-file-" + [guid]::NewGuid().ToString("N") + ".out.log")
  $stderrPath = Join-Path $env:TEMP ("psql-file-" + [guid]::NewGuid().ToString("N") + ".err.log")
  try {
    $env:PGPASSWORD = $Password
    $arguments = @(
      "-v", "ON_ERROR_STOP=1",
      "-h", "127.0.0.1",
      "-p", "$ServerPort",
      "-U", $User,
      "-d", $Database,
      "-f", $SqlPath
    )
    Write-Output ("Ejecutando SQL file sobre {0}: {1}" -f $Database, $SqlPath)
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & $PsqlPath @arguments 1> $stdoutPath 2> $stderrPath
    $ErrorActionPreference = $previousErrorActionPreference
    $exitCode = $LASTEXITCODE
    $stdout = if (Test-Path $stdoutPath) { Get-Content -Path $stdoutPath -Raw -ErrorAction SilentlyContinue } else { "" }
    $stderr = if (Test-Path $stderrPath) { Get-Content -Path $stderrPath -Raw -ErrorAction SilentlyContinue } else { "" }
  } finally {
    Remove-Item -LiteralPath $stdoutPath,$stderrPath -Force -ErrorAction SilentlyContinue
  }

  if ($exitCode -ne 0) {
    $sqlPreview = ""
    if (Test-Path $SqlPath) {
      $sqlPreview = (Get-Content -Path $SqlPath -Raw -ErrorAction SilentlyContinue)
    }
    throw "psql devolvio ExitCode=$exitCode ejecutando $SqlPath. STDOUT: $stdout STDERR: $stderr SQL: $sqlPreview"
  }
}

function Invoke-PsqlCommand {
  param(
    [string]$PsqlPath,
    [string]$Database,
    [string]$Sql,
    [string]$User = $SuperAccount,
    [string]$Password = $SuperPassword
  )

  $tmpFile = Join-Path $env:TEMP ("psql-command-" + [guid]::NewGuid().ToString("N") + ".sql")
  Set-Content -Path $tmpFile -Value $Sql -Encoding UTF8
  try {
    Invoke-PsqlFile -PsqlPath $PsqlPath -Database $Database -SqlPath $tmpFile -User $User -Password $Password
  } finally {
    Remove-Item -LiteralPath $tmpFile -Force -ErrorAction SilentlyContinue
  }
}

function Wait-ForPostgres {
  param(
    [string]$PgIsReadyPath,
    [string]$User = $SuperAccount
  )

  $deadline = (Get-Date).AddSeconds(60)
  while ((Get-Date) -lt $deadline) {
    $env:PGPASSWORD = $SuperPassword
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & $PgIsReadyPath "-h" "127.0.0.1" "-p" "$ServerPort" "-U" $User *> $null
    $ErrorActionPreference = $previousErrorActionPreference
    if ($LASTEXITCODE -eq 0) {
      return
    }
    Start-Sleep -Seconds 2
  }

  throw "PostgreSQL no quedo listo para conexiones en el puerto $ServerPort."
}

function Write-ServerConfig {
  param([string]$TargetPath)

  $config = [ordered]@{
    PGHOST = "127.0.0.1"
    PGPORT = "$ServerPort"
    PGDATABASE = $AppDbName
    PGUSER = $AppDbUser
    PGPASSWORD = $AppDbPassword
    SISTEMA_TICKETS_API_PORT = "3000"
    SISTEMA_TICKETS_ADMIN_TOKEN = $AdminToken
  }

  $json = $config | ConvertTo-Json
  Set-Content -Path $TargetPath -Value $json -Encoding UTF8
}

function Get-PsqlScalar {
  param(
    [string]$PsqlPath,
    [string]$Database,
    [string]$Sql,
    [string]$User = $SuperAccount,
    [string]$Password = $SuperPassword
  )

  $tmpFile = Join-Path $env:TEMP ("psql-scalar-" + [guid]::NewGuid().ToString("N") + ".sql")
  Set-Content -Path $tmpFile -Value $Sql -Encoding UTF8
  $stdoutPath = Join-Path $env:TEMP ("psql-scalar-" + [guid]::NewGuid().ToString("N") + ".out.log")
  $stderrPath = Join-Path $env:TEMP ("psql-scalar-" + [guid]::NewGuid().ToString("N") + ".err.log")
  try {
    $env:PGPASSWORD = $Password
    $arguments = @(
      "-v", "ON_ERROR_STOP=1",
      "-h", "127.0.0.1",
      "-p", "$ServerPort",
      "-U", $User,
      "-d", $Database,
      "-tA",
      "-f", $tmpFile
    )
    Write-Output ("Consultando SQL scalar sobre {0}" -f $Database)
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & $PsqlPath @arguments 1> $stdoutPath 2> $stderrPath
    $ErrorActionPreference = $previousErrorActionPreference
    $stdout = if (Test-Path $stdoutPath) { Get-Content -Path $stdoutPath -Raw -ErrorAction SilentlyContinue } else { "" }
    $stderr = if (Test-Path $stderrPath) { Get-Content -Path $stderrPath -Raw -ErrorAction SilentlyContinue } else { "" }
    if ($LASTEXITCODE -ne 0) {
      throw "psql scalar devolvio ExitCode=$LASTEXITCODE. STDOUT: $stdout STDERR: $stderr SQL: $Sql"
    }
    if ([string]::IsNullOrWhiteSpace($stdout)) {
      return ""
    }
    return $stdout.Trim()
  } finally {
    Remove-Item -LiteralPath $tmpFile,$stdoutPath,$stderrPath -Force -ErrorAction SilentlyContinue
  }
}

function Quote-SqlLiteral {
  param([string]$Value)
  if ($null -eq $Value) {
    $Value = ""
  }
  return "'" + ($Value -replace "'", "''") + "'"
}

function Quote-PgIdentifier {
  param([string]$Value)
  if ($null -eq $Value) {
    $Value = ""
  }
  return '"' + ($Value -replace '"', '""') + '"'
}

function Remove-StaleService {
  param([string]$Name)

  $service = Get-Service -Name $Name -ErrorAction SilentlyContinue
  if ($service) {
    try {
      if ($service.Status -ne 'Stopped') {
        Stop-Service -Name $Name -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
      }
    } catch {}

    & sc.exe delete $Name | Out-Null
    Start-Sleep -Seconds 2
  }
}

function Invoke-InitDb {
  param(
    [string]$InitDbPath,
    [string]$DataDir,
    [string]$SuperAccount,
    [string]$SuperPassword
  )

  $pwFile = Join-Path $env:TEMP ("pg-superpassword-" + [guid]::NewGuid().ToString("N") + ".txt")
  Set-Content -Path $pwFile -Value $SuperPassword -Encoding ASCII
  try {
    $arguments = @(
      "-D", $DataDir,
      "-U", $SuperAccount,
      "-A", "scram-sha-256",
      "--pwfile", $pwFile,
      "--locale", "C",
      "--encoding", "UTF8"
    )

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & $InitDbPath @arguments
    $ErrorActionPreference = $previousErrorActionPreference
    if ($LASTEXITCODE -ne 0) {
      throw "initdb devolvio ExitCode=$LASTEXITCODE"
    }
  } finally {
    Remove-Item -LiteralPath $pwFile -Force -ErrorAction SilentlyContinue
  }
}

function Start-PostgresProcess {
  param(
    [string]$PgCtlPath,
    [string]$DataDir,
    [int]$ServerPort,
    [string]$LogDir
  )

  Ensure-Directory -Path $LogDir
  $logPath = Join-Path $LogDir "postgresql-startup.log"
  $options = "`"-p $ServerPort`""
  $arguments = @("start", "-D", $DataDir, "-w", "-t", "60", "-l", $logPath, "-o", $options)
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & $PgCtlPath @arguments
  $ErrorActionPreference = $previousErrorActionPreference
  if ($LASTEXITCODE -ne 0) {
    $logTail = ""
    if (Test-Path $logPath) {
      $logTail = Get-Content -Path $logPath -Tail 50 -ErrorAction SilentlyContinue | Out-String
    }
    throw "pg_ctl start devolvio ExitCode=$LASTEXITCODE. Log: $logTail"
  }
}

$psqlPath = Join-Path $PostgresPrefix "bin\psql.exe"
$initDbPath = Join-Path $PostgresPrefix "bin\initdb.exe"
$pgCtlPath = Join-Path $PostgresPrefix "bin\pg_ctl.exe"
$postgresExePath = Join-Path $PostgresPrefix "bin\postgres.exe"
$pgIsReadyPath = Join-Path $PostgresPrefix "bin\pg_isready.exe"
$initialDatabasePath = Join-Path $InstallDir "resources\server\base-inicial.sql"

if (-not (Test-Path $initialDatabasePath)) {
  $initialDatabasePath = Join-Path $InstallDir "resources\app.asar.unpacked\server\base-inicial.sql"
}

if (-not (Test-Path $initialDatabasePath)) {
  $initialDatabasePath = Join-Path $InstallDir "server\base-inicial.sql"
}

if (-not (Test-Path $initialDatabasePath)) {
  $initialDatabasePath = Join-Path (Split-Path -Parent $PSScriptRoot) "server\base-inicial.sql"
}

if (-not (Test-Path $initialDatabasePath)) {
  $initialDatabasePath = Join-Path $InstallDir "resources\server\schema.sql"
}

if (-not (Test-Path $initialDatabasePath)) {
  $initialDatabasePath = Join-Path $InstallDir "resources\app.asar.unpacked\server\schema.sql"
}

if (-not (Test-Path $initialDatabasePath)) {
  $initialDatabasePath = Join-Path $InstallDir "server\schema.sql"
}

if (-not (Test-Path $initialDatabasePath)) {
  $initialDatabasePath = Join-Path (Split-Path -Parent $PSScriptRoot) "server\schema.sql"
}

if (-not (Test-Path $psqlPath)) {
  throw "No se encontro psql en $psqlPath"
}

if (-not (Test-Path $initDbPath)) {
  throw "No se encontro initdb en $initDbPath"
}

if (-not (Test-Path $pgCtlPath)) {
  throw "No se encontro pg_ctl en $pgCtlPath"
}

if (-not (Test-Path $postgresExePath)) {
  throw "No se encontro postgres.exe en $postgresExePath"
}

if (-not (Test-Path $pgIsReadyPath)) {
  throw "No se encontro pg_isready en $pgIsReadyPath"
}

if (-not (Test-Path $initialDatabasePath)) {
  throw "No se encontro base-inicial.sql ni schema.sql para restaurar la base inicial."
}

Ensure-Directory -Path $PostgresPrefix
Ensure-Directory -Path $DataDir
$programDataDir = Join-Path $env:ProgramData "MardelTech\SistemaTickets\logs"

$legacyServiceName = "MardelTechPostgreSQL"
Remove-StaleService -Name $legacyServiceName

$hasDataFiles = [bool](Get-ChildItem -Path $DataDir -Force -ErrorAction SilentlyContinue | Select-Object -First 1)
if (-not $hasDataFiles) {
  Invoke-InitDb -InitDbPath $initDbPath -DataDir $DataDir -SuperAccount $SuperAccount -SuperPassword $SuperPassword
}

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& $pgIsReadyPath "-h" "127.0.0.1" "-p" "$ServerPort" "-U" $SuperAccount *> $null
$ErrorActionPreference = $previousErrorActionPreference
if ($LASTEXITCODE -ne 0) {
  Start-PostgresProcess -PgCtlPath $pgCtlPath -DataDir $DataDir -ServerPort $ServerPort -LogDir $programDataDir
}

Wait-ForPostgres -PgIsReadyPath $pgIsReadyPath

$appDbUserLiteral = Quote-SqlLiteral -Value $AppDbUser
$appDbPasswordLiteral = Quote-SqlLiteral -Value $AppDbPassword
$appDbUserIdentifier = Quote-PgIdentifier -Value $AppDbUser
$appDbNameLiteral = Quote-SqlLiteral -Value $AppDbName
$appDbNameIdentifier = Quote-PgIdentifier -Value $AppDbName

Write-Output "Creando o actualizando usuario de aplicacion..."
Invoke-PsqlCommand -PsqlPath $psqlPath -Database "postgres" -Sql @"
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', $appDbUserLiteral, $appDbPasswordLiteral)
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $appDbUserLiteral);
\gexec
SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', $appDbUserLiteral, $appDbPasswordLiteral)
WHERE EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $appDbUserLiteral);
\gexec
"@

Write-Output "Creando base de datos si hace falta..."
Invoke-PsqlCommand -PsqlPath $psqlPath -Database "postgres" -Sql @"
SELECT format('CREATE DATABASE %I OWNER %I', $appDbNameLiteral, $appDbUserLiteral)
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = $appDbNameLiteral);
\gexec
"@

Write-Output "Aplicando permisos y base inicial..."
Invoke-PsqlCommand -PsqlPath $psqlPath -Database $AppDbName -Sql "ALTER DATABASE $appDbNameIdentifier OWNER TO $appDbUserIdentifier;"
Invoke-PsqlFile -PsqlPath $psqlPath -Database $AppDbName -SqlPath $initialDatabasePath -User $AppDbUser -Password $AppDbPassword

$tuningSql = @"
ALTER SYSTEM SET port = '$ServerPort';
ALTER SYSTEM SET max_connections = '40';
ALTER SYSTEM SET shared_buffers = '128MB';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET effective_cache_size = '512MB';
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET random_page_cost = '1.5';
ALTER SYSTEM SET checkpoint_completion_target = '0.9';
ALTER SYSTEM SET autovacuum = 'on';
ALTER SYSTEM SET log_min_messages = 'warning';
ALTER SYSTEM SET log_min_duration_statement = '-1';
ALTER SYSTEM RESET shared_preload_libraries;
"@

Invoke-PsqlCommand -PsqlPath $psqlPath -Database "postgres" -Sql $tuningSql

$appServerConfig = Join-Path $InstallDir "server.config.json"
Write-ServerConfig -TargetPath $appServerConfig

Write-Warning "Algunos parametros de tuning quedaran aplicados por completo en el proximo reinicio del servidor."
Write-Output "Base, usuario, schema y configuracion del gateway listos."
