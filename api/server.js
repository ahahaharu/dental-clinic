import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import db from './db.js';
import { redisClient, redisSubscriber } from './redis.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticateToken } from './authMiddleware.js';
import Log, { connectMongo } from './mongo.js';

connectMongo();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

redisSubscriber.subscribe('system_events', (message) => {
  try {
    const event = JSON.parse(message);

    if (event.origin_pid === process.pid) {
      return;
    }

    console.log(`[Pub/Sub] Инстанс ${process.pid} получил событие:`, event);
  } catch (err) {
    console.error('Ошибка обработки Pub/Sub сообщения:', err);
  }
});

const clearCache = async (pattern, entityName = 'Data') => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`[Cache] Инвалидация кэша для ключей: ${keys.join(', ')}`);
    }

    const eventPayload = {
      action: 'DATA_UPDATED',
      entity: entityName,
      timestamp: new Date().toISOString(),
      origin_pid: process.pid,
    };

    await redisClient.publish('system_events', JSON.stringify(eventPayload));
  } catch (err) {
    console.error('[Cache] Ошибка при очистке кэша/публикации:', err);
  }
};

const writeLog = async (data) => {
  try {
    await Log.create({
      timestamp: new Date(),
      ...data,
    });
  } catch (err) {
    console.error('[MongoLog] Ошибка записи лога:', err);
  }
};

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const isBlocked = await redisClient.get(`blacklist:${username}`);
    if (isBlocked) {
      const ttl = await redisClient.ttl(`blacklist:${username}`);
      return res.status(403).json({
        message: `Пользователь заблокирован. Попробуйте через ${Math.ceil(
          ttl / 60
        )} мин.`,
      });
    }

    const [users] = await db.query('SELECT * FROM User WHERE username = ?', [
      username,
    ]);
    if (users.length === 0) {
      return res
        .status(401)
        .json({ message: 'Неверное имя пользователя или пароль' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      const attemptsKey = `attempts:${username}`;
      const attempts = await redisClient.incr(attemptsKey);
      if (attempts === 1) await redisClient.expire(attemptsKey, 600);

      if (attempts >= 3) {
        await redisClient.setEx(`blacklist:${username}`, 600, 'blocked');
        await redisClient.del(attemptsKey);

        await writeLog({
          level: 'warn',
          action_type: 'AUTH_BLOCK',
          username,
          details: 'User blocked after 3 failed attempts',
        });

        return res
          .status(403)
          .json({ message: 'Аккаунт заблокирован на 10 минут.' });
      }
      return res.status(401).json({
        message: `Неверный пароль. Попыток осталось: ${3 - attempts}`,
      });
    }

    await redisClient.del(`attempts:${username}`);

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '8h',
    });

    const sessionData = {
      id: user.id,
      username: user.username,
      role: user.role,
      login_time: new Date().toISOString(),
    };

    await redisClient.setEx(
      `session:${user.id}`,
      28800,
      JSON.stringify(sessionData)
    );

    await writeLog({
      action_type: 'LOGIN',
      username: user.username,
      details: 'Успешный вход в систему',
    });

    res.json({ token, user: sessionData });
  } catch (error) {
    console.error('[Login] Ошибка:', error);
    res.status(500).json({ message: 'Ошибка сервера при входе' });
  }
});

app.post('/api/logout', async (req, res) => {
  const { userId } = req.body;
  try {
    if (userId) {
      const sessionData = await redisClient.get(`session:${userId}`);
      let username = 'unknown';

      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        username = parsed.username;
      }

      await redisClient.del(`session:${userId}`);
      console.log(
        `[Session] Сессия пользователя ${username} (ID: ${userId}) уничтожена`
      );

      await writeLog({
        action_type: 'LOGOUT',
        user_id: userId,
        username: username,
        details: 'Пользователь вышел из системы',
      });
    }
    res.json({ message: 'Успешный выход' });
  } catch (error) {
    console.error('Ошибка при выходе:', error);
    res.status(500).json({ error: 'Ошибка при выходе' });
  }
});

app.get('/api/logs', authenticateToken, async (req, res) => {
  const { startDate, endDate, user, type, level } = req.query;
  let filter = {};

  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }

  if (type) filter.action_type = type;

  if (level) filter.level = level;

  if (user) filter.username = new RegExp(user, 'i');

  try {
    const logs = await Log.find(filter).sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use('/api', authenticateToken);

app.get('/api/patients', async (req, res) => {
  const { search } = req.query;
  const cacheKey = search
    ? `cache:patients:search:${search}`
    : 'cache:patients:all';

  try {
    await writeLog({
      action_type: 'SELECT',
      table_name: 'Patient',
      username: req.user?.username,
      details: search
        ? `Поиск пациентов по запросу: ${search}`
        : 'Получение полного списка пациентов',
    });

    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    let query = 'SELECT * FROM Patient';
    let params = [];
    if (search) {
      query +=
        ' WHERE last_name LIKE ? OR first_name LIKE ? OR phone_number LIKE ?';
      params = [`%${search}%`, `%${search}%`, `%${search}%`];
    }
    query += ' ORDER BY id DESC';
    const [rows] = await db.query(query, params);

    await redisClient.setEx(cacheKey, 3600, JSON.stringify(rows));
    res.json(rows);
  } catch (error) {
    await writeLog({
      level: 'error',
      action_type: 'APP_ERROR',
      username: req.user?.username,
      details: { message: error.message, path: '/api/patients (GET)' },
    });
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/patients', async (req, res) => {
  const {
    first_name,
    last_name,
    birth_date,
    gender,
    Address,
    phone_number,
    email,
  } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO Patient (first_name, last_name, birth_date, gender, Address, phone_number, email) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, birth_date, gender, Address, phone_number, email]
    );

    await writeLog({
      action_type: 'INSERT',
      table_name: 'Patient',
      record_id: result.insertId,
      username: req.user.username,
      details: `Добавлен новый пациент: ${first_name} ${last_name}`,
    });

    await clearCache('cache:patients*', 'Patient');
    await clearCache('cache:dashboard_stats', 'DashboardStats');

    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    await writeLog({
      level: 'error',
      action_type: 'APP_ERROR',
      username: req.user?.username,
      details: { message: error.message, path: '/api/patients (POST)' },
    });
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/patients/:id', async (req, res) => {
  const { id } = req.params;
  const {
    first_name,
    last_name,
    birth_date,
    gender,
    Address,
    phone_number,
    email,
  } = req.body;
  try {
    await db.query(
      `UPDATE Patient SET first_name=?, last_name=?, birth_date=?, gender=?, Address=?, phone_number=?, email=? WHERE id=?`,
      [
        first_name,
        last_name,
        birth_date,
        gender,
        Address,
        phone_number,
        email,
        id,
      ]
    );

    await writeLog({
      action_type: 'UPDATE',
      table_name: 'Patient',
      record_id: id,
      username: req.user.username,
      details: `Обновлена иформация пользователя с ID: ${id} (${last_name})`,
    });

    await clearCache('cache:patients*', 'Patient');
    res.json({ message: 'Данные обновлены', id });
  } catch (error) {
    await writeLog({
      level: 'error',
      action_type: 'APP_ERROR',
      username: req.user?.username,
      details: { message: error.message, path: `/api/patients/${id} (PUT)` },
    });
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/patients/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM Patient WHERE id = ?', [id]);

    await writeLog({
      action_type: 'DELETE',
      table_name: 'Patient',
      record_id: id,
      username: req.user.username,
      details: `Удалён пациент с ID: ${id}`,
    });

    await clearCache('cache:patients*', 'Patient');
    await clearCache('cache:dashboard_stats', 'DashboardStats');

    res.json({ message: 'Пациент удален' });
  } catch (error) {
    await writeLog({
      level: 'error',
      action_type: 'APP_ERROR',
      username: req.user?.username,
      details: { message: error.message, path: `/api/patients/${id} (DELETE)` },
    });
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/patients/:id/record', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM Medical_Record WHERE patient_id = ?',
      [req.params.id]
    );
    res.json(rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/patients/:id/record', async (req, res) => {
  const { id } = req.params;
  const { diagnosis, allergies } = req.body;
  try {
    const [existing] = await db.query(
      'SELECT id FROM Medical_Record WHERE patient_id = ?',
      [id]
    );
    if (existing.length > 0) {
      await db.query(
        'UPDATE Medical_Record SET diagnosis = ?, allergies = ? WHERE patient_id = ?',
        [diagnosis, allergies, id]
      );
      res.json({ message: 'Карта обновлена' });
    } else {
      await db.query(
        'INSERT INTO Medical_Record (patient_id, diagnosis, allergies) VALUES (?, ?, ?)',
        [id, diagnosis, allergies]
      );
      res.json({ message: 'Карта создана' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dentists', async (req, res) => {
  const { search } = req.query;
  const cacheKey = search
    ? `cache:dentists:search:${search}`
    : 'cache:dentists:all';

  try {
    await writeLog({
      action_type: 'SELECT',
      table_name: 'Dentist',
      username: req.user?.username,
      details: search
        ? `Поиск стоматологов по запросу: "${search}"`
        : 'Получение полного списка стоматологов',
    });

    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    let query = 'SELECT * FROM Dentist';
    let params = [];
    if (search) {
      query += ' WHERE last_name LIKE ? OR specialization LIKE ?';
      params = [`%${search}%`, `%${search}%`];
    }
    const [rows] = await db.query(query, params);

    await redisClient.setEx(cacheKey, 3600, JSON.stringify(rows));
    res.json(rows);
  } catch (error) {
    await writeLog({
      level: 'error',
      action_type: 'APP_ERROR',
      username: req.user?.username,
      details: { сообщение: error.message, путь: '/api/dentists (GET)' },
    });
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/dentists', async (req, res) => {
  const {
    first_name,
    last_name,
    specialization,
    experience,
    license_number,
    schedule,
  } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO Dentist (first_name, last_name, specialization, experience, license_number, schedule) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        first_name,
        last_name,
        specialization,
        experience,
        license_number,
        schedule,
      ]
    );

    await writeLog({
      action_type: 'INSERT',
      table_name: 'Dentist',
      record_id: result.insertId,
      username: req.user.username,
      details: `Добавлен новый стоматолог: ${last_name} (Специализация: ${specialization})`,
    });

    await clearCache('cache:dentists*', 'Dentist');
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    await writeLog({
      level: 'error',
      action_type: 'APP_ERROR',
      username: req.user?.username,
      details: { сообщение: error.message, данные: req.body },
    });
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/dentists/:id', async (req, res) => {
  const { id } = req.params;
  const {
    first_name,
    last_name,
    specialization,
    experience,
    license_number,
    schedule,
  } = req.body;
  try {
    await db.query(
      `UPDATE Dentist SET first_name=?, last_name=?, specialization=?, experience=?, license_number=?, schedule=? WHERE id=?`,
      [
        first_name,
        last_name,
        specialization,
        experience,
        license_number,
        schedule,
        id,
      ]
    );

    await writeLog({
      action_type: 'UPDATE',
      table_name: 'Dentist',
      record_id: id,
      username: req.user.username,
      details: `Обновлена информация о стоматологе ID: ${id} (${last_name})`,
    });

    await clearCache('cache:dentists*', 'Dentist');
    res.json({ message: 'Стоматолог обновлен' });
  } catch (error) {
    await writeLog({
      level: 'error',
      action_type: 'APP_ERROR',
      username: req.user?.username,
      details: { сообщение: error.message, record_id: id },
    });
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/dentists/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM Dentist WHERE id = ?', [id]);

    await writeLog({
      action_type: 'DELETE',
      table_name: 'Dentist',
      record_id: id,
      username: req.user.username,
      details: `Успешное удаление стоматолога ID: ${id}`,
    });

    await clearCache('cache:dentists*', 'Dentist');
    res.json({ message: 'Стоматолог удален' });
  } catch (error) {
    if (error.errno === 1451) {
      await writeLog({
        level: 'warn',
        action_type: 'DELETE_ERROR',
        username: req.user.username,
        details: `Ошибка удаления стоматолога ID: ${id}. Причина: наличие связанных записей (приемов).`,
      });
      return res
        .status(400)
        .json({ error: 'Нельзя удалить врача: у него есть приемы' });
    }

    await writeLog({
      level: 'error',
      action_type: 'APP_ERROR',
      username: req.user?.username,
      details: { сообщение: error.message, record_id: id },
    });
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/assistants', async (req, res) => {
  try {
    await writeLog({
      action_type: 'SELECT',
      table_name: 'Assistant',
      username: req.user?.username,
      details: 'Получение полного списка ассистентов',
    });

    const cachedData = await redisClient.get('cache:assistants');
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    const [rows] = await db.query('SELECT * FROM Assistant');

    await redisClient.setEx('cache:assistants', 3600, JSON.stringify(rows));
    res.json(rows);
  } catch (error) {
    await writeLog({
      level: 'error',
      action_type: 'APP_ERROR',
      username: req.user?.username,
      details: { сообщение: error.message, путь: '/api/assistants (GET)' },
    });
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/assistants', async (req, res) => {
  const { first_name, last_name, position, experience } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO Assistant (first_name, last_name, position, experience) VALUES (?, ?, ?, ?)`,
      [first_name, last_name, position, experience]
    );

    await writeLog({
      action_type: 'INSERT',
      table_name: 'Assistant',
      record_id: result.insertId,
      username: req.user.username,
      details: `Добавлен новый ассистент: ${last_name} (Должность: ${position})`,
    });

    await clearCache('cache:assistants', 'Assistant');
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    await writeLog({
      level: 'error',
      action_type: 'APP_ERROR',
      username: req.user?.username,
      details: { сообщение: error.message, данные: req.body },
    });
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/assistants/:id', async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, position, experience } = req.body;
  try {
    await db.query(
      `UPDATE Assistant SET first_name=?, last_name=?, position=?, experience=? WHERE id=?`,
      [first_name, last_name, position, experience, id]
    );

    await writeLog({
      action_type: 'UPDATE',
      table_name: 'Assistant',
      record_id: id,
      username: req.user.username,
      details: `Обновлена информация об ассистенте ID: ${id} (${last_name})`,
    });

    await clearCache('cache:assistants', 'Assistant');
    res.json({ message: 'Ассистент обновлен' });
  } catch (error) {
    await writeLog({
      level: 'error',
      action_type: 'APP_ERROR',
      username: req.user?.username,
      details: { сообщение: error.message, record_id: id },
    });
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/assistants/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM Assistant WHERE id = ?', [id]);

    await writeLog({
      action_type: 'DELETE',
      table_name: 'Assistant',
      record_id: id,
      username: req.user.username,
      details: `Успешное удаление ассистента ID: ${id}`,
    });

    await clearCache('cache:assistants', 'Assistant');
    res.json({ message: 'Ассистент удален' });
  } catch (error) {
    if (error.errno === 1451) {
      await writeLog({
        level: 'warn',
        action_type: 'DELETE_ERROR',
        username: req.user.username,
        details: `Ошибка удаления ассистента ID: ${id}. Причина: ассистент назначен на приемы.`,
      });
      return res
        .status(400)
        .json({ error: 'Нельзя удалить: ассистент назначен на приемы.' });
    }

    await writeLog({
      level: 'error',
      action_type: 'APP_ERROR',
      username: req.user?.username,
      details: { сообщение: error.message, record_id: id },
    });
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/materials', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM Material ORDER BY expiration_date ASC'
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/materials', async (req, res) => {
  const { name, quantity, expiration_date } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO Material (name, quantity, expiration_date) VALUES (?, ?, ?)',
      [name, quantity, expiration_date]
    );
    await clearCache('cache:dashboard_stats', 'DashboardStats');
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/materials/:id', async (req, res) => {
  const { id } = req.params;
  const { name, quantity, expiration_date } = req.body;
  try {
    await db.query(
      'UPDATE Material SET name=?, quantity=?, expiration_date=? WHERE id=?',
      [name, quantity, expiration_date, id]
    );
    await clearCache('cache:dashboard_stats', 'DashboardStats');
    res.json({ message: 'Материал обновлен' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/materials/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM Material WHERE id=?', [req.params.id]);
    await clearCache('cache:dashboard_stats', 'DashboardStats');
    res.json({ message: 'Материал удален' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/equipment', async (req, res) => {
  try {
    const query = `SELECT e.*, r.number as room_number FROM Equipment e JOIN Room r ON e.room_id = r.id`;
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/equipment', async (req, res) => {
  const { name, serial_number, date_of_purchase, status, room_id } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO Equipment (name, serial_number, date_of_purchase, status, room_id) VALUES (?, ?, ?, ?, ?)`,
      [name, serial_number, date_of_purchase, status, room_id]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/equipment/:id', async (req, res) => {
  const { id } = req.params;
  const { name, serial_number, date_of_purchase, status, room_id } = req.body;
  try {
    await db.query(
      `UPDATE Equipment SET name=?, serial_number=?, date_of_purchase=?, status=?, room_id=? WHERE id=?`,
      [name, serial_number, date_of_purchase, status, room_id, id]
    );
    res.json({ message: 'Оборудование обновлено' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/equipment/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM Equipment WHERE id=?', [req.params.id]);
    res.json({ message: 'Оборудование удалено' });
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Нельзя удалить: оборудование используется' });
  }
});

app.get('/api/rooms', async (req, res) => {
  try {
    const cachedData = await redisClient.get('cache:rooms');
    if (cachedData) {
      console.log('[Cache] Возвращаем кабинеты из кэша');
      return res.json(JSON.parse(cachedData));
    }

    const [rows] = await db.query('SELECT * FROM Room');
    await redisClient.setEx('cache:rooms', 86400, JSON.stringify(rows));
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/treatments', async (req, res) => {
  const { search } = req.query;
  const cacheKey = search
    ? `cache:treatments:search:${search}`
    : 'cache:treatments:all';

  try {
    await writeLog({
      action_type: 'SELECT',
      table_name: 'Treatment',
      username: req.user?.username,
      details: search
        ? `Поиск услуг в прайс-листе по запросу: "${search}"`
        : 'Запрос полного прайс-листа услуг',
    });

    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) return res.json(JSON.parse(cachedData));

    let query = 'SELECT * FROM Treatment';
    let params = [];
    if (search) {
      query += ' WHERE name LIKE ?';
      params = [`%${search}%`];
    }
    const [rows] = await db.query(query + ' ORDER BY name ASC', params);

    await redisClient.setEx(cacheKey, 3600, JSON.stringify(rows));
    res.json(rows);
  } catch (error) {
    await writeLog({
      level: 'error',
      action_type: 'APP_ERROR',
      username: req.user?.username,
      details: { ошибка: error.message, путь: '/api/treatments' },
    });
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/treatments/:id', async (req, res) => {
  const { id } = req.params;
  const cacheKey = `cache:treatments:detail:${id}`;

  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) return res.json(JSON.parse(cachedData));

    const [tRows] = await db.query('SELECT * FROM Treatment WHERE id = ?', [
      id,
    ]);
    if (tRows.length === 0)
      return res.status(404).json({ message: 'Нет такой услуги' });

    const treatment = tRows[0];
    const [mRows] = await db.query(
      `SELECT material_id, quantity_needed FROM Treatment_Material WHERE treatment_id = ?`,
      [id]
    );
    const [eRows] = await db.query(
      `SELECT equipment_id FROM Treatment_Equipment WHERE treatment_id = ?`,
      [id]
    );

    treatment.materials = mRows.map((m) => ({
      id: m.material_id,
      quantity: m.quantity_needed,
    }));
    treatment.equipment = eRows.map((e) => e.equipment_id);

    await writeLog({
      action_type: 'SELECT',
      table_name: 'Treatment',
      username: req.user?.username,
      details: `Просмотр технологической карты услуги ID: ${id} (${treatment.name})`,
    });

    await redisClient.setEx(cacheKey, 3600, JSON.stringify(treatment));
    res.json(treatment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/treatments', async (req, res) => {
  const { name, description, duration, cost, materials, equipment } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [resInsert] = await connection.query(
      'INSERT INTO Treatment (name, description, duration, cost) VALUES (?, ?, ?, ?)',
      [name, description, duration, cost]
    );
    const newId = resInsert.insertId;

    if (materials && materials.length > 0) {
      const matValues = materials.map((m) => [newId, m.id, m.quantity]);
      await connection.query(
        'INSERT INTO Treatment_Material (treatment_id, material_id, quantity_needed) VALUES ?',
        [matValues]
      );
    }
    if (equipment && equipment.length > 0) {
      const equipValues = equipment.map((eId) => [newId, eId]);
      await connection.query(
        'INSERT INTO Treatment_Equipment (treatment_id, equipment_id) VALUES ?',
        [equipValues]
      );
    }

    await connection.commit();

    await writeLog({
      action_type: 'INSERT',
      table_name: 'Treatment',
      record_id: newId,
      username: req.user.username,
      details: `Добавлена новая услуга: ${name} (Стоимость: ${cost} BYN, Длительность: ${duration} мин.)`,
    });

    await clearCache('cache:treatments*', 'Treatment');
    res.status(201).json({ message: 'Услуга создана' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

app.put('/api/treatments/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, duration, cost, materials, equipment } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      'UPDATE Treatment SET name=?, description=?, duration=?, cost=? WHERE id=?',
      [name, description, duration, cost, id]
    );
    await connection.query(
      'DELETE FROM Treatment_Material WHERE treatment_id = ?',
      [id]
    );

    if (materials && materials.length > 0) {
      const matValues = materials.map((m) => [id, m.id, m.quantity]);
      await connection.query(
        'INSERT INTO Treatment_Material (treatment_id, material_id, quantity_needed) VALUES ?',
        [matValues]
      );
    }

    await connection.query(
      'DELETE FROM Treatment_Equipment WHERE treatment_id = ?',
      [id]
    );
    if (equipment && equipment.length > 0) {
      const equipValues = equipment.map((eId) => [id, eId]);
      await connection.query(
        'INSERT INTO Treatment_Equipment (treatment_id, equipment_id) VALUES ?',
        [equipValues]
      );
    }

    await connection.commit();

    await writeLog({
      action_type: 'UPDATE',
      table_name: 'Treatment',
      record_id: id,
      username: req.user.username,
      details: `Обновлены данные услуги ID: ${id} (${name})`,
    });

    await clearCache('cache:treatments*', 'Treatment');
    res.json({ message: 'Услуга обновлена' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

app.delete('/api/treatments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM Treatment WHERE id = ?', [id]);

    await writeLog({
      action_type: 'DELETE',
      table_name: 'Treatment',
      record_id: id,
      username: req.user.username,
      details: `Удаление услуги ID: ${id} из прайс-листа`,
    });

    await clearCache('cache:treatments*', 'Treatment');
    res.json({ message: 'Услуга удалена' });
  } catch (error) {
    if (error.errno === 1451) {
      await writeLog({
        level: 'warn',
        action_type: 'DELETE_ERROR',
        username: req.user.username,
        details: `Не удалось удалить услугу ID: ${id}. Причина: услуга фигурирует в истории приемов пациентов.`,
      });
      return res
        .status(400)
        .json({ error: 'Нельзя удалить: эта услуга используется в приемах.' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/appointments', async (req, res) => {
  try {
    const query = `
      SELECT a.id, a.date_time, a.status, 
             p.last_name as p_last, p.first_name as p_first,
             d.last_name as d_last, d.specialization, r.number as room_number
      FROM Appointment a
      JOIN Patient p ON a.patient_id = p.id
      JOIN Dentist d ON a.dentist_id = d.id
      JOIN Room r ON a.room_id = r.id
      ORDER BY a.date_time ASC
    `;
    const [rows] = await db.query(query);

    await writeLog({
      action_type: 'SELECT',
      table_name: 'Appointment',
      username: req.user?.username,
      details: 'Запрос общего расписания приемов',
    });

    res.json(rows);
  } catch (error) {
    await writeLog({
      level: 'error',
      action_type: 'APP_ERROR',
      username: req.user?.username,
      details: { сообщение: error.message, путь: '/api/appointments (GET)' },
    });
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/appointments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [appointmentRows] = await db.query(
      `SELECT a.*, p.last_name as p_last, p.first_name as p_first, d.last_name as d_last, d.specialization
       FROM Appointment a JOIN Patient p ON a.patient_id = p.id JOIN Dentist d ON a.dentist_id = d.id WHERE a.id = ?`,
      [id]
    );

    if (appointmentRows.length === 0)
      return res.status(404).json({ message: 'Прием не найден' });

    const [treatmentRows] = await db.query(
      `SELECT t.id, t.name, t.cost, at.quantity
       FROM Appointment_Treatment at JOIN Treatment t ON at.treatment_id = t.id WHERE at.appointment_id = ?`,
      [id]
    );

    await writeLog({
      action_type: 'SELECT',
      table_name: 'Appointment',
      username: req.user?.username,
      details: `Просмотр карточки приема ID: ${id}`,
    });

    res.json({ ...appointmentRows[0], treatments: treatmentRows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/appointments', async (req, res) => {
  const { date_time, patient_id, dentist_id, assistant_id, room_id } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO Appointment (date_time, status, patient_id, dentist_id, assistant_id, room_id) VALUES (?, 'scheduled', ?, ?, ?, ?)`,
      [date_time, patient_id, dentist_id, assistant_id || null, room_id]
    );

    await writeLog({
      action_type: 'INSERT',
      table_name: 'Appointment',
      record_id: result.insertId,
      username: req.user.username,
      details: `Запланирован новый прием для пациента ID: ${patient_id} на дату: ${date_time}`,
    });

    await clearCache('cache:dashboard_stats', 'DashboardStats');
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    await writeLog({
      level: 'error',
      action_type: 'APP_ERROR',
      username: req.user?.username,
      details: {
        сообщение: error.message,
        действие: 'Ошибка при создании записи на прием',
      },
    });
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/appointments/:id', async (req, res) => {
  const { id } = req.params;
  const { status, treatments } = req.body;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query('UPDATE Appointment SET status = ? WHERE id = ?', [
      status,
      id,
    ]);

    if (status === 'completed' && Array.isArray(treatments)) {
      await connection.query(
        'DELETE FROM Appointment_Treatment WHERE appointment_id = ?',
        [id]
      );
      if (treatments.length > 0) {
        const values = treatments.map((tId) => [id, tId, 1]);
        await connection.query(
          'INSERT INTO Appointment_Treatment (appointment_id, treatment_id, quantity) VALUES ?',
          [values]
        );
      }
    }

    await connection.commit();

    await writeLog({
      action_type: 'UPDATE',
      table_name: 'Appointment',
      record_id: id,
      username: req.user.username,
      details: `Обновлен статус приема ID: ${id} на "${status}". Кол-во оказанных услуг: ${
        treatments?.length || 0
      }`,
    });

    await clearCache('cache:dashboard_stats', 'DashboardStats');
    res.json({ message: 'Прием успешно сохранен' });
  } catch (error) {
    await connection.rollback();
    await writeLog({
      level: 'error',
      action_type: 'APP_ERROR',
      username: req.user?.username,
      details: {
        сообщение: error.message,
        appointment_id: id,
        действие: 'Ошибка транзакции (MySQL) при обновлении приема',
      },
    });
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    await writeLog({
      action_type: 'SELECT',
      table_name: 'Сводная статистика (Dashboard)',
      username: req.user?.username,
      details:
        'Генерация комплексного отчета аналитики клиники (пациенты, выручка, записи, склад)',
    });

    const cachedData = await redisClient.get('cache:dashboard_stats');
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    const connection = await db.getConnection();

    const [patients] = await connection.query(
      'SELECT COUNT(*) as count FROM Patient'
    );

    const [appointmentsToday] = await connection.query(
      'SELECT COUNT(*) as count FROM Appointment WHERE DATE(date_time) = CURDATE()'
    );

    const [revenue] = await connection.query(`
      SELECT SUM(t.cost * at.quantity) as total 
      FROM Appointment a 
      JOIN Appointment_Treatment at ON a.id = at.appointment_id 
      JOIN Treatment t ON at.treatment_id = t.id
      WHERE a.status = 'completed' 
      AND MONTH(a.date_time) = MONTH(CURRENT_DATE()) 
      AND YEAR(a.date_time) = YEAR(CURRENT_DATE())
    `);

    const [topTreatment] = await connection.query(`
      SELECT t.name, COUNT(at.treatment_id) as usage_count 
      FROM Appointment_Treatment at 
      JOIN Treatment t ON at.treatment_id = t.id 
      GROUP BY t.id, t.name 
      ORDER BY usage_count DESC LIMIT 1
    `);

    const [lowStock] = await connection.query(
      'SELECT COUNT(*) as count FROM Material WHERE quantity < 10'
    );

    connection.release();

    const stats = {
      patientsCount: patients[0].count,
      appointmentsToday: appointmentsToday[0].count,
      monthlyRevenue: revenue[0].total || 0,
      topTreatment: topTreatment[0] ? topTreatment[0].name : 'Нет данных',
      lowStockCount: lowStock[0].count,
    };

    await redisClient.setEx(
      'cache:dashboard_stats',
      300,
      JSON.stringify(stats)
    );

    res.json(stats);
  } catch (error) {
    await writeLog({
      level: 'error',
      action_type: 'APP_ERROR',
      username: req.user?.username,
      details: {
        сообщение: 'Сбой при формировании статистики дашборда',
        ошибка: error.message,
        путь: '/api/dashboard/stats',
      },
    });
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/logs/stats', authenticateToken, async (req, res) => {
  const { period = 'month' } = req.query;

  try {
    let lookbackDays = 30;
    let dateFormat = '%Y-%m-%d';

    if (period === 'day') {
      lookbackDays = 1;
      dateFormat = '%H:00';
    } else if (period === 'week') {
      lookbackDays = 7;
      dateFormat = '%Y-%m-%d';
    } else if (period === 'month') {
      lookbackDays = 30;
      dateFormat = '%Y-%m-%d';
    }

    const startDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    const timeFilter = { $match: { timestamp: { $gte: startDate } } };

    const topUsers = await Log.aggregate([
      timeFilter,
      { $match: { username: { $ne: null, $ne: 'system' } } },
      { $group: { _id: '$username', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { username: '$_id', count: 1, _id: 0 } },
    ]);

    const crudStats = await Log.aggregate([
      timeFilter,
      { $group: { _id: '$action_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { type: '$_id', count: 1, _id: 0 } },
    ]);

    const timeSeries = await Log.aggregate([
      timeFilter,
      {
        $group: {
          _id: {
            $dateToString: {
              format: dateFormat,
              date: '$timestamp',
              timezone: 'Europe/Minsk',
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', count: 1, _id: 0 } },
    ]);

    const anomalies = await Log.aggregate([
      timeFilter,
      {
        $match: {
          action_type: {
            $in: ['DELETE', 'APP_ERROR', 'DELETE_ERROR', 'AUTH_BLOCK'],
          },
        },
      },
      { $group: { _id: '$username', anomalyCount: { $sum: 1 } } },
      { $match: { anomalyCount: { $gte: 5 } } },
      { $sort: { anomalyCount: -1 } },
      { $project: { username: '$_id', anomalyCount: 1, _id: 0 } },
    ]);

    res.json({ topUsers, crudStats, timeSeries, anomalies });
  } catch (error) {
    console.error('Ошибка агрегации MongoDB:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/logs/export', authenticateToken, async (req, res) => {
  const { format } = req.query;
  try {
    const logs = await Log.find().sort({ timestamp: -1 }).lean();

    if (format === 'csv') {
      const header = 'Время,Тип,Пользователь,Таблица,Детали\n';
      const rows = logs
        .map((log) => {
          const time = new Date(log.timestamp).toISOString();
          const type = log.action_type || '';
          const user = log.username || 'system';
          const table = log.table_name || '';
          const details = `"${JSON.stringify(log.details || '').replace(
            /"/g,
            '""'
          )}"`;
          return `${time},${type},${user},${table},${details}`;
        })
        .join('\n');

      res.header('Content-Type', 'text/csv');
      res.attachment('audit_logs.csv');
      return res.send(header + rows);
    }

    res.header('Content-Type', 'application/json');
    res.attachment('audit_logs.json');
    res.send(JSON.stringify(logs, null, 2));
  } catch (error) {
    res.status(500).json({ error: 'Ошибка экспорта' });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
