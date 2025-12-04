import React, { useState, useEffect } from 'react';
import { Calendar, Badge, message } from 'antd';
import dayjs from 'dayjs';

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/appointments')
      .then((res) => res.json())
      .then((data) => setAppointments(data))
      .catch((err) => message.error('Не удалось загрузить расписание'));
  }, []);

  const dateCellRender = (value) => {
    const dateString = value.format('YYYY-MM-DD');

    const dailyAppointments = appointments.filter(
      (app) => dayjs(app.date_time).format('YYYY-MM-DD') === dateString
    );

    return (
      <ul className="m-0 p-0 list-none">
        {dailyAppointments.map((item) => (
          <li key={item.id} className="mb-1">
            <Badge
              status={item.status === 'completed' ? 'success' : 'processing'}
              text={
                <span className="text-xs">
                  {dayjs(item.date_time).format('HH:mm')} - {item.p_last}
                </span>
              }
            />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Расписание приемов</h2>
      <Calendar cellRender={dateCellRender} />
    </div>
  );
};

export default Appointments;
