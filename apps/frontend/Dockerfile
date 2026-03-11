# --- ESTÁGIO DE BUILD ---
FROM node:20-alpine AS builder
WORKDIR /app

# Instala dependências
COPY apps/frontend/package*.json ./
RUN npm install

# Copia o código e faz o build
COPY apps/frontend/ .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# --- ESTÁGIO DE EXECUÇÃO (Runner) ---
FROM node:20-alpine AS runner
WORKDIR /app

# Copia apenas o que é necessário do estágio anterior
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
# ATENÇÃO: Verifique se é .js ou .mjs no seu PC. Pelas fotos anteriores, é .js
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public* ./public/

EXPOSE 3000

CMD ["npm", "start"]
