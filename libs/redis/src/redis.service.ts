import { Injectable } from '@nestjs/common';
import { createClient } from 'redis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService {
  private client;
  private configService: ConfigService;

  constructor() {
    this.configService = new ConfigService();
    this.client = createClient({ 
      url: this.configService.get('REDIS_URL') || 'redis://localhost:6379'
    });
    this.client.connect();
  }

  async setWithTTL(userId: string, deviceId: string, socketId: string, ttl: number): Promise<void> {
    const key = `presence:${userId}:${deviceId}`;
    console.log(`[Redis] SET ${key} = online (ttl: ${ttl})`);
    await this.client.set(key, 'online', { EX: ttl });

    const keyWs = `ws:${userId}:${deviceId}`;
    await this.client.set(keyWs, socketId, { EX: ttl });
  }

  async isOnline(userId: string, deviceId: string): Promise<boolean> {
    return (await this.client.exists(`presence:${userId}:${deviceId}`)) === 1;
  }

  async getAllOnlineDevices(): Promise<{ userId: string, deviceId: string }[]> {
    // Получаем все ключи с паттерном presence:{userId}:{deviceId}
    const keys = await this.client.keys('presence:*');
  
    const onlineDevices: { userId: string, deviceId: string }[] = [];
  
    for (const key of keys) {
      // Извлекаем userId и deviceId из ключа
      const parts = key.split(':');
      const userId = parts[1];
      const deviceId = parts[2];
  
      // Проверяем, что ключ действительно существует в Redis
      const exists = await this.client.exists(key);
      if (exists === 1) {
        onlineDevices.push({ userId, deviceId });
      }
    }
  
    return onlineDevices;
  }
  

  async saveClientConnection(userId: string, deviceId: string, socketId: string): Promise<void> {
    const key = `ws:${userId}:${deviceId}`;
    await this.client.set(key, socketId); // Сохраняем socketId в Redis
  }

  // Получаем socketId из Redis по userId и deviceId
  async getClientConnection(userId: string, deviceId: string): Promise<string | null> {
    const key = `ws:${userId}:${deviceId}`;
    return await this.client.get(key); // Возвращаем socketId
  }

  // Удаляем WebSocket клиента из Redis
  async removeClientConnection(userId: string, deviceId: string): Promise<void> {
    const key = `ws:${userId}:${deviceId}`;
    await this.client.del(key); // Удаляем запись из Redis
  }

  async setChunk(key: string, encrypted: string): Promise<void> {
    await this.client.set(key, encrypted);
  }

  async getChunk(key: string): Promise<Buffer | null> {
    const chunk = await this.client.get(key);
    if (!chunk) {
      throw new Error('Chunk not found');
    }
    return Buffer.from(chunk, 'base64');
  }

  async deleteChunk(key: string) {
    await this.client.del(key);
  }
}
