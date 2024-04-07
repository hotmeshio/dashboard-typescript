# Base stage
FROM node:20-bullseye-slim AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Development stage
FROM base AS development
ENV NODE_ENV=development
CMD ["npm", "run", "service"]
