FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json client/package-lock.json ./client/
COPY server/package.json server/package-lock.json ./server/

RUN npm install
RUN npm install --prefix client --include=dev
RUN npm install --prefix server

COPY . .
RUN npm run build --prefix client

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist

RUN npm install --omit=dev --prefix server

ENV PORT=8080
EXPOSE 8080
CMD ["node", "server/index.js"]
