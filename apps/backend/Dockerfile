FROM node:20-alpine
# Bibliotecas essenciais para o Prisma no Alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# 1. Dependências
COPY package*.json ./
RUN npm install

# 2. Copia TUDO primeiro (incluindo a pasta prisma)
COPY . .

# 3. Comando de diagnóstico: Isso vai imprimir no log se a pasta prisma existe
RUN ls -la ./prisma && ls -la ./

# 4. Gera o cliente apontando o caminho exato para não ter erro
RUN npx prisma generate --schema=./prisma/schema.prisma

# 5. Build
RUN npm run build

EXPOSE 3001
CMD ["npm", "run", "start:prod"]