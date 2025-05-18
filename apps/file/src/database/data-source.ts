import { DataSource } from "typeorm";
import { config } from 'dotenv';
config();

export const AppDataSource = new DataSource(
    {
        type: "postgres",
        host: process.env.FILE_DB_HOST || 'localhost',
        port: parseInt(process.env.FILE_DB_PORT || "5434", 10),
        username: process.env.FILE_DB_USER || 'user',
        password: process.env.FILE_DB_PASSWORD || 'password',
        database: process.env.FILE_DB_NAME || 'filedb',
        synchronize: false,
        entities: [`${__dirname}/../**/*.entity{.ts,.js}`],
        migrations: [`${__dirname}/../migrations/*{.ts,.js}`],
    }
)