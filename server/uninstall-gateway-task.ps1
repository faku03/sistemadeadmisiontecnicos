param(
  [string]$TaskName = "MardelTech Sistema Tickets Gateway"
)

$ErrorActionPreference = "SilentlyContinue"

$startupDir = [Environment]::GetFolderPath("Startup")
$launcherPath = Join-Path $startupDir "MardelTech-Gateway.cmd"
Remove-Item -Path $launcherPath -ErrorAction SilentlyContinue

Get-Process | Where-Object {
  $_.Path -and (
    $_.Path.EndsWith("sistemadetickets.exe") -or
    $_.Path.EndsWith("Sistema Tecnico y Caja.exe") -or
    $_.Path.EndsWith("Sistema de Tickets.exe")
  )
} | Stop-Process -Force
