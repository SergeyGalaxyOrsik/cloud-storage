#!/bin/bash

# Update Auth service database connection
sed -i 's/host: "localhost"/host: process.env.AUTH_DB_HOST || "localhost"/g' apps/auth/src/database/database.module.ts
sed -i 's/port: 5433/port: process.env.AUTH_DB_PORT ? parseInt(process.env.AUTH_DB_PORT, 10) : 5433/g' apps/auth/src/database/database.module.ts
sed -i 's/username: "user"/username: process.env.AUTH_DB_USER || "user"/g' apps/auth/src/database/database.module.ts
sed -i 's/password: "password"/password: process.env.AUTH_DB_PASSWORD || "password"/g' apps/auth/src/database/database.module.ts
sed -i 's/database: "authdb"/database: process.env.AUTH_DB_NAME || "authdb"/g' apps/auth/src/database/database.module.ts

# Update File service database connection
sed -i 's/host: "localhost"/host: process.env.FILE_DB_HOST || "localhost"/g' apps/file/src/database/database.module.ts
sed -i 's/port: 5434/port: process.env.FILE_DB_PORT ? parseInt(process.env.FILE_DB_PORT, 10) : 5434/g' apps/file/src/database/database.module.ts
sed -i 's/username: "user"/username: process.env.FILE_DB_USER || "user"/g' apps/file/src/database/database.module.ts
sed -i 's/password: "password"/password: process.env.FILE_DB_PASSWORD || "password"/g' apps/file/src/database/database.module.ts
sed -i 's/database: "filedb"/database: process.env.FILE_DB_NAME || "filedb"/g' apps/file/src/database/database.module.ts

# Update RabbitMQ connections
find apps -type f -name "*.ts" -exec sed -i 's|amqp://guest:guest@localhost:5672|${process.env.RABBITMQ_URL}|g' {} \;

# Update data-source.ts
sed -i 's/host: "localhost"/host: process.env.FILE_DB_HOST || "localhost"/g' libs/activities/src/database/data-source.ts
sed -i 's/port: parseInt("5434", 10)/port: process.env.FILE_DB_PORT ? parseInt(process.env.FILE_DB_PORT, 10) : 5434/g' libs/activities/src/database/data-source.ts
sed -i 's/username: "user"/username: process.env.FILE_DB_USER || "user"/g' libs/activities/src/database/data-source.ts
sed -i 's/password: "password"/password: process.env.FILE_DB_PASSWORD || "password"/g' libs/activities/src/database/data-source.ts
sed -i 's/database: "filedb"/database: process.env.FILE_DB_NAME || "filedb"/g' libs/activities/src/database/data-source.ts

# Update Minio credentials in MinioModule
sed -i 's|endpoint: "http://localhost:9000"|endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000"|g' libs/activities/src/minio/minio.module.ts
sed -i "s|accessKeyId: 'minioadmin'|accessKeyId: process.env.MINIO_ROOT_USER || 'minioadmin'|g" libs/activities/src/minio/minio.module.ts
sed -i "s|secretAccessKey: 'minioadmin123'|secretAccessKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin123'|g" libs/activities/src/minio/minio.module.ts

# Update Minio credentials in file-upload.activities.ts
sed -i 's|endpoint: "http://localhost:9000"|endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000"|g' libs/activities/src/file-upload-activities/file-upload.activities.ts
sed -i "s|accessKeyId: 'minioadmin'|accessKeyId: process.env.MINIO_ROOT_USER || 'minioadmin'|g" libs/activities/src/file-upload-activities/file-upload.activities.ts
sed -i "s|secretAccessKey: 'minioadmin123'|secretAccessKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin123'|g" libs/activities/src/file-upload-activities/file-upload.activities.ts

# Update Minio credentials in file-download.activities.ts
sed -i 's|endpoint: "http://localhost:9000"|endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000"|g' libs/activities/src/file-download-activities/file-download.activities.ts
sed -i "s|accessKeyId: 'minioadmin'|accessKeyId: process.env.MINIO_ROOT_USER || 'minioadmin'|g" libs/activities/src/file-download-activities/file-download.activities.ts
sed -i "s|secretAccessKey: 'minioadmin'|secretAccessKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin'|g" libs/activities/src/file-download-activities/file-download.activities.ts

# Update Minio credentials in api-gateway file.module.ts
sed -i 's|endpoint: "http://localhost:9000"|endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000"|g' apps/api-gateway/src/file/file.module.ts
sed -i "s|accessKeyId: 'minioadmin'|accessKeyId: process.env.MINIO_ROOT_USER || 'minioadmin'|g" apps/api-gateway/src/file/file.module.ts
sed -i "s|secretAccessKey: 'minioadmin123'|secretAccessKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin123'|g" apps/api-gateway/src/file/file.module.ts

echo "Source code updated to use environment variables!" 