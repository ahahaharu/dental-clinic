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
  console.log(search);
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

app.get('/api/stats', async (req, res) => {
  try {
    const [patients] = await db.query('SELECT COUNT(*) as count FROM Patient');
    const [appointmentsToday] = await db.query(
      'SELECT COUNT(*) as count FROM Appointment WHERE DATE(date_time) = CURDATE()'
    );
    const [revenue] = await db.query(
      'SELECT SUM(amount) as total FROM Invoice'
    );

    res.json({
      patientsCount: patients[0].count,
      appointmentsToday: appointmentsToday[0].count,
      revenue: revenue[0].total || 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
