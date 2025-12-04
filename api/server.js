import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import db from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ============================================
// 1. ПАЦИЕНТЫ (Patients)
// ============================================

// Получить всех пациентов (с поиском)
app.get('/api/patients', async (req, res) => {
  const { search } = req.query;
  try {
    let query = 'SELECT * FROM Patient';
    let params = [];

    if (search) {
      query +=
        ' WHERE last_name LIKE ? OR first_name LIKE ? OR phone_number LIKE ?';
      params = [`%${search}%`, `%${search}%`, `%${search}%`];
    }

    query += ' ORDER BY id DESC';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: error.message });
  }
});

// Добавить пациента
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
      `INSERT INTO Patient (first_name, last_name, birth_date, gender, Address, phone_number, email) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, birth_date, gender, Address, phone_number, email]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Обновить пациента
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
      `UPDATE Patient SET first_name=?, last_name=?, birth_date=?, gender=?, Address=?, phone_number=?, email=? 
       WHERE id=?`,
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
    res.json({ message: 'Данные обновлены', id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Удалить пациента
app.delete('/api/patients/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM Patient WHERE id = ?', [req.params.id]);
    res.json({ message: 'Пациент удален' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить медкарту пациента
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

// Создать/Обновить медкарту
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

// ============================================
// 2. ВРАЧИ И АССИСТЕНТЫ (Staff)
// ============================================

// --- СТОМАТОЛОГИ ---
app.get('/api/dentists', async (req, res) => {
  const { search } = req.query;
  try {
    let query = 'SELECT * FROM Dentist';
    let params = [];
    if (search) {
      query += ' WHERE last_name LIKE ? OR specialization LIKE ?';
      params = [`%${search}%`, `%${search}%`];
    }
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
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
      `INSERT INTO Dentist (first_name, last_name, specialization, experience, license_number, schedule) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        first_name,
        last_name,
        specialization,
        experience,
        license_number,
        schedule,
      ]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
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
      `UPDATE Dentist SET first_name=?, last_name=?, specialization=?, experience=?, license_number=?, schedule=? 
       WHERE id=?`,
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
    res.json({ message: 'Стоматолог обновлен' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/dentists/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM Dentist WHERE id = ?', [req.params.id]);
    res.json({ message: 'Стоматолог удален' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- АССИСТЕНТЫ ---
app.get('/api/assistants', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Assistant');
    res.json(rows);
  } catch (error) {
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
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
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
    res.json({ message: 'Ассистент обновлен' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/assistants/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM Assistant WHERE id = ?', [req.params.id]);
    res.json({ message: 'Ассистент удален' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 3. СКЛАД (Inventory)
// ============================================

// --- МАТЕРИАЛЫ ---
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
    res.json({ message: 'Материал обновлен' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/materials/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM Material WHERE id=?', [req.params.id]);
    res.json({ message: 'Материал удален' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ОБОРУДОВАНИЕ ---
app.get('/api/equipment', async (req, res) => {
  try {
    const query = `
      SELECT e.*, r.number as room_number 
      FROM Equipment e
      JOIN Room r ON e.room_id = r.id
    `;
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
      `INSERT INTO Equipment (name, serial_number, date_of_purchase, status, room_id) 
       VALUES (?, ?, ?, ?, ?)`,
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
      `UPDATE Equipment SET name=?, serial_number=?, date_of_purchase=?, status=?, room_id=? 
       WHERE id=?`,
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

// --- КАБИНЕТЫ ---
app.get('/api/rooms', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Room');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 4. УСЛУГИ (Treatments)
// ============================================

// Получить все услуги
app.get('/api/treatments', async (req, res) => {
  const { search } = req.query;
  try {
    let query = 'SELECT * FROM Treatment';
    let params = [];
    if (search) {
      query += ' WHERE name LIKE ?';
      params = [`%${search}%`];
    }
    query += ' ORDER BY name ASC';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить ОДНУ услугу (ДЕТАЛИ) - ВОТ ЭТОТ МАРШРУТ ВАЖЕН ДЛЯ 404 ОШИБКИ
app.get('/api/treatments/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Сама услуга
    const [tRows] = await db.query('SELECT * FROM Treatment WHERE id = ?', [
      id,
    ]);

    if (tRows.length === 0) {
      return res.status(404).json({ message: 'Нет такой услуги' });
    }
    const treatment = tRows[0];

    // 2. Материалы
    const [mRows] = await db.query(
      `SELECT material_id, quantity_needed FROM Treatment_Material WHERE treatment_id = ?`,
      [id]
    );

    // 3. Оборудование
    const [eRows] = await db.query(
      `SELECT equipment_id FROM Treatment_Equipment WHERE treatment_id = ?`,
      [id]
    );

    // Форматируем ответ
    treatment.materials = mRows.map((m) => ({
      id: m.material_id,
      quantity: m.quantity_needed,
    }));
    treatment.equipment = eRows.map((e) => e.equipment_id);

    res.json(treatment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Создать услугу
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
    res.status(201).json({ message: 'Услуга создана' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Обновить услугу
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

    // Обновляем материалы (удалить старые -> добавить новые)
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

    // Обновляем оборудование
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
    res.json({ message: 'Услуга обновлена' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Удалить услугу
app.delete('/api/treatments/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM Treatment WHERE id = ?', [req.params.id]);
    res.json({ message: 'Услуга удалена' });
  } catch (error) {
    if (error.errno === 1451) {
      res
        .status(400)
        .json({ error: 'Нельзя удалить: эта услуга используется.' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// ============================================
// 5. ПРИЕМЫ (Appointments)
// ============================================

// Получить все приемы (с именами и номером кабинета)
app.get('/api/appointments', async (req, res) => {
  try {
    const query = `
      SELECT a.id, a.date_time, a.status, 
             p.last_name as p_last, p.first_name as p_first,
             d.last_name as d_last, d.specialization,
             r.number as room_number
      FROM Appointment a
      JOIN Patient p ON a.patient_id = p.id
      JOIN Dentist d ON a.dentist_id = d.id
      JOIN Room r ON a.room_id = r.id
      ORDER BY a.date_time ASC
    `;
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить детали одного приема
app.get('/api/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Сам прием
    const [appointmentRows] = await db.query(
      `SELECT a.*, 
              p.last_name as p_last, p.first_name as p_first,
              d.last_name as d_last, d.specialization
       FROM Appointment a
       JOIN Patient p ON a.patient_id = p.id
       JOIN Dentist d ON a.dentist_id = d.id
       WHERE a.id = ?`,
      [id]
    );

    if (appointmentRows.length === 0) {
      return res.status(404).json({ message: 'Прием не найден' });
    }

    // Оказанные услуги
    const [treatmentRows] = await db.query(
      `SELECT t.id, t.name, t.cost, at.quantity
       FROM Appointment_Treatment at
       JOIN Treatment t ON at.treatment_id = t.id
       WHERE at.appointment_id = ?`,
      [id]
    );

    res.json({ ...appointmentRows[0], treatments: treatmentRows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Создать прием
app.post('/api/appointments', async (req, res) => {
  const { date_time, patient_id, dentist_id, assistant_id, room_id } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO Appointment (date_time, status, patient_id, dentist_id, assistant_id, room_id) 
       VALUES (?, 'scheduled', ?, ?, ?, ?)`,
      [date_time, patient_id, dentist_id, assistant_id || null, room_id]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
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
    res.json({ message: 'Прием успешно сохранен' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// ============================================
// 6. ДАШБОРД / СТАТИСТИКА
// ============================================

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const connection = await db.getConnection();

    // 1. Количество пациентов
    const [patients] = await connection.query(
      'SELECT COUNT(*) as count FROM Patient'
    );

    // 2. Приемы на СЕГОДНЯ
    const [appointmentsToday] = await connection.query(
      'SELECT COUNT(*) as count FROM Appointment WHERE DATE(date_time) = CURDATE()'
    );

    // 3. Выручка за текущий МЕСЯЦ (считаем только completed приемы)
    // Суммируем (цена услуги * количество) из таблицы связки
    const [revenue] = await connection.query(`
      SELECT SUM(t.cost * at.quantity) as total 
      FROM Appointment a
      JOIN Appointment_Treatment at ON a.id = at.appointment_id
      JOIN Treatment t ON at.treatment_id = t.id
      WHERE a.status = 'completed' 
        AND MONTH(a.date_time) = MONTH(CURRENT_DATE()) 
        AND YEAR(a.date_time) = YEAR(CURRENT_DATE())
    `);

    // 4. Самая популярная услуга (Топ-1)
    const [topTreatment] = await connection.query(`
      SELECT t.name, COUNT(at.treatment_id) as usage_count 
      FROM Appointment_Treatment at
      JOIN Treatment t ON at.treatment_id = t.id
      GROUP BY t.id, t.name
      ORDER BY usage_count DESC
      LIMIT 1
    `);

    // 5. Материалы, которые заканчиваются (меньше 10 шт)
    const [lowStock] = await connection.query(
      'SELECT COUNT(*) as count FROM Material WHERE quantity < 10'
    );

    connection.release();

    res.json({
      patientsCount: patients[0].count,
      appointmentsToday: appointmentsToday[0].count,
      monthlyRevenue: revenue[0].total || 0, // Если null, то 0
      topTreatment: topTreatment[0] ? topTreatment[0].name : 'Нет данных',
      lowStockCount: lowStock[0].count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
