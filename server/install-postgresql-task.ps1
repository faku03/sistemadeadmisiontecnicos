param(
  [string]$InstallDir = "C:\mardeltech\sistemadetickets",
  [string]$TaskName = "MardelTech PostgreSQL"
)

$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $InstallDir "resources\server\start-postgresql.ps1"
if (-not (Test-Path $scriptPath)) {
  throw "No se encontro $scriptPath"
}

$startupDir = [Environment]::GetFolderPath("Startup")
New-Item -ItemType Directory -Force -Path $startupDir | Out-Null

$launcherPath = Join-Path $startupDir "MardelTech-PostgreSQL.cmd"
$launcherContent = @"
@echo off
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "$scriptPath"
"@
Set-Content -Path $launcherPath -Value $launcherContent -Encoding ASCII -Force

Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoProfile",
  "-NonInteractive",
  "-ExecutionPolicy", "Bypass",
  "-WindowStyle", "Hidden",
  "-File", $scriptPath
) -WindowStyle Hidden

Write-Output "PostgreSQL configurado para inicio de Windows e iniciado: $launcherPath"
