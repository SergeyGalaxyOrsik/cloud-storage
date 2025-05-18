import { DataSource } from "typeorm";
import { config } from 'dotenv';
config();

export const AppDataSource = new DataSource(
    {
        type: "postgres",
        host: process.env.AUTH_DB_HOST || 'localhost',
        port: parseInt(process.env.AUTH_DB_PORT || "5433", 10),
        username: process.env.AUTH_DB_USER || 'user',
        password: process.env.AUTH_DB_PASSWORD || 'password',
        database: process.env.AUTH_DB_NAME || 'authdb',
        synchronize: false,
        entities: [`${__dirname}/../**/*.entity{.ts,.js}`],
        migrations: [`${__dirname}/../migrations/*{.ts,.js}`],
    }
)