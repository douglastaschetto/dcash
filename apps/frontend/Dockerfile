# --- ESTÁGIO 1: Build ---
FROM node:20-alpine AS builder
WORKDIR /app

# Copia arquivos de dependência
COPY apps/frontend/package*.json ./
RUN npm install

# Copia o código fonte
COPY apps/frontend/ ./

# --- INJEÇÃO DE VARIÁVEIS DE AMBIENTE ---
# Isso mata o erro "undefined" nas URLs do frontend
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-https://dcash.dtasc.com.br/api}

RUN npm run build

# --- ESTÁGIO 2: Runner ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copia o que é estritamente necessário
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

# O "truque" para a pasta public: só copia se ela existir de fato no builder
COPY --from=builder /app/public* ./public/

EXPOSE 3000

CMD ["npm", "run", "start"]