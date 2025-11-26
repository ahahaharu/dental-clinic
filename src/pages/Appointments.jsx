import React from 'react';
import { Calendar, Badge, Modal } from 'antd';
import { appointments, patients } from '../data/mockData';

const Appointments = () => {
  const dateCellRender = (value) => {
    const dateString = value.format('YYYY-MM-DD');
    const dailyAppointments = appointments.filter(
      (app) => app.date === dateString
    );

    return (
      <ul className="m-0 p-0 list-none">
        {dailyAppointments.map((item) => {
          const patient = patients.find((p) => p.id === item.patient_id);

          return (
            <li key={item.id} className="mb-1">
              <Badge
                status={item.status === 'completed' ? 'success' : 'processing'}
                text={
                  <span className="text-xs">
                    {item.time} - {patient?.last_name}
                  </span>
                }
              />
            </li>
          );
        })}
      </ul>
    );
  };

  const onSelect = (value, info) => {
    if (info.source === 'date') {
      console.log('Выбрана дата:', value.format('YYYY-MM-DD'));
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Расписание приемов</h2>
      <Calendar dateCellRender={dateCellRender} onSelect={onSelect} />
    </div>
  );
};

export default Appointments;
