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

# Gera o cliente Prisma e faz o build do NestJS
RUN npx prisma generate
RUN npm run build && ls -la dist/
RUN ls -la /app/dist

# --- ESTÁGIO 2: Execução (Runner) ---
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

# Copia apenas o necessário do estágio de build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

# Rodar via node diretamente é mais rápido e seguro em containers
CMD ["node", "/app/dist/main.js"]