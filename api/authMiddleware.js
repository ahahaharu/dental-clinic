import jwt from 'jsonwebtoken';
import redisClient from './redis.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: 'Доступ запрещен. Токен не предоставлен.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .json({ message: 'Недействительный или истекший токен.' });
    }

    try {
      const sessionDataStr = await redisClient.get(`session:${decoded.id}`);

      if (!sessionDataStr) {
        return res
          .status(401)
          .json({ message: 'Сессия истекла. Пожалуйста, войдите заново.' });
      }

      req.user = JSON.parse(sessionDataStr);
      next();
    } catch (redisErr) {
      console.error('Ошибка при проверке сессии в Redis:', redisErr);
      return res
        .status(500)
        .json({ message: 'Внутренняя ошибка при проверке сессии.' });
    }
  });
};
