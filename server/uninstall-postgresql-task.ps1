param(
  [string]$TaskName = "MardelTech PostgreSQL"
)

$ErrorActionPreference = "SilentlyContinue"

$startupDir = [Environment]::GetFolderPath("Startup")
$launcherPath = Join-Path $startupDir "MardelTech-PostgreSQL.cmd"
Remove-Item -Path $launcherPath -ErrorAction SilentlyContinue

$pgCtlPath = "C:\mardeltech\postgresql\bin\pg_ctl.exe"
$dataDir = "C:\mardeltech\postgresql\data"

if ((Test-Path $pgCtlPath) -and (Test-Path $dataDir)) {
  & $pgCtlPath stop -D $dataDir -m fast | Out-Null
}
