import { Client } from '@temporalio/client';
import { Provider } from '@nestjs/common';

export const TemporalClientProvider: Provider = {
  provide: Client,
  useFactory: async () => {
    return new Client(); // можно передать options
  },
};
