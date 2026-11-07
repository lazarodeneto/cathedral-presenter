#!/bin/sh
set -eu
# Refresh before scanning; a missing/invalid database must never produce a clean verdict.
freshclam --stdout --user=node --log=/data/freshclam.log || true
while true; do sleep 21600; freshclam --stdout --user=node --log=/data/freshclam.log || true; done &
exec node /app/run.mjs
