#!/bin/bash

cat > .env << 'EOF'
# Database Credentials
# Auth Database
AUTH_DB_HOST=postgres-auth
AUTH_DB_PORT=5432
AUTH_DB_USER=user
AUTH_DB_PASSWORD=password
AUTH_DB_NAME=authdb

# File Database
FILE_DB_HOST=postgres-file
FILE_DB_PORT=5432
FILE_DB_USER=user
FILE_DB_PASSWORD=password
FILE_DB_NAME=filedb

# Temporal Database
TEMPORAL_DB_HOST=postgresql
TEMPORAL_DB_PORT=5432
TEMPORAL_DB_USER=temporal
TEMPORAL_DB_PASSWORD=temporal
TEMPORAL_DB_NAME=temporal

# RabbitMQ
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Minio
MINIO_HOST=minio
MINIO_PORT=9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
MINIO_ENDPOINT=http://minio:9000

# Temporal
TEMPORAL_ADDRESS=temporal:7233

# API Gateway
API_GATEWAY_PORT=3000

# Websocket Gateway
WEBSOCKET_PORT=3001
EOF

echo ".env file created successfully!" 