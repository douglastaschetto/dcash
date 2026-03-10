FROM node:20-alpine

WORKDIR /app

# Copia os arquivos de dependências (estando dentro de apps/backend)
COPY package*.json ./
RUN npm install

# Copia o restante do código
COPY . .

# Garante que o Prisma gere o cliente antes do build
# O arquivo deve estar em ./prisma/schema.prisma em relação a esta pasta
RUN npx prisma generate

RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start:prod"]