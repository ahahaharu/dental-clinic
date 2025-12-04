import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import db from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

app.delete('/api/patients/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM Patient WHERE id = ?', [req.params.id]);
    res.json({ message: 'Пациент удален' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/appointments', async (req, res) => {
  try {
    const query = `
      SELECT a.id, a.date_time, a.status, 
             p.last_name as p_last, p.first_name as p_first,
             d.last_name as d_last, d.specialization
      FROM Appointment a
      JOIN Patient p ON a.patient_id = p.id
      JOIN Dentist d ON a.dentist_id = d.id
      ORDER BY a.date_time ASC
    `;
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
