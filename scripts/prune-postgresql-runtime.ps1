param(
  [string]$RuntimePath = "C:\developerfaku\sistemadeticket\installer\postgresql\runtime"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $RuntimePath)) {
  throw "No se encontro runtime en $RuntimePath"
}

function Get-DirSizeMB([string]$Path) {
  if (-not (Test-Path $Path)) { return 0 }
  $sum = (Get-ChildItem -LiteralPath $Path -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
  return [math]::Round(($sum / 1MB), 1)
}

$before = Get-DirSizeMB $RuntimePath

$removeDirs = @(
  (Join-Path $RuntimePath "installer"),
  (Join-Path $RuntimePath "include"),
  (Join-Path $RuntimePath "scripts"),
  (Join-Path $RuntimePath "doc"),
  (Join-Path $RuntimePath "pgAdmin 4"),
  (Join-Path $RuntimePath "StackBuilder"),
  (Join-Path $RuntimePath "lib\pgxs"),
  (Join-Path $RuntimePath "lib\pkgconfig"),
  (Join-Path $RuntimePath "share\doc"),
  (Join-Path $RuntimePath "share\i18n")
)

foreach ($dir in $removeDirs) {
  if (Test-Path $dir) {
    Remove-Item -LiteralPath $dir -Recurse -Force
  }
}

$removeFiles = @(
  (Join-Path $RuntimePath "installation_summary.log"),
  (Join-Path $RuntimePath "pgAdmin_3rd_party_licenses.txt"),
  (Join-Path $RuntimePath "pgAdmin_license.txt"),
  (Join-Path $RuntimePath "pg_env.bat"),
  (Join-Path $RuntimePath "uninstall-postgresql.dat"),
  (Join-Path $RuntimePath "uninstall-postgresql.exe"),
  (Join-Path $RuntimePath "commandlinetools_3rd_party_licenses.txt")
)

foreach ($file in $removeFiles) {
  if (Test-Path $file) {
    Remove-Item -LiteralPath $file -Force
  }
}

$binDir = Join-Path $RuntimePath "bin"
$libDir = Join-Path $RuntimePath "lib"

$removeBinPatterns = @(
  "stackbuilder.exe",
  "ecpg.exe",
  "test_cloexec.exe",
  "pg_test_fsync.exe",
  "pg_test_timing.exe",
  "isolationtester.exe",
  "pg_isolation_regress.exe",
  "pg_regress.exe",
  "pg_regress_ecpg.exe",
  "libpq_pipeline.exe",
  "libpq_testclient.exe",
  "libpq_uri_regress.exe",
  "*.pdb",
  "wx*.dll"
)

foreach ($pattern in $removeBinPatterns) {
  Get-ChildItem -LiteralPath $binDir -Filter $pattern -File -ErrorAction SilentlyContinue | Remove-Item -Force
}

$removeLibPatterns = @(
  "*.lib",
  "*.a",
  "pgevent.dll",
  "plugin_debugger.dll",
  "test_decoding.dll",
  "testplug.dll",
  "hstore_plpython3.dll",
  "jsonb_plpython3.dll",
  "ltree_plpython3.dll",
  "hstore_plperl.dll",
  "jsonb_plperl.dll",
  "bool_plperl.dll",
  "plperl.dll",
  "plpython3.dll",
  "pltcl.dll"
)

foreach ($pattern in $removeLibPatterns) {
  Get-ChildItem -LiteralPath $libDir -Filter $pattern -File -ErrorAction SilentlyContinue | Remove-Item -Force
}

$after = Get-DirSizeMB $RuntimePath

[pscustomobject]@{
  RuntimePath = $RuntimePath
  SizeBeforeMB = $before
  SizeAfterMB = $after
  SavedMB = [math]::Round(($before - $after), 1)
}
