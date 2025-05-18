import { chunkFileQuery } from '@app/shared';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { WorkflowHandle, Client } from '@temporalio/client';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class FileService {
  constructor(
    @Inject('FILE_SERVICE') private readonly fileClient: ClientProxy,
  ) {}
  public async getFileByKey(fileKey: string, deviceId: string, userId: string) {
    const key = await firstValueFrom(
      this.fileClient
        .send({ cmd: 'file.getKey' }, { fileKey, deviceId, userId })
        .pipe(timeout(1000)),
    );
    return key;
  }
}
