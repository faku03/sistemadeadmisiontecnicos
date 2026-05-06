param(
  [string]$SourcePrefix = "C:\Program Files\PostgreSQL\18",
  [string]$Destination = "C:\developerfaku\sistemadeticket\installer\postgresql\runtime"
)

$ErrorActionPreference = "Stop"

function Ensure-Exists {
  param([string]$Path, [string]$Label)

  if (-not (Test-Path $Path)) {
    throw "No se encontro $Label en $Path"
  }
}

Ensure-Exists -Path $SourcePrefix -Label "el origen de PostgreSQL"
Ensure-Exists -Path (Join-Path $SourcePrefix "bin\initdb.exe") -Label "initdb.exe"
Ensure-Exists -Path (Join-Path $SourcePrefix "bin\pg_ctl.exe") -Label "pg_ctl.exe"
Ensure-Exists -Path (Join-Path $SourcePrefix "bin\psql.exe") -Label "psql.exe"
Ensure-Exists -Path (Join-Path $SourcePrefix "bin\pg_isready.exe") -Label "pg_isready.exe"

New-Item -ItemType Directory -Force -Path $Destination | Out-Null

$excludeNames = @(
  "data",
  "pgAdmin 4",
  "doc"
)

Get-ChildItem -Path $SourcePrefix -Force | ForEach-Object {
  if ($excludeNames -contains $_.Name) {
    return
  }

  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $Destination $_.Name) -Recurse -Force
}

Write-Output "Runtime de PostgreSQL preparado en $Destination"
