# --- ESTÁGIO 1: Build ---
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

# Instala dependências
COPY apps/backend/package*.json ./
RUN npm install

# Copia Prisma e código fonte
COPY apps/backend/prisma ./prisma/
COPY apps/backend/ .

# Gera o cliente Prisma e faz o build
RUN npx prisma generate
RUN npm run build

# --- ESTÁGIO 2: Execução (Runner) ---
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

# Copia as dependências e o build do estágio anterior
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

# O AJUSTE: Usamos o comando 'find' para localizar o main.js e executá-lo.
# Isso resolve o problema de caminhos diferentes em Monorepos (ex: dist/apps/backend/main.js)
CMD ["sh", "-c", "node $(find dist -name main.js | head -n 1)"]