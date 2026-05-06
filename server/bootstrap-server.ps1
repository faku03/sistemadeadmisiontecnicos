param(
  [string]$InstallDir = "C:\mardeltech\sistemadetickets",
  [switch]$InstallSystem
)

$ErrorActionPreference = "Stop"

function Ensure-Dir {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
  }
}

function Write-LogLine {
  param([string]$Message)
  try {
    Add-Content -Path $logPath -Value ("[{0}] {1}" -f (Get-Date).ToString("s"), $Message) -ErrorAction SilentlyContinue
  } catch {}
}

function Invoke-PowerShellScript {
  param(
    [string]$ScriptPath,
    [string[]]$Arguments = @()
  )

  if (-not (Test-Path $ScriptPath)) {
    throw "No se encontro $ScriptPath"
  }

  $argList = @(
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy", "Bypass",
    "-File", $ScriptPath
  ) + $Arguments

  $stdoutPath = Join-Path $env:TEMP ("bootstrap-" + [guid]::NewGuid().ToString("N") + ".out.log")
  $stderrPath = Join-Path $env:TEMP ("bootstrap-" + [guid]::NewGuid().ToString("N") + ".err.log")
  try {
    $process = Start-Process -FilePath "powershell.exe" -ArgumentList $argList -Wait -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
    if (Test-Path $stdoutPath) {
      $stdout = Get-Content -Path $stdoutPath -Raw -ErrorAction SilentlyContinue
      if ($stdout) {
        Write-Host $stdout.TrimEnd()
      }
    }
    if (Test-Path $stderrPath) {
      $stderr = Get-Content -Path $stderrPath -Raw -ErrorAction SilentlyContinue
      if ($stderr) {
        Write-Host $stderr.TrimEnd()
      }
    }
    $exitCode = $process.ExitCode
  } finally {
    Remove-Item -LiteralPath $stdoutPath,$stderrPath -Force -ErrorAction SilentlyContinue
  }

  if ($exitCode -ne 0) {
    throw "Fallo $ScriptPath con ExitCode=$exitCode"
  }
}

$logDir = Join-Path $env:ProgramData "MardelTech\SistemaTickets\installer"
Ensure-Dir -Path $logDir
$logPath = Join-Path $logDir "server-bootstrap.log"
Write-LogLine "Inicio de bootstrap de servidor."

try {
  Write-Host ""
  Write-Host "=== Configuracion del servidor MardelTech ==="
  Write-Host "Instalando y configurando PostgreSQL..."
  Write-LogLine "Instalando y configurando PostgreSQL."

  $postgresScript = Join-Path $PSScriptRoot "install-postgresql-unattended.ps1"
  Invoke-PowerShellScript -ScriptPath $postgresScript -Arguments @("-InstallDir", $InstallDir)

  Write-Host "Registrando arranque automatico de PostgreSQL..."
  Write-LogLine "Registrando tarea de PostgreSQL."
  $postgresTaskScript = Join-Path $PSScriptRoot "install-postgresql-task.ps1"
  Invoke-PowerShellScript -ScriptPath $postgresTaskScript -Arguments @("-InstallDir", $InstallDir)

  Write-Host "Registrando arranque automatico del gateway..."
  Write-LogLine "Registrando tarea de gateway."
  $gatewayTaskScript = Join-Path $PSScriptRoot "install-gateway-task.ps1"
  Invoke-PowerShellScript -ScriptPath $gatewayTaskScript -Arguments @("-InstallDir", $InstallDir)

  $terminalDir = Join-Path $InstallDir "terminal"
  if ($InstallSystem -and (Test-Path $terminalDir)) {
    $terminalInstaller = Get-ChildItem -Path $terminalDir -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($terminalInstaller) {
      Write-Host "Abriendo instalador de terminal..."
      Write-LogLine "Abriendo instalador de terminal."
      Start-Process -FilePath $terminalInstaller.FullName
    } else {
      Write-Warning "No se encontro instalador de terminal en $terminalDir"
      Write-LogLine "No se encontro instalador de terminal."
    }
  }

  Write-Host ""
  Write-Host "Servidor configurado correctamente."
  Write-Host "Log: $logPath"
  Write-LogLine "Servidor configurado correctamente."
  exit 0
} catch {
  $message = $_.Exception.Message
  Write-LogLine ("ERROR: " + $message)
  Write-Host ""
  Write-Host "Fallo la configuracion del servidor."
  Write-Host $message
  Write-Host "Revise el log: $logPath"
  exit 1
}
