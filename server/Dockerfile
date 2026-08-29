FROM node:20-alpine

WORKDIR /app

# Install build dependencies for native modules if required
RUN apk add --no-cache python3 make g++

# Copy package manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application files
COPY . .

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "server.js"]
