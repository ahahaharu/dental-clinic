import jwt from 'jsonwebtoken';
import { redisClient } from './redis.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Токен отсутствует' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const session = await redisClient.get(`session:${decoded.id}`);

    if (!session) {
      return res
        .status(401)
        .json({ error: 'Сессия истекла или завершена на другом устройстве' });
    }

    req.user = JSON.parse(session);
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Недействительный токен' });
  }
};
