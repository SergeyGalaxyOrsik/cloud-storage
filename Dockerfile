FROM node:20 AS base
WORKDIR /usr/src/app
COPY package*.json ./

# Development build stage
FROM base AS development
ARG APP_NAME
ENV APP_NAME=${APP_NAME}
RUN npm ci
COPY . .

# Create an entrypoint script
RUN echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'if [ -n "$APP_NAME" ]; then' >> /entrypoint.sh && \
    echo '  npm run start:dev $APP_NAME' >> /entrypoint.sh && \
    echo 'else' >> /entrypoint.sh && \
    echo '  npm run start:dev' >> /entrypoint.sh && \
    echo 'fi' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"] 