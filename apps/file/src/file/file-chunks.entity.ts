import { Column, PrimaryGeneratedColumn, Entity } from "typeorm";
import { ChunkData } from "@app/common/file/chunk-data.type";

@Entity({name: "files_chunks"})
export class FileChunks {
    @PrimaryGeneratedColumn('uuid', {name: 'id'})
    id: string;

    @Column({name: 'fileId'})
    fileId: string;

    @Column({name: 'originalName'})
    originalName: string;

    @Column({name: 'mimeType'})
    mimeType: string;

    @Column({name: 'size'})
    size: number;

    @Column({name: 'userId'})
    userId: string;

    @Column('jsonb', {name: "chunks"})
    chunks: ChunkData[]
}