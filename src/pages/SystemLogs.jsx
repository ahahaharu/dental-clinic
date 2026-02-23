import React, { useState, useEffect } from 'react';
import { Table, Tag, Card, message, Spin, Input } from 'antd';
import { SafetyCertificateOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/logs');
      if (res.ok) {
        setLogs(await res.json());
      } else {
        message.error('Не удалось загрузить логи');
      }
    } catch (error) {
      console.error(error);
      message.error('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(
    (log) =>
      log.details.toLowerCase().includes(searchText.toLowerCase()) ||
      log.table_name.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: 'Время',
      dataIndex: 'action_time',
      key: 'time',
      width: 180,
      render: (text) => dayjs(text).format('DD.MM.YYYY HH:mm:ss'),
    },
    {
      title: 'Таблица',
      dataIndex: 'table_name',
      key: 'table',
      width: 120,
      render: (text) => <Tag color="geekblue">{text}</Tag>,
    },
    {
      title: 'Действие',
      dataIndex: 'action_type',
      key: 'action',
      width: 100,
      render: (type) => {
        let color = 'default';
        if (type === 'INSERT') color = 'green';
        if (type === 'UPDATE') color = 'blue';
        if (type === 'DELETE') color = 'red';
        return <Tag color={color}>{type}</Tag>;
      },
    },
    {
      title: 'ID записи',
      dataIndex: 'record_id',
      key: 'record_id',
      width: 100,
      align: 'center',
    },
    {
      title: 'Детали изменения',
      dataIndex: 'details',
      key: 'details',
    },
    {
      title: 'Пользователь БД',
      dataIndex: 'user_context',
      key: 'user',
      width: 150,
      render: (text) => <span className="text-gray-500 text-xs">{text}</span>,
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold m-0 flex items-center gap-2">
          <SafetyCertificateOutlined /> Аудит действий
        </h2>

        <Input
          prefix={<SearchOutlined />}
          placeholder="Поиск по логам..."
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
        />
      </div>

      <Card>
        <Table
          dataSource={filteredLogs}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      </Card>
    </div>
  );
};

export default SystemLogs;
