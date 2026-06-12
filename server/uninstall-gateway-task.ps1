param(
  [string]$TaskName = "MardelTech Sistema Tickets Gateway"
)

$ErrorActionPreference = "SilentlyContinue"

$startupDirs = @(
  [Environment]::GetFolderPath("Startup"),
  [Environment]::GetFolderPath("CommonStartup")
)

$launcherNames = @(
  "MardelTech-Gateway.cmd",
  "MardelTech-PostgreSQL.cmd",
  "MardelTech-ServerTickets.cmd",
  "MardelTech-ServerTickets.vbs"
)

foreach ($startupDir in $startupDirs) {
  if (-not $startupDir) {
    continue
  }

  foreach ($launcherName in $launcherNames) {
    Remove-Item -LiteralPath (Join-Path $startupDir $launcherName) -Force -ErrorAction SilentlyContinue
  }
}

Get-Process | Where-Object {
  $_.Path -and (
    $_.Path.EndsWith("SistemaServidor.exe") -or
    $_.Path.EndsWith("sistemadetickets.exe") -or
    $_.Path.EndsWith("Sistema Tecnico y Caja.exe") -or
    $_.Path.EndsWith("Sistema de Tickets.exe")
  )
} | Stop-Process -Force
