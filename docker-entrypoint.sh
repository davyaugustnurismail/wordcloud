#!/bin/sh
set -e

node dist/migrate.js
exec node dist/server.js
