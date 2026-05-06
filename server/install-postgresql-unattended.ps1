param(
  [string]$InstallDir = "C:\mardeltech\sistemadetickets",
  [string]$PostgresPrefix = "",
  [string]$DataDir = "C:\mardeltech\postgresql\data",
  [int]$ServerPort = 3585,
  [string]$SuperAccount = "postgres",
  [string]$SuperPassword = "postgres",
  [string]$AppDbName = "sistema_tickets",
  [string]$AppDbUser = "mardeltech_app",
  [string]$AppDbPassword = "mardeltech_app",
  [string]$AdminToken = "CAMBIAR_TOKEN_ADMIN",
  [string]$RuntimePath = ""
)

$ErrorActionPreference = "Stop"

function Resolve-RuntimePath {
  param(
    [string]$BaseInstallDir,
    [string]$ExplicitPath
  )

  $candidates = @()

  if ($ExplicitPath) {
    $candidates += $ExplicitPath
  }

  $candidates += @(
    (Join-Path $BaseInstallDir "resources\postgresql\runtime"),
    (Join-Path $BaseInstallDir "postgresql\runtime"),
    (Join-Path (Split-Path -Parent $PSScriptRoot) "installer\postgresql\runtime")
  )

  foreach ($candidate in $candidates) {
    if (-not $candidate) {
      continue
    }

    if (Test-Path $candidate) {
      $resolved = (Resolve-Path $candidate).Path
      $initDb = Join-Path $resolved "bin\initdb.exe"
      $pgCtl = Join-Path $resolved "bin\pg_ctl.exe"
      $psql = Join-Path $resolved "bin\psql.exe"

      if ((Test-Path $initDb) -and (Test-Path $pgCtl) -and (Test-Path $psql)) {
        return $resolved
      }
    }
  }

  throw "No se encontro el runtime preextraido de PostgreSQL. Esperado en resources\postgresql\runtime con bin\initdb.exe, bin\pg_ctl.exe y bin\psql.exe."
}

function Copy-RuntimeTree {
  param(
    [string]$Source,
    [string]$Destination
  )

  New-Item -ItemType Directory -Force -Path $Destination | Out-Null

  $sourceNormalized = [System.IO.Path]::GetFullPath($Source).TrimEnd('\')
  $destinationNormalized = [System.IO.Path]::GetFullPath($Destination).TrimEnd('\')

  if ($sourceNormalized -eq $destinationNormalized) {
    return
  }

  Copy-Item -Path (Join-Path $sourceNormalized '*') -Destination $destinationNormalized -Recurse -Force
}

function Test-BinarioInstalado {
  param([string]$Prefix)

  $required = @(
    (Join-Path $Prefix "bin\initdb.exe"),
    (Join-Path $Prefix "bin\pg_ctl.exe"),
    (Join-Path $Prefix "bin\psql.exe"),
    (Join-Path $Prefix "bin\pg_isready.exe")
  )

  foreach ($path in $required) {
    if (-not (Test-Path $path)) {
      return $false
    }
  }

  return $true
}

$resolvedInstallDir = (Resolve-Path -LiteralPath $InstallDir -ErrorAction SilentlyContinue)
if (-not $resolvedInstallDir) {
  New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
} else {
  $InstallDir = $resolvedInstallDir.Path
}

$runtimeSource = Resolve-RuntimePath -BaseInstallDir $InstallDir -ExplicitPath $RuntimePath

if (-not $PostgresPrefix) {
  $PostgresPrefix = $runtimeSource
}

if (-not (Test-BinarioInstalado -Prefix $PostgresPrefix)) {
  Write-Output "Copiando runtime de PostgreSQL desde $runtimeSource a $PostgresPrefix..."
  Copy-RuntimeTree -Source $runtimeSource -Destination $PostgresPrefix
}

if (-not (Test-BinarioInstalado -Prefix $PostgresPrefix)) {
  throw "El runtime copiado en $PostgresPrefix no contiene todos los binarios requeridos."
}

$configureScript = Join-Path $PSScriptRoot "configure-postgresql-instance.ps1"
if (-not (Test-Path $configureScript)) {
  throw "No se encontro $configureScript"
}

& $configureScript `
  -InstallDir $InstallDir `
  -PostgresPrefix $PostgresPrefix `
  -DataDir $DataDir `
  -ServerPort $ServerPort `
  -SuperAccount $SuperAccount `
  -SuperPassword $SuperPassword `
  -AppDbName $AppDbName `
  -AppDbUser $AppDbUser `
  -AppDbPassword $AppDbPassword `
  -AdminToken $AdminToken

Write-Output "PostgreSQL runtime copiado y configurado correctamente."
