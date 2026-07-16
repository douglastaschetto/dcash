# --- ESTÁGIO 1: Build ---
FROM node:20-alpine AS builder
WORKDIR /app

# Copia apenas os arquivos de dependências primeiro para aproveitar o cache do Docker
COPY apps/backend/package*.json ./
RUN npm install --legacy-peer-deps

# Copia todo o código do backend (exceto o que estiver no .dockerignore)
COPY apps/backend/ .

# Executa o build do NestJS (compila TS para JS)
RUN npm run build

# --- ESTÁGIO 2: Execução (Runner) ---
FROM node:20-alpine AS runner
WORKDIR /app

# Variável de ambiente para otimização de performance do Node.js
ENV NODE_ENV production

# Copiamos apenas o necessário para a execução
COPY --from=builder /app/package*.json ./
# Instalamos apenas as dependências de produção para reduzir o tamanho final
RUN npm install --omit=dev --legacy-peer-deps

COPY --from=builder /app/dist ./dist

EXPOSE 3001

# Mantemos a lógica de busca para localizar o main.js no diretório de saída
CMD ["sh", "-c", "node $(find dist -name main.js | head -n 1)"]
