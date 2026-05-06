param(
  [string]$InstallDir = "C:\mardeltech\sistemadetickets",
  [string]$StatusFile = "",
  [string]$LogFile = "",
  [string]$PostgresPrefix = "C:\mardeltech\postgresql",
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

function Ensure-ParentDirectory {
  param([string]$Path)

  if (-not $Path) {
    return
  }

  $parent = Split-Path -Parent $Path
  if ($parent -and -not (Test-Path $parent)) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }
}

function Write-Status {
  param(
    [string]$State,
    [string]$Message = ""
  )

  if (-not $StatusFile) {
    return
  }

  Ensure-ParentDirectory -Path $StatusFile
  $payload = @(
    $State
    $Message
    (Get-Date).ToString("s")
  )
  Set-Content -Path $StatusFile -Value $payload -Encoding UTF8
}

if (-not $StatusFile) {
  $StatusFile = Join-Path $env:ProgramData "MardelTech\SistemaTickets\installer\postgresql-status.json"
}

if (-not $LogFile) {
  $LogFile = Join-Path $env:ProgramData "MardelTech\SistemaTickets\installer\postgresql-worker.log"
}

Ensure-ParentDirectory -Path $StatusFile
Ensure-ParentDirectory -Path $LogFile
Remove-Item -LiteralPath $StatusFile -Force -ErrorAction SilentlyContinue
Write-Status -State "RUNNING" -Message "Preparando PostgreSQL..."

try {
  Start-Transcript -Path $LogFile -Force | Out-Null
} catch {
  Set-Content -Path $LogFile -Value ("No se pudo iniciar transcript: " + $_.Exception.Message) -Encoding UTF8
}

try {
  $scriptPath = Join-Path $PSScriptRoot "install-postgresql-unattended.ps1"
  if (-not (Test-Path $scriptPath)) {
    throw "No se encontro $scriptPath"
  }

  & $scriptPath `
    -InstallDir $InstallDir `
    -PostgresPrefix $PostgresPrefix `
    -DataDir $DataDir `
    -ServerPort $ServerPort `
    -SuperAccount $SuperAccount `
    -SuperPassword $SuperPassword `
    -AppDbName $AppDbName `
    -AppDbUser $AppDbUser `
    -AppDbPassword $AppDbPassword `
    -AdminToken $AdminToken `
    -RuntimePath $RuntimePath

  Write-Status -State "SUCCESS" -Message "PostgreSQL preparado correctamente."
  exit 0
} catch {
  $message = $_.Exception.Message
  Write-Error $message
  Add-Content -Path $LogFile -Value ("ERROR: " + $message)
  Write-Status -State "ERROR" -Message $message
  exit 1
} finally {
  try {
    Stop-Transcript | Out-Null
  } catch {}
}
