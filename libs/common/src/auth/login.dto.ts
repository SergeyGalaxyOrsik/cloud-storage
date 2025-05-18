import { IsEmail, IsString, Min, IsOptional } from "class-validator";

export class LoginDto {
    @IsEmail({}, { message: 'Invalid email' })
    email: string;
    @Min(6, { message: 'Password must be at least 6 characters long' })
    password: string;

    @IsOptional()
    publicKey?: string;
    @IsOptional()
    deviceId?: string;
}
