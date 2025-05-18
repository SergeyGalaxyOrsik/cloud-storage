import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/users.entity';
import { UserPub } from '../user-pb/user-pb.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const dbPort = configService.get<string>('AUTH_DB_PORT');
                return {
                    type: 'postgres',
                    host: configService.get('AUTH_DB_HOST') || 'localhost',
                    port: dbPort ? parseInt(dbPort, 10) : 5433,
                    username: configService.get('AUTH_DB_USER') || 'user',
                    password: configService.get('AUTH_DB_PASSWORD') || 'password',
                    database: configService.get('AUTH_DB_NAME') || 'authdb',
                    entities: [User, UserPub],
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
