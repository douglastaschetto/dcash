#!/bin/bash
set -e  # Para o script parar se algum comando falhar

# Configurações
MONOREPO_DIR=/home/ubuntu/dcash-app      # Caminho do monorepo no servidor
DOCKER_COMPOSE_FILE=$MONOREPO_DIR/infra/docker-compose.yml
BRANCH=main                               # Branch que será deployada
LOG_FILE=$MONOREPO_DIR/deploy.log

echo "============================="
echo "$(date '+%Y-%m-%d %H:%M:%S') - Iniciando deploy" | tee -a $LOG_FILE
echo "=============================" | tee -a $LOG_FILE

# 1️⃣ Ir para o diretório do monorepo
cd $MONOREPO_DIR

# 2️⃣ Garantir que estamos na branch correta
git fetch origin
git checkout $BRANCH
git reset --hard origin/$BRANCH

# 3️⃣ Parar e remover containers antigos
echo "Parando containers antigos..." | tee -a $LOG_FILE
docker compose -f $DOCKER_COMPOSE_FILE down

# 4️⃣ Subir containers atualizados
echo "Subindo containers atualizados..." | tee -a $LOG_FILE
docker compose -f $DOCKER_COMPOSE_FILE pull  # Puxa imagens atualizadas se houver
docker compose -f $DOCKER_COMPOSE_FILE up -d --build

# 5️⃣ Logs finais
echo "Deploy concluído com sucesso!" | tee -a $LOG_FILE
docker ps | tee -a $LOG_FILE