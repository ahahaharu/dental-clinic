import React from 'react';
import { Table, Tag, Space, Button } from 'antd';
import { patients } from '../data/mockData';
import { PlusOutlined } from '@ant-design/icons';

const Patients = () => {
  const columns = [
    {
      title: 'Фамилия Имя',
      key: 'name',
      render: (_, record) => `${record.last_name} ${record.first_name}`,
    },
    {
      title: 'Телефон',
      dataIndex: 'phone_number',
      key: 'phone_number',
    },
    {
      title: 'Пол',
      dataIndex: 'gender',
      key: 'gender',
      render: (gender) => (
        <Tag color={gender === 'M' ? 'blue' : 'magenta'}>
          {gender === 'M' ? 'Муж' : 'Жен'}
        </Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'action',
      render: () => (
        <Space size="middle">
          <a className="text-blue-500">Карта</a>
          <a className="text-blue-500">Записать</a>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold m-0">Пациенты</h2>
        <Button type="primary" icon={<PlusOutlined />}>
          Новый пациент
        </Button>
      </div>
      <Table columns={columns} dataSource={patients} />
    </div>
  );
};

export default Patients;
