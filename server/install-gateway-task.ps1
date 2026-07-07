param(
  [string]$InstallDir = "C:\mardeltech\sistemadetickets",
  [string]$TaskName = "FaroDesk ServerTickets"
)

$ErrorActionPreference = "Stop"

$serverExe = Join-Path $InstallDir "FaroDeskServidor.exe"
if (-not (Test-Path $serverExe)) {
  $serverExe = Join-Path $InstallDir "SistemaServidor.exe"
}
if (-not (Test-Path $serverExe)) {
  throw "No se encontro $serverExe"
}

$startupDir = [Environment]::GetFolderPath("CommonStartup")
if (-not $startupDir) {
  $startupDir = [Environment]::GetFolderPath("Startup")
}
New-Item -ItemType Directory -Force -Path $startupDir | Out-Null

$oldLaunchers = @(
  (Join-Path $startupDir "MardelTech-Gateway.cmd"),
  (Join-Path $startupDir "MardelTech-PostgreSQL.cmd"),
  (Join-Path $startupDir "MardelTech-ServerTickets.cmd")
)

foreach ($oldLauncher in $oldLaunchers) {
  Remove-Item -LiteralPath $oldLauncher -Force -ErrorAction SilentlyContinue
}

$launcherPath = Join-Path $startupDir "MardelTech-ServerTickets.vbs"
$safeInstallDir = $InstallDir.Replace('"', '""')
$safeServerExe = $serverExe.Replace('"', '""')
$launcherContent = @"
Set shell = CreateObject("WScript.Shell")
shell.Environment("PROCESS")("SISTEMA_TICKETS_INSTALL_DIR") = "$safeInstallDir"
shell.Run Chr(34) & "$safeServerExe" & Chr(34) & " --server-tray", 0, False
"@
Set-Content -Path $launcherPath -Value $launcherContent -Encoding ASCII -Force

Start-Process -FilePath $serverExe -ArgumentList "--server-tray" -WindowStyle Hidden

Write-Output "ServerTickets configurado para inicio de Windows e iniciado: $launcherPath"
