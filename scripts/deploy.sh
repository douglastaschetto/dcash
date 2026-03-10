#!/bin/bash
set -e

# --- CONFIGURAÇÕES AJUSTADAS ---
# Na imagem, sua pasta é dcash-stack. Se mudou para dcash-app, mantenha.
MONOREPO_DIR=/home/ubuntu/dcash-stack  
# Verifique se o docker-compose está em infra/ ou na raiz. Ajuste abaixo:
DOCKER_COMPOSE_FILE=$MONOREPO_DIR/docker-compose.yml 
BRANCH=main
LOG_FILE=$MONOREPO_DIR/deploy.log

echo "============================="
echo "$(date '+%Y-%m-%d %H:%M:%S') - Iniciando deploy" | tee -a $LOG_FILE
echo "=============================" | tee -a $LOG_FILE

# 1. Ir para o diretório
cd $MONOREPO_DIR

# 2. Sincronizar com GitHub
# Se pedir senha, use o seu Personal Access Token
git fetch origin
git checkout $BRANCH
git reset --hard origin/$BRANCH

# 3. Gerar o Prisma Client (Essencial para o Backend rodar)
# Se você usa docker-compose para o build, o Dockerfile deve fazer isso.
# Caso contrário, descomente a linha abaixo:
# docker run --rm -v $(pwd):/app -w /app/apps/backend node:20 npx prisma generate

# 4. Ciclo do Docker
echo "Parando containers antigos..." | tee -a $LOG_FILE
docker compose -f $DOCKER_COMPOSE_FILE down

echo "Subindo containers atualizados..." | tee -a $LOG_FILE
# --build garante que o código novo que você deu 'pull' seja compilado
docker compose -f $DOCKER_COMPOSE_FILE up -d --build

# 5. Limpeza de imagens órfãs (Para não encher o disco da OCI)
docker image prune -f

echo "Deploy concluído com sucesso!" | tee -a $LOG_FILE
docker ps | tee -a $LOG_FILE