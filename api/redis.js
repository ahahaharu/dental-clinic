import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URI || 'redis://127.0.0.1:6379',
});

const redisSubscriber = redisClient.duplicate();

redisClient.on('error', (err) => console.log('[Redis] Ошибка клиента:', err));
redisSubscriber.on('error', (err) =>
  console.log('[Redis] Ошибка подписчика:', err)
);

await redisClient.connect();
await redisSubscriber.connect();

console.log('Успешное подключение к Redis (Кэш + Pub/Sub готовы)!');

export { redisClient, redisSubscriber };
