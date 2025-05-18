import { Controller, Get } from '@nestjs/common';
import { StorageService } from './storage.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @MessagePattern('storage.write')
  async writeFile(
    @Payload() payload: { path: string; buffer: string },
  ): Promise<{ success: boolean }> {
    await this.storageService.saveFile(payload.path, payload.buffer);
    return { success: true };
  }

  @MessagePattern('storage.read')
  async readFile(@Payload() path: string): Promise<{ buffer: string }> {
    const buffer = await this.storageService.readFile(path);
    return { buffer: buffer.toString('base64') };
  }

  @MessagePattern('storage.delete')
  async deleteFile(@Payload() data: {path: string}): Promise<{success: boolean}>{
    const result = await this.storageService.deleteFile(data.path);
    return {success: result}
  }
}
