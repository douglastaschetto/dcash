FROM node:20-alpine
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm install

# Copia a pasta prisma para garantir que o arquivo esteja no local esperado
COPY prisma ./prisma/ 

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3001
CMD ["npm", "run", "start:prod"]