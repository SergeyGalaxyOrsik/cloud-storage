import { Column, PrimaryGeneratedColumn, Entity, CreateDateColumn } from "typeorm";

type DevicesKeys = {
    deviceId: string,
    key: string
}

@Entity({name: "files_keys"})
export class FileKey {
    @PrimaryGeneratedColumn('uuid', {name: 'id'})
    id: string;

    @Column({name: 'fileId'})
    fileId: string;

    @Column({name: 'userId'})
    userId: string;

    @Column('jsonb', {name: "keys"})
    keys: DevicesKeys[]

    @CreateDateColumn({name: 'createdAt'})
    createdAt: Date;

}