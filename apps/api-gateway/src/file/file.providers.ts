import { Client, Connection } from '@temporalio/client';
import { Provider } from '@nestjs/common';

export const TemporalClientProvider: Provider = {
  provide: Client,
  useFactory: async () => {
    return new Client({
      connection: await Connection.connect({
        address: process.env.TEMPORAL_ADDRESS || 'temporal:7233'
      })
    }); // можно передать options
  },
};
