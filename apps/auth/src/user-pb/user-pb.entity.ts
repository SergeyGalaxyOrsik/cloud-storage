import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({name: "user-pb"})
export class UserPub {
    @PrimaryGeneratedColumn('uuid', {name: 'id'})
    id: string;
    
    @Column({name: 'userId'})
    userId: string;

    @Column({name: "publicKey"})
    publicKey: string;

    @Column({name: 'deviceId'})
    deviceId: string
}