#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/sistema-tickets}"
BACKUP_DIR="${BACKUP_DIR:-/opt}"
PROCESS_PATTERN="${PROCESS_PATTERN:-server/index.js}"

usage() {
  cat <<'EOF'
Uso:
  scripts/backup-postgres.sh

Variables opcionales:
  APP_DIR=/opt/sistema-tickets
  BACKUP_DIR=/opt
  PGHOST=127.0.0.1
  PGPORT=5432
  PGDATABASE=sistema_tickets
  PGUSER=mardeltech_app
  PGPASSWORD=...

El script intenta leer PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD y DATABASE_URL
desde el proceso en ejecucion que coincida con server/index.js. Si no lo encuentra,
usa las variables del entorno actual.
EOF
}

log() {
  printf '[backup-postgres] %s\n' "$*"
}

fail() {
  printf '[backup-postgres] ERROR: %s\n' "$*" >&2
  exit 1
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

command -v pg_dump >/dev/null 2>&1 || fail "pg_dump no esta instalado o no esta en PATH."
command -v pg_restore >/dev/null 2>&1 || fail "pg_restore no esta instalado o no esta en PATH."

load_env_from_process() {
  local pid
  pid="$(pgrep -f "$PROCESS_PATTERN" | head -n1 || true)"

  if [[ -z "$pid" || ! -r "/proc/$pid/environ" ]]; then
    return 0
  fi

  log "Leyendo configuracion desde proceso PID $pid ($PROCESS_PATTERN)."
  while IFS='=' read -r key value; do
    case "$key" in
      PGHOST|PGPORT|PGDATABASE|PGUSER|PGPASSWORD|DATABASE_URL)
        if [[ -n "${value:-}" ]]; then
          export "$key=$value"
        fi
        ;;
    esac
  done < <(tr '\0' '\n' < "/proc/$pid/environ")
}

load_env_from_process

PGHOST="${PGHOST:-127.0.0.1}"
PGPORT="${PGPORT:-5432}"
PGDATABASE="${PGDATABASE:-sistema_tickets}"
PGUSER="${PGUSER:-mardeltech_app}"

if [[ -z "${DATABASE_URL:-}" && -z "${PGPASSWORD:-}" ]]; then
  fail "No encontre PGPASSWORD ni DATABASE_URL. Exporta PGPASSWORD o asegurate de que el gateway este corriendo."
fi

mkdir -p "$BACKUP_DIR"

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_file="$BACKUP_DIR/sistema-tickets-db-backup-$timestamp.dump"
list_file="$BACKUP_DIR/sistema-tickets-db-backup-$timestamp.list.txt"

log "Destino: $backup_file"

if [[ -n "${DATABASE_URL:-}" ]]; then
  log "Ejecutando pg_dump con DATABASE_URL."
  pg_dump "$DATABASE_URL" -Fc -f "$backup_file"
else
  log "Ejecutando pg_dump en $PGHOST:$PGPORT/$PGDATABASE como $PGUSER."
  PGPASSWORD="$PGPASSWORD" pg_dump \
    -h "$PGHOST" \
    -p "$PGPORT" \
    -U "$PGUSER" \
    -d "$PGDATABASE" \
    -Fc \
    -f "$backup_file"
fi

[[ -s "$backup_file" ]] || fail "El archivo de backup no se creo o quedo vacio."

log "Verificando dump con pg_restore -l."
pg_restore -l "$backup_file" > "$list_file"
[[ -s "$list_file" ]] || fail "La verificacion no genero listado de objetos."

log "Backup OK."
ls -lh "$backup_file" "$list_file"
log "Primeros objetos del dump:"
head -n 20 "$list_file"
