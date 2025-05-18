FROM node:20-alpine AS builder

ARG APP_NAME

WORKDIR /app

# Copy only package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code and build
COPY . .
RUN npm run build

# Create production image with minimal footprint
FROM node:20-alpine

ARG APP_NAME
ENV APP_NAME=$APP_NAME
ENV NODE_ENV=production

WORKDIR /app

# Copy only the necessary files from the builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Command to run
CMD ["sh", "-c", "node dist/apps/${APP_NAME}/src/main.js"] 