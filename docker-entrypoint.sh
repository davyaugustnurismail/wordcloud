#!/bin/sh
set -e

UPLOADS="${UPLOAD_DIR:-/data/uploads}"
if ! touch "$UPLOADS/.write-test" 2>/dev/null; then
  echo "[entrypoint] PERINGATAN: $UPLOADS tidak bisa ditulis oleh user $(id -un) (uid $(id -u)). Unggahan gambar akan gagal. Di host jalankan: chown -R 1000:1000 data/uploads" >&2
else
  rm -f "$UPLOADS/.write-test"
fi

node dist/migrate.js
exec node dist/server.js
