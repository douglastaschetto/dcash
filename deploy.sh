#!/usr/bin/env bash
# Deploy do dcash_v2 para a VM OCI (substitui os containers dcash-backend/dcash-frontend).
# Usa o Host 137.131.154.53 já configurado em ~/.ssh/config.
set -euo pipefail

ssh 137.131.154.53 '
  set -euo pipefail
  cd /home/ubuntu/dcash-stack

  echo "--- git ---"
  git fetch origin
  git reset --hard HEAD
  git clean -fd apps/
  git checkout -B v2 origin/v2
  git reset --hard origin/v2

  echo "--- build & restart ---"
  docker compose -f docker-compose.prod.yml up -d --build
  docker image prune -f

  echo "--- status ---"
  docker ps --filter "name=dcash-" --format "table {{.Names}}\t{{.Status}}"
'
