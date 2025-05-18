import { IsNotEmpty, IsString } from "class-validator";

export class MakePublicDto {
    @IsNotEmpty()
    @IsString()
    fileId: string
}