// file-upload.workflow.ts
import { proxyActivities } from '@temporalio/workflow';
import type { FileUploadWorkflowParams } from '@app/workflows/types';
import { FileUploadActivities } from '@app/activities';

// Import activities directly
const activities = {
  getBufferSize: (fileKey: string): Promise<number> => {
    throw new Error('Not implemented');
  },
  chunkBuffer: (file: FileUploadWorkflowParams['file'], userId: string, start: number, end: number): Promise<string> => {
    throw new Error('Not implemented');
  },
  compressChunks: (chunkKey: string): Promise<string> => {
    throw new Error('Not implemented');
  },
  cipherChunks: (file: FileUploadWorkflowParams['file'], userId: string): Promise<Uint8Array[]> => {
    throw new Error('Not implemented');
  },
  encryptChunk: (file: FileUploadWorkflowParams['file'], chunkKey: string, sessionKey: Uint8Array, index: number) => {
    throw new Error('Not implemented');
  },
  sendFiles: (file: FileUploadWorkflowParams['file'], userId: string, chunksSize: number): Promise<any> => {
    throw new Error('Not implemented');
  },
};

const fileUploadActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
});
const CHUNK_SIZE = 1024 * 1024; // 512KB chunks
export async function FileUploadWorkflow(params: FileUploadWorkflowParams): Promise<{message: string}> {
  const chunksSize = await fileUploadActivities.getBufferSize(params.file.fileKey);
  const chunks: string[] = [];
  for (let i = 0; i < chunksSize; i += CHUNK_SIZE) {
    chunks.push(await fileUploadActivities.chunkBuffer(params.file, params.userId, i, i+CHUNK_SIZE));
  }
  
  console.log('chunks length:', chunks.length);
  const compressedChunks: string[] = [];
  for (const chunk of chunks) {
    const compressedChunk = await fileUploadActivities.compressChunks(chunk);
    compressedChunks.push(compressedChunk);
  }
  console.log('compressedChunks length:', compressedChunks.length);
  
  const encryptedChunks: Uint8Array[] = [];
  const sessionKeys = await fileUploadActivities.cipherChunks(params.file, params.userId);
  console.log('sessionKeys length:', sessionKeys.length);
  console.log('sessionKeys type:', typeof sessionKeys[0]);
  console.log('sessionKeys buffer:', sessionKeys[0]);
  for (let i = 0; i < compressedChunks.length; i++) {
    await fileUploadActivities.encryptChunk(params.file, compressedChunks[i], sessionKeys[i], i);
  }
  console.log('encryptedChunks length:', encryptedChunks.length);
  await fileUploadActivities.sendFiles(params.file, params.userId, compressedChunks.length);
  return {message: "success"};
}
