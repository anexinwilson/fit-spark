FROM node:22-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY infra/ingestion/ingest-exercises.mjs ./ingest-exercises.mjs
COPY infra/ingestion/equipment-normalization.mjs ./equipment-normalization.mjs

CMD ["node", "ingest-exercises.mjs"]
