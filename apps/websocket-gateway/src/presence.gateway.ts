// ws/ws.gateway.ts
import { Controller, Injectable, OnModuleInit } from '@nestjs/common';
import { RedisService } from '@app/redis/redis.service';
import * as http from 'http';
import * as WebSocket from 'ws';
import { EventPattern, Payload } from '@nestjs/microservices';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';

@Controller()
export class WsGateway {
  private wss: WebSocket.Server;
  private clients = new Map<string, WebSocket>();
  private readonly port: number;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService
  ) {
    const configPort = this.configService.get<string>('WEBSOCKET_PORT');
    this.port = configPort ? parseInt(configPort, 10) : 3006;
  }

  init(server: http.Server) { 
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws) => {
      console.log('Client connected');

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          const { userId, deviceId } = data;

          const clientKey = `${userId}:${deviceId}`;
          this.clients.set(clientKey, ws);

          if (data.type === 'heartbeat') {
            await this.redisService.setWithTTL(userId, deviceId, clientKey, 100);
          }
        } catch (e) {
          console.error('Invalid message:', e);
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
        // Clean-up (optional)
        for (const [key, client] of this.clients.entries()) {
          if (client === ws) {
            this.clients.delete(key);
            const [userId, deviceId] = key.split(':');
            this.redisService.removeClientConnection(userId, deviceId);
          }
        }
      });
    });

    server.listen(this.port, () => {
      console.log(`WS server running at ws://localhost:${this.port}`);
    });
  }

  @EventPattern('chunk')
  async handleChunk(@Payload() data: {
    buffer: Buffer | any,
    chunkId: string,
    deviceId: string,
    userId: string,
    isDownload?: boolean,
  }) {
    const { buffer, chunkId, deviceId, userId, isDownload } = data;
    const key = `${userId}:${deviceId}`;
    const client = this.clients.get(key);
    console.log('Received chunk for client:', key);
    
    // Ensure buffer is handled correctly regardless of its type
    let base64Buffer: string;
    if (Buffer.isBuffer(buffer)) {
      base64Buffer = buffer.toString('base64');
    } else if (typeof buffer === 'string') {
      // Already a base64 string
      base64Buffer = buffer;
    } else if (buffer && typeof buffer === 'object') {
      // Log the issue but try to continue by requesting the chunk directly
      console.warn(`Received object instead of buffer for chunk ${chunkId}. Object keys: ${Object.keys(buffer).join(', ')}`);
      
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'requestBinaryChunk',
          chunkId,
          isDownload: !!isDownload,
        }));
        console.log(`Requesting binary chunk directly for ${chunkId}`);
      }
      return;
    } else {
      console.error(`Invalid buffer for chunk ${chunkId}. Type: ${typeof buffer}`);
      return;
    }
    
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'chunk',
        buffer: base64Buffer,
        chunkId,
        isDownload: !!isDownload,
      }));
    } else {
      console.log('Client not found or not connected:', key);
    }
  }

  @EventPattern('requestChunk')
  async handleRequestChunk(@Payload() data: {
    chunkId: string,
    sourceDeviceId: string,
    sourceUserId: string,
    targetDeviceId: string,
    targetUserId: string,
    fileKey: string,
  }) {
    const { chunkId, sourceDeviceId, sourceUserId, targetDeviceId, targetUserId, fileKey } = data;
    const sourceKey = `${sourceUserId}:${sourceDeviceId}`;
    const sourceClient = this.clients.get(sourceKey);
    
    console.log(`Requesting chunk ${chunkId} from client:`, sourceKey);
    
    if (sourceClient && sourceClient.readyState === WebSocket.OPEN) {
      // Request the chunk from the source device
      sourceClient.send(JSON.stringify({
        type: 'fetchChunk',
        chunkId,
        targetDeviceId,
        targetUserId,
        fileKey,
      }));
      console.log(`Fetch chunk request sent to source device: ${sourceDeviceId}`);
    } else {
      console.log(`Source client not found or not connected: ${sourceKey}`);
      
      // Fallback logic if the source device is not available
      try {
        // Try to check if the chunk is available on the server
        const STORAGE_ROOT = path.resolve(__dirname, '../../..', 'libs/activities/src/uploads');
        const chunkPath = path.join(STORAGE_ROOT, chunkId);
        
        try {
          const chunkBuffer = await fs.readFile(chunkPath);
          
          // If we found the chunk on the server, forward it to the target device
          const targetKey = `${targetUserId}:${targetDeviceId}`;
          const targetClient = this.clients.get(targetKey);
          
          if (targetClient && targetClient.readyState === WebSocket.OPEN) {
            targetClient.send(JSON.stringify({
              type: 'chunk',
              buffer: chunkBuffer.toString('base64'),
              chunkId,
              isDownload: true,
            }));
            console.log(`Server chunk sent to target device: ${targetDeviceId}`);
          } else {
            console.log(`Target client not found or not connected: ${targetKey}`);
          }
        } catch (err) {
          console.error(`Failed to read chunk from server: ${err.message}`);
          // No fallback available
        }
      } catch (error) {
        console.error(`Error in requestChunk fallback: ${error.message}`);
      }
    }
  }
}
