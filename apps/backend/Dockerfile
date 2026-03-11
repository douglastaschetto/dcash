FROM node:20-alpine

# Instala dependências de sistema necessárias para o Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# 1. Copia apenas os pacotes para aproveitar o cache
COPY package*.json ./
RUN npm install

# 2. Copia a pasta prisma EXPLICITAMENTE antes do resto
# Isso garante que ela exista para o próximo comando
COPY prisma ./prisma/

# 3. Copia o restante do código
COPY . .

# 4. Gera o cliente (agora o arquivo TEM que estar lá)
RUN npx prisma generate

# 5. Build do Nest
RUN npm run build

EXPOSE 3001
CMD ["npm", "run", "start:prod"]