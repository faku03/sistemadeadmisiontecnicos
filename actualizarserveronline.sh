#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/sistema-tickets}"
BRANCH="${BRANCH:-codex/licencias-suscripcion}"
REMOTE="${REMOTE:-origin}"
SERVICE="${SERVICE:-sistema-licencias}"
HEALTH_URL="${HEALTH_URL:-https://sistematickets.licences.mardeltech.com/health}"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  log "ERROR: $*"
  exit 1
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

cd "$APP_DIR" || fail "No se pudo entrar a $APP_DIR"

log "Actualizando servidor online en $APP_DIR"
log "Rama objetivo: $BRANCH"

if [ ! -d .git ]; then
  fail "$APP_DIR no parece ser un repositorio git"
fi

if [ ! -f .env ]; then
  fail "No existe .env en $APP_DIR"
fi

if [ -n "$(git status --porcelain --untracked-files=no)" ] && [ "${FORCE_UPDATE:-0}" != "1" ]; then
  git status --short --untracked-files=no
  fail "Hay cambios locales trackeados. Revisalos o ejecuta con FORCE_UPDATE=1 si estas seguro."
fi

PREVIOUS_COMMIT="$(git rev-parse --short HEAD)"
log "Commit actual: $PREVIOUS_COMMIT"

log "Descargando cambios desde GitHub..."
git fetch "$REMOTE" "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only "$REMOTE" "$BRANCH"

CURRENT_COMMIT="$(git rev-parse --short HEAD)"
log "Commit actualizado: $CURRENT_COMMIT"

set -a
# shellcheck disable=SC1091
source .env
set +a

if command_exists pg_dump; then
  BACKUP_DIR="$APP_DIR/backups"
  BACKUP_FILE="$BACKUP_DIR/predeploy-$(date '+%Y-%m-%d-%H%M%S')-$PREVIOUS_COMMIT.sql"
  mkdir -p "$BACKUP_DIR"

  if [ -n "${PGHOST:-}" ] && [ -n "${PGPORT:-}" ] && [ -n "${PGUSER:-}" ] && [ -n "${PGDATABASE:-}" ]; then
    log "Creando backup PostgreSQL: $BACKUP_FILE"
    PGPASSWORD="${PGPASSWORD:-}" pg_dump \
      -h "$PGHOST" \
      -p "$PGPORT" \
      -U "$PGUSER" \
      "$PGDATABASE" > "$BACKUP_FILE"
  else
    log "Variables PG incompletas; se omite backup de base de datos."
  fi
else
  log "pg_dump no esta disponible; se omite backup de base de datos."
fi

log "Instalando dependencias npm..."
npm install

log "Ejecutando migraciones..."
npm run server:migrate

log "Reiniciando servicio $SERVICE..."
sudo systemctl restart "$SERVICE"

log "Estado del servicio:"
sudo systemctl --no-pager --full status "$SERVICE" || true

log "Probando health check local..."
curl --fail --silent --show-error http://127.0.0.1:3000/health
printf '\n'

log "Probando health check publico..."
curl --fail --silent --show-error "$HEALTH_URL"
printf '\n'

log "Verificando tablas esperadas..."
if command_exists psql && [ -n "${PGHOST:-}" ] && [ -n "${PGPORT:-}" ] && [ -n "${PGUSER:-}" ] && [ -n "${PGDATABASE:-}" ]; then
  PGPASSWORD="${PGPASSWORD:-}" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "\d licenses" >/dev/null
  PGPASSWORD="${PGPASSWORD:-}" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "\d license_payments" >/dev/null
else
  log "psql o variables PG no disponibles; se omite verificacion de tablas."
fi

log "Actualizacion terminada correctamente."
