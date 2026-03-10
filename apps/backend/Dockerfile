FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# O Prisma precisa encontrar o arquivo em ./prisma/schema.prisma
RUN npx prisma generate
RUN npm run build
EXPOSE 3001
CMD ["npm", "run", "start:prod"]