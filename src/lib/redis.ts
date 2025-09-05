import Redis from 'ioredis';

declare global {
  var __redis_pub: Redis | undefined;
  var __redis_sub: Redis | undefined;
}

let pubClient: Redis;
let subClient: Redis;

if (process.env.NODE_ENV === 'production') {
  pubClient = new Redis(process.env.REDIS_URL!);
  subClient = new Redis(process.env.REDIS_URL!);
} else {
  // In development, use globalThis to persist connections across hot reloads
  if (!globalThis.__redis_pub) {
    globalThis.__redis_pub = new Redis(process.env.REDIS_URL!);
  }
  if (!globalThis.__redis_sub) {
    globalThis.__redis_sub = new Redis(process.env.REDIS_URL!);
  }
  
  pubClient = globalThis.__redis_pub;
  subClient = globalThis.__redis_sub;
}

// Error handling
pubClient.on('error', (err) => {
  console.error('Redis pub client error:', err);
});

subClient.on('error', (err) => {
  console.error('Redis sub client error:', err);
});

pubClient.on('connect', () => {
  console.log('Redis pub client connected');
});

subClient.on('connect', () => {
  console.log('Redis sub client connected');
});

export { pubClient, subClient };
