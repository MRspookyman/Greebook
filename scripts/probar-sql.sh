#!/usr/bin/env bash
# Prueba el esquema (RLS y papeles doblados) contra un Postgres temporal. Necesita Postgres instalado
# (initdb, pg_ctl, psql); no toca ningún proyecto de Supabase.
#   npm run test:sql
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
bin="$(dirname "$(command -v initdb || ls /usr/lib/postgresql/*/bin/initdb | tail -1)")"
dir="$(mktemp -d)"
port=54329
chmod 755 "$dir"

# Postgres no arranca como root: en ese caso se usa el usuario «postgres».
run() { if [ "$(id -u)" = 0 ]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi; }
if [ "$(id -u)" = 0 ]; then chown postgres "$dir"; fi

cleanup() { run "'$bin/pg_ctl' -D '$dir/data' -m immediate stop" >/dev/null 2>&1 || true; rm -rf "$dir"; }
trap cleanup EXIT

run "'$bin/initdb' -D '$dir/data' -U postgres -A trust" >/dev/null
run "'$bin/pg_ctl' -D '$dir/data' -o '-p $port -c listen_addresses= -k $dir' -l '$dir/log' -w start" >/dev/null

sql() { run "'$bin/psql' -X -q -v ON_ERROR_STOP=1 -h '$dir' -p $port -U postgres -f '$1'" 2>&1 | grep -v '^NOTICE' || true; }

sql "$root/supabase/tests/stubs.sql"
sql "$root/supabase/migrations/0001_greenbook.sql"
# Una segunda pasada: la migración se puede repetir y sigue conservando quiénes sois.
sql "$root/supabase/migrations/0001_greenbook.sql"
out="$(sql "$root/supabase/tests/rls.sql")"
echo "$out"
echo "$out" | grep -q '^OK' || { echo 'Las pruebas SQL han fallado'; exit 1; }
