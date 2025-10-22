FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm i --omit=dev
COPY tsconfig.json ./
COPY src ./src
CMD ["node", "--loader", "ts-node/esm", "src/index.ts"]
