#!/bin/bash

# Create .env file
echo "Creating .env file..."
cat > .env << EOF
# Database Credentials
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

# RabbitMQ
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

# Minio
MINIO_HOST=minio
MINIO_PORT=9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
MINIO_ENDPOINT=http://minio:9000
EOF

# Phase 1: Start infrastructure only
echo "Phase 1: Starting infrastructure services..."
docker compose up -d rabbitmq postgres-auth postgres-file redis minio

# Wait for infrastructure to be ready
echo "Waiting for infrastructure services to be ready..."
sleep 10

# Check if user wants to continue to Phase 2
read -p "Infrastructure services started. Continue to Phase 2 (building api-gateway)? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Phase 2: Build and start api-gateway
    echo "Phase 2: Building and starting api-gateway..."
    
    # Uncomment api-gateway in docker-compose.yml
    sed -i '' 's/# api-gateway:/api-gateway:/g' docker-compose.yml
    sed -i '' 's/#   build:/  build:/g' docker-compose.yml
    sed -i '' 's/#     context:/    context:/g' docker-compose.yml
    sed -i '' 's/#     dockerfile:/    dockerfile:/g' docker-compose.yml
    sed -i '' 's/#     args:/    args:/g' docker-compose.yml
    sed -i '' 's/#       APP_NAME:/      APP_NAME:/g' docker-compose.yml
    sed -i '' 's/#   ports:/  ports:/g' docker-compose.yml
    sed -i '' 's/#     -/    -/g' docker-compose.yml
    sed -i '' 's/#   depends_on:/  depends_on:/g' docker-compose.yml
    sed -i '' 's/#     -/    -/g' docker-compose.yml
    sed -i '' 's/#   env_file:/  env_file:/g' docker-compose.yml
    sed -i '' 's/#     -/    -/g' docker-compose.yml
    sed -i '' 's/#   networks:/  networks:/g' docker-compose.yml
    sed -i '' 's/#     -/    -/g' docker-compose.yml
    sed -i '' 's/#   restart:/  restart:/g' docker-compose.yml
    
    # Build and start api-gateway
    docker compose up -d api-gateway
fi

echo "Docker services are running!"
echo "To check the status, run: docker compose ps"
echo "To view logs, run: docker compose logs -f" 