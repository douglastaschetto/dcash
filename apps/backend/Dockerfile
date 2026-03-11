FROM node:20-alpine
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

# 1. Copia as dependências (Caminho completo a partir da raiz)
COPY apps/backend/package*.json ./
RUN npm install

# 2. Copia a pasta prisma (Caminho completo a partir da raiz)
# Isso resolve o erro "prisma not found"
COPY apps/backend/prisma ./prisma

# 3. Copia o código fonte do backend
COPY apps/backend/ .

# 4. Gera o Prisma Client
RUN npx prisma generate

# 5. Build do NestJS
RUN npm run build

EXPOSE 3001
CMD ["npm", "run", "start:prod"]