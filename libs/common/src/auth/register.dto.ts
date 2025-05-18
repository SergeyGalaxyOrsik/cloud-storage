import { IsEmail, IsString, Min } from "class-validator";

export class RegisterDto {
    @IsEmail({}, { message: 'Invalid email' })
    email: string;
    @Min(6, { message: 'Password must be at least 6 characters long' })
    password: string;
    @IsString({ message: 'Name must be a string' })
    name: string;
    @IsString({ message: 'Surname must be a string' })
    surname: string;
    
}
