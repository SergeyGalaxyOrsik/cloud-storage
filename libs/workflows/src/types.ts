export interface FileUploadWorkflowParams {
  file: {
    originalname: string;
    mimetype: string;
    size: number;
    fileKey: string;
  };
  userId: string;
} 

export interface FileDownloadWorkflowParams {
  fileKey: string;
  userId: string;
  deviceId: string;
} 