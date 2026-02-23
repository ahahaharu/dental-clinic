import { createClient } from 'redis';

const redisClient = createClient({
  url: 'redis://127.0.0.1:6379',
});

redisClient.on('error', (err) =>
  console.log('Ошибка подключения к Redis:', err)
);
redisClient.on('connect', () => console.log('Успешное подключение к Redis!'));

await redisClient.connect();

export default redisClient;
