DROP DATABASE IF EXISTS dental_clinic;
CREATE DATABASE dental_clinic;
USE dental_clinic;

-- Пациенты
CREATE TABLE Patient (
    id INT NOT NULL AUTO_INCREMENT,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    birth_date DATE NOT NULL,
    gender ENUM('M', 'F', 'O') NOT NULL,
    Address VARCHAR(255),
    phone_number VARCHAR(15) NOT NULL UNIQUE,
    email VARCHAR(100) UNIQUE,
    PRIMARY KEY (id),
    INDEX idx_patient_name (last_name, first_name)
);

-- Стоматологи
CREATE TABLE Dentist (
    id INT NOT NULL AUTO_INCREMENT,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    specialization VARCHAR(50) NOT NULL,
    experience INT NOT NULL,
    license_number VARCHAR(20) NOT NULL UNIQUE,
    schedule VARCHAR(255),
    PRIMARY KEY (id),
    CONSTRAINT chk_experience_dentist CHECK (experience >= 0),
    INDEX idx_specialization (specialization),
    INDEX idx_dentist_name (last_name)
);

-- Ассистенты
CREATE TABLE Assistant (
    id INT NOT NULL AUTO_INCREMENT,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    position VARCHAR(50) NOT NULL,
    experience INT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT chk_experience_assistant CHECK (experience >= 0)
);

-- Кабинеты
CREATE TABLE Room (
    id INT NOT NULL AUTO_INCREMENT,
    number VARCHAR(10) NOT NULL UNIQUE,
    PRIMARY KEY (id)
);

-- Услуги / Процедуры
CREATE TABLE Treatment (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    duration INT NOT NULL,
    cost DECIMAL(8,2) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT chk_duration CHECK (duration > 0),
    CONSTRAINT chk_cost CHECK (cost > 0),
    INDEX idx_treatment_name (name)
);

-- Оборудование
CREATE TABLE Equipment (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    serial_number VARCHAR(20) NOT NULL UNIQUE,
    date_of_purchase DATE NOT NULL,
    status ENUM('working', 'repair', 'out_of_order') NOT NULL DEFAULT 'working',
    room_id INT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (room_id) REFERENCES Room(id) ON DELETE CASCADE,
    INDEX idx_equipment_status (status)
);

-- Материалы (Склад)
CREATE TABLE Material (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    quantity INT NOT NULL DEFAULT 0,
    expiration_date DATE,
    PRIMARY KEY (id),
    CONSTRAINT chk_quantity CHECK (quantity >= 0),
    INDEX idx_expiration (expiration_date),
    INDEX idx_quantity (quantity)
);

-- Связь: Услуга -> Материалы
CREATE TABLE Treatment_Material (
    treatment_id INT NOT NULL,
    material_id INT NOT NULL,
    quantity_needed INT DEFAULT 1,
    PRIMARY KEY (treatment_id, material_id),
    FOREIGN KEY (treatment_id) REFERENCES Treatment (id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES Material (id) ON DELETE RESTRICT
);

-- Связь: Услуга -> Оборудование
CREATE TABLE Treatment_Equipment (
    treatment_id INT NOT NULL,
    equipment_id INT NOT NULL,
    PRIMARY KEY (treatment_id, equipment_id),
    FOREIGN KEY (treatment_id) REFERENCES Treatment(id) ON DELETE CASCADE,
    FOREIGN KEY (equipment_id) REFERENCES Equipment(id) ON DELETE RESTRICT
);

-- Приемы (Самая нагруженная таблица)
CREATE TABLE Appointment (
    id INT NOT NULL AUTO_INCREMENT,
    date_time DATETIME NOT NULL,
    status ENUM('scheduled', 'completed', 'canceled') NOT NULL DEFAULT 'scheduled',
    patient_id INT NOT NULL,
    dentist_id INT NOT NULL,
    assistant_id INT,
    room_id INT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (patient_id) REFERENCES Patient(id) ON DELETE CASCADE,
    FOREIGN KEY (dentist_id) REFERENCES Dentist(id) ON DELETE RESTRICT,
    FOREIGN KEY (assistant_id) REFERENCES Assistant(id) ON DELETE SET NULL,
    FOREIGN KEY (room_id) REFERENCES Room(id) ON DELETE RESTRICT,
    
    INDEX idx_appointment_date (date_time),
    INDEX idx_dentist_schedule (dentist_id, date_time),
    INDEX idx_status_date (status, date_time),
    INDEX idx_patient_history (patient_id, date_time)
);

-- Оказанные услуги
CREATE TABLE Appointment_Treatment (
    appointment_id INT NOT NULL,
    treatment_id INT NOT NULL,
    quantity INT DEFAULT 1,
    PRIMARY KEY (appointment_id, treatment_id),
    FOREIGN KEY (appointment_id) REFERENCES Appointment(id) ON DELETE CASCADE,
    FOREIGN KEY (treatment_id) REFERENCES Treatment(id) ON DELETE RESTRICT
);

-- Счета
CREATE TABLE Invoice (
    id INT NOT NULL AUTO_INCREMENT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    payment_method ENUM('cash', 'card', 'insurance'),
    status ENUM('unpaid', 'paid', 'partial') NOT NULL DEFAULT 'unpaid',
    patient_id INT NOT NULL,
    appointment_id INT NOT NULL UNIQUE,
    PRIMARY KEY (id),
    FOREIGN KEY (patient_id) REFERENCES Patient(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES Appointment(id) ON DELETE CASCADE,
    INDEX idx_invoice_status (status),
    INDEX idx_invoice_date (date)
);

-- Медицинская карта
CREATE TABLE Medical_Record (
    id INT NOT NULL AUTO_INCREMENT,
    diagnosis TEXT,
    allergies TEXT,
    patient_id INT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (patient_id) REFERENCES Patient(id) ON DELETE CASCADE
);



-- Пациенты
INSERT INTO Patient (first_name, last_name, birth_date, gender, Address, phone_number, email) VALUES
('Иван', 'Иванов', '1990-05-15', 'M', 'г. Минск, пр. Независимости 15-45', '+375291112233', 'ivanov@mail.ru'),
('Анна', 'Петрова', '1985-03-20', 'F', 'г. Минск, ул. Немига 3', '+375336655444', 'anna.p@gmail.com'),
('Дмитрий', 'Сидоров', '1995-07-10', 'M', 'г. Гомель, ул. Советская 10', '+375447778899', 'dimas@yandex.ru'),
('Мария', 'Козлова', '1980-01-01', 'F', 'г. Брест, б-р Космонавтов 5', '+375259990011', 'mashak@tut.by'),
('Алексей', 'Новиков', '2000-12-25', 'M', 'г. Минск, ул. Притыцкого 20', '+375291234567', 'alex.nov@gmail.com');

-- Стоматологи
INSERT INTO Dentist (first_name, last_name, specialization, experience, license_number, schedule) VALUES
('Александр', 'Смирнов', 'Терапевт', 10, 'LIC-BY-001', 'Пн-Пт 09:00-17:00'),
('Елена', 'Кузнецова', 'Ортодонт', 8, 'LIC-BY-002', 'Вт-Сб 10:00-18:00'),
('Сергей', 'Воронов', 'Хирург', 15, 'LIC-BY-003', 'Пн, Ср, Пт 12:00-20:00'),
('Ольга', 'Морозова', 'Детский врач', 5, 'LIC-BY-004', 'Ср-Вс 09:00-17:00'),
('Виктор', 'Лебедев', 'Ортопед', 12, 'LIC-BY-005', 'Пн-Пт 08:00-16:00');

-- Ассистенты
INSERT INTO Assistant (first_name, last_name, position, experience) VALUES
('Татьяна', 'Волкова', 'Медсестра', 3),
('Игорь', 'Соколов', 'Старший ассистент', 5),
('Наталья', 'Зайцева', 'Младший ассистент', 1);

-- Кабинеты
INSERT INTO Room (number) VALUES ('101'), ('102'), ('201'), ('202'), ('301');

-- Услуги (Лечение)
INSERT INTO Treatment (name, description, duration, cost) VALUES
('Первичная консультация', 'Осмотр и составление плана', 30, 50.00),
('Лечение кариеса', 'Пломбирование зуба фотополимером', 60, 120.00),
('Удаление зуба', 'Хирургическое удаление', 45, 90.00),
('Проф. гигиена', 'Чистка AirFlow', 60, 150.00),
('Брекет-система', 'Установка на одну челюсть', 90, 2500.00);

-- Оборудование
INSERT INTO Equipment (name, serial_number, date_of_purchase, status, room_id) VALUES
('Стоматологическая установка A-dec', 'SN-BY-001', '2022-01-10', 'working', 1),
('Рентген аппарат Vatech', 'SN-BY-002', '2021-05-20', 'working', 2),
('Стерилизатор Melag', 'SN-BY-003', '2023-03-15', 'working', 3),
('Лампа полимеризационная', 'SN-BY-004', '2020-11-05', 'repair', 1),
('Скейлер ультразвуковой', 'SN-BY-005', '2022-08-01', 'out_of_order', 2);

-- Материалы
INSERT INTO Material (name, quantity, expiration_date) VALUES
('Анестетик (Убистезин)', 50, '2026-01-01'),
('Пломбировочный материал (Filtek)', 100, '2025-12-31'),
('Перчатки смотровые (уп)', 200, '2030-01-01'),
('Ватные валики (уп)', 500, '2030-01-01'),
('Набор для брекетов', 10, '2027-05-01');

-- Связи: Лечение - Материалы (Что тратится на процедуру)
INSERT INTO Treatment_Material (treatment_id, material_id, quantity_needed) VALUES
(2, 1, 1), -- Кариес требует анестезию
(2, 2, 1), -- Кариес требует пломбу
(3, 1, 2); -- Удаление требует больше анестезии

-- Связи: Лечение - Оборудование
INSERT INTO Treatment_Equipment (treatment_id, equipment_id) VALUES
(2, 1), -- Кариес - Установка
(3, 1), -- Удаление - Установка
(4, 5); -- Чистка - Скейлер

-- Записи на прием (Appointments)
-- Важно: даты ставим относительно текущего времени
INSERT INTO Appointment (date_time, status, patient_id, dentist_id, assistant_id, room_id) VALUES
(NOW() + INTERVAL 1 DAY, 'scheduled', 1, 1, 1, 1), -- Завтра (Иванов к Смирнову)
(NOW() + INTERVAL 2 HOUR, 'scheduled', 2, 2, 2, 2), -- Сегодня через 2 часа (Петрова к Кузнецовой)
(NOW() - INTERVAL 1 DAY, 'completed', 3, 3, 1, 3), -- Вчера (Сидоров к Воронову) - Завершен
(NOW() - INTERVAL 2 DAY, 'canceled', 4, 4, NULL, 4), -- Позавчера (Козлова) - Отменен
(NOW() + INTERVAL 3 DAY, 'scheduled', 5, 5, 2, 5); -- Через 3 дня (Новиков)

-- Связь: Прием - Услуги (Что конкретно делали на завершенном приеме)
-- Пациенту 3 (Сидоров) удалили зуб (id 3)
INSERT INTO Appointment_Treatment (appointment_id, treatment_id, quantity) VALUES
(3, 3, 1);

-- Счета (Invoices)
-- Только для завершенного приема (id 3)
INSERT INTO Invoice (date, payment_method, status, patient_id, appointment_id) VALUES
(NOW() - INTERVAL 1 DAY, 'cash', 'paid', 3, 3);

-- Медицинские карты
INSERT INTO Medical_Record (diagnosis, allergies, patient_id) VALUES
('Хронический пульпит', 'Нет', 1),
('Глубокий прикус', 'Лидокаин', 2),
('Периодонтит', 'Пенициллин', 3),
('Кариес эмали', 'Нет', 4),
('Здоров', 'Пыльца', 5);