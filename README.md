# Docker Setup for Cloud Storage Microservices

This directory contains the necessary files to dockerize all microservices and workers for the cloud storage application.

## Files

- `docker-compose.yml` - Orchestrates all the services
- `Dockerfile` - Used to build the Node.js microservices
- `generate-env.sh` - Script to generate the `.env` file with environment variables
- `update-credentials.sh` - Script to update source code to use environment variables

## Setup Instructions

1. Copy all files to your project root:

```bash
cp temp-files/* .
```

2. Generate the `.env` file:

```bash
chmod +x generate-env.sh
./generate-env.sh
```

3. Update the source code to use environment variables:

```bash
chmod +x update-credentials.sh
./update-credentials.sh
```

4. Build and start all services:

```bash
docker-compose up -d
```

To rebuild services:

```bash
docker-compose up -d --build
```

## Services Included

- **Infrastructure**:
  - PostgreSQL databases (auth, file, temporal)
  - RabbitMQ message broker
  - Redis cache
  - Minio object storage
  - Temporal workflow engine

- **Microservices**:
  - API Gateway
  - Websocket Gateway
  - Auth Service
  - File Service
  - Billing Service
  - Storage Service

- **Workers**:
  - File Upload Worker
  - File Download Worker

## Environment Variables

All the services use environment variables from the `.env` file. You can customize these variables in the `.env` file to suit your needs:

- Database credentials
- RabbitMQ configuration
- Minio/S3 configuration
- Redis settings
- Temporal configuration
- Port mappings

## Network

All services are connected through a Docker network called `app-network` that allows them to communicate with each other using their service names as hostnames.

## Data Persistence

Volumes are configured for:
- PostgreSQL databases
- RabbitMQ data
- Minio data

These volumes ensure your data is persisted even when containers are recreated. 