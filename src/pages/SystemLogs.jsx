import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Tag,
  Card,
  Input,
  DatePicker,
  Select,
  Button,
  Space,
  Typography,
} from 'antd';
import {
  SafetyCertificateOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiFetch } from '../utils/api';
import toast from 'react-hot-toast';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const eventTypeConfig = {
  INSERT: { color: 'green', label: 'INSERT' },
  UPDATE: { color: 'blue', label: 'UPDATE' },
  DELETE: { color: 'red', label: 'DELETE' },
  SELECT: { color: 'cyan', label: 'SELECT' },
  LOGIN: { color: 'purple', label: 'LOGIN' },
  LOGOUT: { color: 'magenta', label: 'LOGOUT' },
  APP_ERROR: { color: 'error', label: 'ОШИБКА' },
  AUTH_BLOCK: { color: 'orange', label: 'БЛОКИРОВКА' },
  DELETE_ERROR: { color: 'volcano', label: 'ОШИБКА УДАЛЕНИЯ' },
  DB_CONSTRAINT_VIOLATION: { color: 'warning', label: 'КОНФЛИКТ БД' },
};

const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ dates: null, type: null, user: '' });

  const loadData = useCallback(async (currentFilters, silent = false) => {
    const fetchLogic = async () => {
      setLoading(true);
      let params = new URLSearchParams();
      if (currentFilters.dates) {
        params.append('startDate', currentFilters.dates[0].toISOString());
        params.append('endDate', currentFilters.dates[1].toISOString());
      }
      if (currentFilters.type) params.append('type', currentFilters.type);
      if (currentFilters.user) params.append('user', currentFilters.user);

      const res = await apiFetch(`/api/logs?${params.toString()}`);
      if (!res.ok) throw new Error('Ошибка сервера');

      const data = await res.json();
      setLogs(data);
      setLoading(false);
    };

    if (silent) {
      try {
        await fetchLogic();
      } catch (e) {
        console.error(e);
      }
    } else {
      toast.promise(fetchLogic(), {
        loading: 'Синхронизация...',
        success: 'Журнал обновлен',
        error: 'Ошибка загрузки',
      });
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadData(filters, true);
    }, 500);

    return () => clearTimeout(handler);
  }, [filters, loadData]);

  const columns = [
    {
      title: 'Время',
      dataIndex: 'timestamp',
      key: 'time',
      width: 180,
      render: (text) => dayjs(text).format('DD.MM.YYYY HH:mm:ss'),
    },
    {
      title: 'Тип события',
      dataIndex: 'action_type',
      key: 'action',
      width: 150,
      render: (type) => {
        const config = eventTypeConfig[type] || {
          color: 'default',
          label: type,
        };
        return (
          <Tag color={config.color} style={{ fontWeight: 'bold' }}>
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: 'Пользователь',
      dataIndex: 'username',
      key: 'user',
      width: 150,
      render: (text) => <Text strong>{text || 'Система'}</Text>,
    },
    {
      title: 'Детали изменения',
      dataIndex: 'details',
      key: 'details',
      render: (details) => (
        <div style={{ maxWidth: '400px' }}>
          <Text type="secondary" copyable={typeof details === 'string'}>
            {typeof details === 'object' ? (
              <pre className="text-xs bg-gray-50 p-1 rounded">
                {JSON.stringify(details, null, 2)}
              </pre>
            ) : (
              details
            )}
          </Text>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold m-0 flex items-center gap-2">
          <SafetyCertificateOutlined className="text-blue-600" />
          Журнал аудита системы
        </h2>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            setFilters({ dates: null, type: null, user: '' });
            toast.success('Фильтры сброшены');
          }}
        >
          Сбросить фильтры
        </Button>
      </div>

      <Card className="mb-6 shadow-sm border-gray-100">
        <Space direction="horizontal" wrap size="large">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">Период времени:</span>
            <RangePicker
              showTime
              value={filters.dates}
              onChange={(val) => setFilters({ ...filters, dates: val })}
              placeholder={['Начало', 'Конец']}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">Тип операции:</span>
            <Select
              placeholder="Все операции"
              allowClear
              style={{ width: 180 }}
              value={filters.type}
              onChange={(val) => setFilters({ ...filters, type: val })}
            >
              <Select.Option value="SELECT">SELECT (Чтение)</Select.Option>
              <Select.Option value="INSERT">INSERT (Создание)</Select.Option>
              <Select.Option value="UPDATE">UPDATE (Изменение)</Select.Option>
              <Select.Option value="DELETE">DELETE (Удаление)</Select.Option>
              <Select.Option value="LOGIN">LOGIN (Вход)</Select.Option>
              <Select.Option value="APP_ERROR">
                APP_ERROR (Ошибки)
              </Select.Option>
              <Select.Option value="AUTH_BLOCK">
                Блокировка доступа
              </Select.Option>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">Поиск по логину:</span>
            <Input
              prefix={<SearchOutlined className="text-gray-300" />}
              placeholder="Напр: admin"
              value={filters.user}
              onChange={(e) => setFilters({ ...filters, user: e.target.value })}
              style={{ width: 200 }}
            />
          </div>

          <div className="pt-5">
            <Button
              type="primary"
              onClick={() => loadData(filters)}
              loading={loading}
              className="bg-blue-600"
            >
              Обновить сейчас
            </Button>
          </div>
        </Space>
      </Card>

      <Card borderless className="shadow-md">
        <Table
          dataSource={logs}
          columns={columns}
          rowKey="_id"
          loading={loading}
          size="middle"
          pagination={{
            pageSize: 12,
            showSizeChanger: true,
            pageSizeOptions: ['12', '24', '50'],
          }}
        />
      </Card>
    </div>
  );
};

export default SystemLogs;
