// file-upload.workflow.ts
import { proxyActivities } from '@temporalio/workflow';
import type { FileDownloadWorkflowParams } from '@app/workflows/types';
import { FileDownloadActivities } from '@app/activities';

interface DownloadResult {
    message: string;
    chunksCount: number;
}

// Import activities directly
const activities = {
    getChunksInfo: (fileKey: string, userId: string) => {
        throw new Error('Not implemented');
    },
    downloadChunks: (fileKey: string, userId: string, deviceId: string): Promise<DownloadResult> => {
        throw new Error('Not implemented');
    }
};

const fileDownloadActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
});
const CHUNK_SIZE = 512 * 1024; // 512KB chunks

export async function FileDownloadWorkflow(params: FileDownloadWorkflowParams) {
    // 1. Get chunks metadata from database
    const chunksInfo = await fileDownloadActivities.getChunksInfo(params.fileKey, params.userId);
    console.log('Chunks info:', chunksInfo);
    
    // 2. Download all chunks from devices or server and send to websocket server
    const result = await fileDownloadActivities.downloadChunks(
        params.fileKey,
        params.userId,
        params.deviceId
    );
    
    return { 
        message: 'success',
        chunksCount: result.chunksCount 
    };
}
