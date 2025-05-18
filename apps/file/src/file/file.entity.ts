import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";
@Entity()
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  originalName: string;

  @Column()
  mimeType: string;

  @Column()
  size: number;

  @Column()
  storagePath: string;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: false })
  isPublic: boolean;

  @Column({ nullable: true, unique: true, type: 'varchar' })
  publicSlug: string | null;
}
