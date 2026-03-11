# --- ESTÁGIO DE BUILD ---
FROM node:20-alpine AS builder
WORKDIR /app

# 1. Recebe o argumento do docker-compose
ARG NEXT_PUBLIC_API_URL
# 2. Transforma o argumento em uma variável de ambiente para o processo de build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Instala dependências
COPY apps/frontend/package*.json ./
RUN npm install

# Copia o código e faz o build
COPY apps/frontend/ .

# O build agora terá o valor correto da URL em vez de undefined
RUN npm run build

# --- ESTÁGIO DE EXECUÇÃO (Runner) ---
FROM node:20-alpine AS runner
WORKDIR /app

# Copia apenas o que é necessário do estágio anterior
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.mjs ./
# Garante que a pasta public seja copiada se existir
COPY --from=builder /app/public ./public

# Reafirma a variável no runner para garantir consistência em runtime
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

EXPOSE 3000

CMD ["npm", "start"]