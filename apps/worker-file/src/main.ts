// file-upload.worker.ts
import { NativeConnection, Worker } from '@temporalio/worker';
import { activities } from '@app/activities/file-upload-activities/file-upload.activities';
import * as path from "path";
import { AppDataSource } from '@app/activities/database/data-source';
import * as dotenv from 'dotenv';
dotenv.config();

const workflowsPath = path.resolve(__dirname, '../../../libs/workflows/src/file-upload.workflow.ts');

async function run() {
  try {
    // Initialize the database connection
    await AppDataSource.initialize();
    console.log('Database connection initialized');

    const worker = await Worker.create({
      workflowsPath,
      activities,
      taskQueue: 'file-upload',
      connection: await NativeConnection.connect({
        address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
      }),
    });

    console.log('Starting worker...');
    await worker.run();
  } catch (error) {
    console.error('Failed to start worker:', error);
    throw error;
  }
}

run().catch((err) => {
  console.error('Error running worker:', err);
  process.exit(1);
});
