import { BeforeInsert, Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import * as bcrypt from 'bcryptjs';

@Entity({name: "users"})
export class User {
    @PrimaryGeneratedColumn('uuid', {name: 'id'})
    id: string;

    @Column({name: 'email', unique: true})
    email: string;

    @Column({name: 'password'})
    password: string;

    @Column({name: 'name'})
    name: string;

    @Column({name: 'surname'})
    surname: string;
    
    @BeforeInsert()
    async hashPassword() {
        this.password = await bcrypt.hash(this.password, 10);
    }
}