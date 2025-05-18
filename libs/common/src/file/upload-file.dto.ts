import { IsNotEmpty } from "class-validator";

export class UploadFileDto {
    @IsNotEmpty()
    userId: string
}