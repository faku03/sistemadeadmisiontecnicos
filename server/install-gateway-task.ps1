param(
  [string]$InstallDir = "C:\mardeltech\sistemadetickets",
  [string]$TaskName = "MardelTech Sistema Tickets Gateway"
)

$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $InstallDir "resources\server\start-gateway.ps1"

if (-not (Test-Path $scriptPath)) {
  throw "No se encontro $scriptPath"
}

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName

Write-Output "Gateway programado e iniciado: $TaskName"
