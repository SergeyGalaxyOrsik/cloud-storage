# Docker Setup for Cloud Storage Microservices

This directory contains the necessary files to dockerize all microservices and workers for the cloud storage application.

## Files

- `docker-compose.yml` - Orchestrates all the services
- `Dockerfile` - Used to build the Node.js microservices
- `generate-env.sh` - Script to generate the `.env` file with environment variables
- `update-credentials.sh` - Script to update source code to use environment variables
- `docker-cleanup.sh` - Script to clean up Docker resources and free disk space

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ (the Dockerfile uses Node 20)
- Sufficient disk space (at least 10GB free space recommended)

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

4. Make the Docker cleanup script executable:

```bash
chmod +x docker-cleanup.sh
```

5. If you're low on disk space, run the cleanup script:

```bash
./docker-cleanup.sh
```

6. Build and start all services:

```bash
docker-compose up -d
```

To rebuild services:

```bash
docker-compose up -d --build
```

## Troubleshooting

### Disk Space Issues

If you encounter "no space left on device" errors:

1. Run the Docker cleanup script: `./docker-cleanup.sh`
2. Check your available disk space with: `df -h`
3. Consider pruning Docker resources manually:
   ```
   docker system prune -a
   ```

### Node.js Version Issues

The application requires Node.js 20+. If you see Node.js compatibility warnings:

1. Ensure your Dockerfile is using `FROM node:20-alpine`
2. If you're running the app locally, upgrade your Node.js version

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