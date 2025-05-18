import { defineQuery } from '@temporalio/workflow';

export const taskQueue = 'nest-test';

export type ChunkFile = { [key: string]: string };

export const chunkFileQuery = defineQuery<ChunkFile | undefined>('chunkFile')
export type chunkFileWorkflowType = () => Promise<void>;