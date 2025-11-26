export const patients = [
  {
    id: 1,
    key: '1',
    first_name: 'Иван',
    last_name: 'Иванов',
    phone_number: '+375291977923',
    gender: 'M',
    last_visit: '2023-10-15',
  },
  {
    id: 2,
    key: '2',
    first_name: 'Анна',
    last_name: 'Петрова',
    phone_number: '+375293333333',
    gender: 'F',
    last_visit: '2023-11-01',
  },
];

export const dentists = [
  { id: 1, name: 'Др. Смирнов', specialization: 'Терапевт' },
  { id: 2, name: 'Др. Кузнецова', specialization: 'Хирург' },
];

export const appointments = [
  {
    id: 1,
    date: '2023-11-20',
    time: '10:00',
    patient_id: 1,
    dentist_id: 1,
    status: 'scheduled',
    room: '101',
  },
  {
    id: 2,
    date: '2023-11-20',
    time: '12:30',
    patient_id: 2,
    dentist_id: 2,
    status: 'completed',
    room: '102',
  },
];
