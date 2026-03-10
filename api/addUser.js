import bcrypt from 'bcrypt';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import db from './db.js';

const rl = readline.createInterface({ input, output });

async function addUser() {
  try {
    console.log('\n=== Добавление нового пользователя ===\n');

    const username = await rl.question('Введите логин: ');
    if (!username.trim()) throw new Error('Логин не может быть пустым!');

    const password = await rl.question('Введите пароль: ');
    if (!password.trim()) throw new Error('Пароль не может быть пустым!');

    let role = await rl.question('Введите роль (admin, dentist, assistant): ');
    role = role.toLowerCase().trim();
    if (!['admin', 'dentist', 'assistant'].includes(role)) {
      throw new Error(
        'Неверная роль! Допустимые значения: admin, dentist, assistant'
      );
    }

    let dentistId = null;
    let assistantId = null;

    if (role === 'dentist') {
      const answer = await rl.question(
        'Введите ID врача из таблицы Dentist (или нажмите Enter, чтобы пропустить): '
      );
      dentistId = answer.trim() ? parseInt(answer) : null;
    } else if (role === 'assistant') {
      const answer = await rl.question(
        'Введите ID ассистента из таблицы Assistant (или нажмите Enter, чтобы пропустить): '
      );
      assistantId = answer.trim() ? parseInt(answer) : null;
    }

    console.log('\nГенерация хэша пароля...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await db.query(
      `INSERT INTO User (username, password_hash, role, dentist_id, assistant_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [username, passwordHash, role, dentistId, assistantId]
    );

    console.log(`✅ Пользователь '${username}' успешно добавлен в базу!`);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.log(
        `❌ Ошибка: Пользователь с логином '${
          error.sqlMessage.match(/'([^']+)'/)[1]
        }' уже существует.`
      );
    } else {
      console.log(`❌ Ошибка: ${error.message}`);
    }
  } finally {
    rl.close();
    process.exit(0);
  }
}

addUser();
