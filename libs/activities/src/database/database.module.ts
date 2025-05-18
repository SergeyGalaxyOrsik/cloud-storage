import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileKey } from '../entities/file-keys.entity';
import * as dotenv from 'dotenv';
dotenv.config();

@Module({
    imports: [
        TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.FILE_DB_HOST || 'localhost',
            port: process.env.FILE_DB_PORT ? parseInt(process.env.FILE_DB_PORT, 10) : 5434,
            username: process.env.FILE_DB_USER || 'user',
            password: process.env.FILE_DB_PASSWORD || 'password',
            database: process.env.FILE_DB_NAME || 'filedb',
            entities: [FileKey],
            migrations: [`${__dirname}/../migrations/*{.ts,.js}`],
            synchronize: true,
            migrationsRun: true,
            logging: true
        }),
    ]
})
export class DatabaseModule {
}
