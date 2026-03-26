# ── Stage 1: Build ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY src/ ./src/
COPY tsconfig.json ./
COPY public/ ./public/

RUN npx tsc && npx tsc -p public/tsconfig.json

# ── Stage 2: Production ────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled server from builder
COPY --from=builder /app/dist/ ./dist/

# Copy only the runtime public assets (no .ts files)
COPY --from=builder /app/public/app.js ./public/app.js
COPY --from=builder /app/public/hexagon-bg.js ./public/hexagon-bg.js
COPY --from=builder /app/public/index.css ./public/index.css
COPY --from=builder /app/public/index.html ./public/index.html

# Create data and uploads directories
RUN mkdir -p uploads data

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/server.js"]
