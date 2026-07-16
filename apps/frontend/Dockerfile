# --- ESTÁGIO 1: Build ---
FROM node:20-alpine AS builder
WORKDIR /app

# Instala libc6-compat caso existam dependências que precisem (comum em ambientes Alpine)
RUN apk add --no-cache libc6-compat

# Copia arquivos de dependência
COPY apps/frontend/package*.json ./
RUN npm install

# Copia o código fonte
COPY apps/frontend/ ./

# --- INJEÇÃO DE VARIÁVEIS DE AMBIENTE ---
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-https://dcash.dtasc.com.br/api}

# Build standalone (output: 'standalone' já configurado em next.config.ts)
RUN npm run build

# --- ESTÁGIO 2: Runner ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# Desabilita telemetria do Next.js em produção
ENV NEXT_TELEMETRY_DISABLED=1

# Cria um usuário não-root para segurança (boas práticas OCI)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia os arquivos necessários do modo standalone
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
# O standalone gera um server.js que substitui o "npm run start"
CMD ["node", "server.js"]
