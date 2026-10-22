#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

SIERRA_LEONE_DB_URL="${SIERRA_LEONE_DB_URL:-https://databases.dhis2.org/sierra-leone/2.41/dhis2-db-sierra-leone.sql.gz}"
export DATA_YEAR="${DATA_YEAR:-$(($(date +%Y) - 1))}"
E2E_DB_DIR=docker/e2e-db
OUTPUT=docker/db-dump/dump.sql.gz
COMPOSE=(docker compose --env-file .env.e2e -f "$E2E_DB_DIR/docker-compose.yml")

if [[ ! -f "$E2E_DB_DIR/dump.sql.gz" ]]; then
    echo "Downloading $SIERRA_LEONE_DB_URL"
    curl -fL --output "$E2E_DB_DIR/dump.sql.gz" "$SIERRA_LEONE_DB_URL"
fi

"${COMPOSE[@]}" down --volumes --remove-orphans
trap '"${COMPOSE[@]}" down --volumes' EXIT

echo "Starting DHIS2 on the Sierra Leone database and configuring it for data year $DATA_YEAR"
"${COMPOSE[@]}" run --rm configure
"${COMPOSE[@]}" stop web

mkdir -p "$(dirname "$OUTPUT")"
"${COMPOSE[@]}" exec -T db pg_dump --username dhis dhis -T 'analytics*' -T '_*' -T 'rs_*' | gzip >"$OUTPUT"

echo "Created $OUTPUT"
echo "Next: set ANALYTICS_FIRST_YEAR=$DATA_YEAR in .env.e2e, regenerate the fixtures, attach the dump to a release and update DHIS2_DB_DUMP_URL"
