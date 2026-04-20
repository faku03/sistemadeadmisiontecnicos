param(
  [string]$TaskName = "MardelTech Sistema Tickets Gateway"
)

$ErrorActionPreference = "SilentlyContinue"

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false | Out-Null

Get-Process | Where-Object {
  $_.Path -and (
    $_.Path.EndsWith("sistemadetickets.exe") -or
    $_.Path.EndsWith("Sistema Tecnico y Caja.exe") -or
    $_.Path.EndsWith("Sistema de Tickets.exe")
  )
} | Stop-Process -Force
