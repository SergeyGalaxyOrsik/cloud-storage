import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { File } from '../file/file.entity';
import { FileChunks } from '../file/file-chunks.entity';
import { FileKey } from '@app/activities/entities/file-keys.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const dbPort = configService.get<string>('FILE_DB_PORT');
                return {
                    type: 'postgres',
                    host: configService.get('FILE_DB_HOST') || 'localhost',
                    port: dbPort ? parseInt(dbPort, 10) : 5434,
                    username: configService.get('FILE_DB_USER') || 'user',
                    password: configService.get('FILE_DB_PASSWORD') || 'password',
                    database: configService.get('FILE_DB_NAME') || 'filedb',
                    entities: [File, FileChunks, FileKey],
                    migrations: [`${__dirname}/../migrations/*{.ts,.js}`],
                    synchronize: true,
                    migrationsRun: true,
                    logging: true
                };
            },
        }),
    ]
})
export class DatabaseModule {
}
