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
  Dropdown,
  Tabs,
  Alert,
  List,
  Row,
  Col,
  Segmented,
} from 'antd';
import {
  SafetyCertificateOutlined,
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  WarningOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiFetch } from '../utils/api';
import toast from 'react-hot-toast';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const eventColors = {
  INSERT: '#52c41a',
  UPDATE: '#1890ff',
  DELETE: '#f5222d',
  SELECT: '#13c2c2',
  LOGIN: '#722ed1',
  LOGOUT: '#eb2f96',
  APP_ERROR: '#ff4d4f',
  DELETE_ERROR: '#fa541c',
  AUTH_BLOCK: '#faad14',
};

const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ dates: null, type: null, user: '' });

  const [stats, setStats] = useState({
    topUsers: [],
    crudStats: [],
    timeSeries: [],
    anomalies: [],
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [period, setPeriod] = useState('month');

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
      setLogs(await res.json());
      setLoading(false);
    };

    if (silent) {
      try {
        await fetchLogic();
      } catch (e) {}
    } else {
      toast.promise(fetchLogic(), {
        loading: 'Синхронизация...',
        success: 'Журнал обновлен',
        error: 'Ошибка загрузки',
      });
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => loadData(filters, true), 500);
    return () => clearTimeout(handler);
  }, [filters, loadData]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await apiFetch(`/api/logs/stats?period=${period}`);
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (error) {
      toast.error('Ошибка загрузки статистики');
    } finally {
      setStatsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleExport = (format) => {
    const url = `/api/logs/export?format=${format}`;
    apiFetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Ошибка сервера');
        return res.blob();
      })
      .then((blob) => {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `audit_logs.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Экспорт в ${format.toUpperCase()} успешен!`);
      })
      .catch((err) => toast.error('Ошибка экспорта: ' + err.message));
  };

  const columns = [
    {
      title: 'Время',
      dataIndex: 'timestamp',
      width: 170,
      render: (text) => dayjs(text).format('DD.MM.YYYY HH:mm:ss'),
    },
    {
      title: 'Тип',
      dataIndex: 'action_type',
      width: 130,
      render: (type) => (
        <Tag color={eventColors[type] || 'default'}>
          <b>{type}</b>
        </Tag>
      ),
    },
    {
      title: 'Пользователь',
      dataIndex: 'username',
      width: 130,
      render: (u) => <Text strong>{u || 'Система'}</Text>,
    },
    { title: 'Таблица', dataIndex: 'table_name', width: 120 },
    {
      title: 'Детали',
      dataIndex: 'details',
      render: (details) => (
        <div style={{ maxWidth: 400 }}>
          {typeof details === 'object' ? (
            <pre className="text-xs bg-gray-50 p-2 rounded text-gray-600 overflow-x-auto">
              {JSON.stringify(details, null, 2)}
            </pre>
          ) : (
            <Text type="secondary">{details}</Text>
          )}
        </div>
      ),
    },
  ];

  const tabItems = [
    {
      key: '1',
      label: (
        <span>
          <SearchOutlined /> Журнал событий
        </span>
      ),
      children: (
        <>
          <Card className="mb-4 shadow-sm border-gray-200">
            <Space direction="horizontal" wrap size="middle">
              <RangePicker
                showTime
                placeholder={['Начало', 'Конец']}
                value={filters.dates}
                onChange={(val) => setFilters({ ...filters, dates: val })}
              />
              <Select
                placeholder="Все операции"
                allowClear
                style={{ width: 180 }}
                value={filters.type}
                onChange={(val) => setFilters({ ...filters, type: val })}
              >
                <Select.Option value="SELECT">Чтение (SELECT)</Select.Option>
                <Select.Option value="INSERT">Создание (INSERT)</Select.Option>
                <Select.Option value="UPDATE">
                  Обновление (UPDATE)
                </Select.Option>
                <Select.Option value="DELETE">Удаление (DELETE)</Select.Option>
                <Select.Option value="LOGIN">Вход (LOGIN)</Select.Option>
                <Select.Option value="APP_ERROR">
                  Ошибки (APP_ERROR)
                </Select.Option>
              </Select>
              <Input
                prefix={<SearchOutlined />}
                placeholder="Поиск по логину..."
                value={filters.user}
                onChange={(e) =>
                  setFilters({ ...filters, user: e.target.value })
                }
                style={{ width: 220 }}
              />
            </Space>
          </Card>
          <Card borderless className="shadow-md">
            <Table
              dataSource={logs}
              columns={columns}
              rowKey="_id"
              loading={loading}
              pagination={{ pageSize: 10 }}
              size="middle"
            />
          </Card>
        </>
      ),
    },
    {
      key: '2',
      label: (
        <span>
          <BarChartOutlined /> Аналитика и Тренды
        </span>
      ),
      children: (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-6 bg-white p-3 rounded-md shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold m-0 text-gray-700">
              Обзор активности пользователей
            </h3>
            <Segmented
              options={[
                { label: 'За сегодня', value: 'day' },
                { label: 'За 7 дней', value: 'week' },
                { label: 'За 30 дней', value: 'month' },
              ]}
              value={period}
              onChange={setPeriod}
              className="font-medium"
            />
          </div>

          {stats.anomalies.length > 0 && (
            <div className="mb-6">
              <h3 className="text-md text-red-600 mb-2 font-bold">
                <WarningOutlined /> Требует внимания (Аномалии)
              </h3>
              {stats.anomalies.map((an) => (
                <Alert
                  key={an.username}
                  message={`Пользователь "${an.username}" совершил подозрительно много деструктивных действий (${an.anomalyCount} инцидентов за период).`}
                  type="error"
                  showIcon
                  className="mb-2 shadow-sm"
                />
              ))}
            </div>
          )}

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12} lg={8}>
              <Card
                title="Топ активных пользователей"
                className="shadow-sm h-full"
                loading={statsLoading}
              >
                {stats.topUsers.length === 0 ? (
                  <Text type="secondary">Нет данных за этот период</Text>
                ) : (
                  <List
                    dataSource={stats.topUsers}
                    renderItem={(item, index) => (
                      <List.Item className="flex justify-between">
                        <div>
                          <Text type="secondary" className="mr-2">
                            #{index + 1}
                          </Text>
                          <Text strong>{item.username}</Text>
                        </div>
                        <Tag color="blue">{item.count} опер.</Tag>
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </Col>

            <Col xs={24} md={12} lg={16}>
              <Card
                title="Распределение операций (CRUD)"
                className="shadow-sm h-full"
                loading={statsLoading}
              >
                {stats.crudStats.length === 0 ? (
                  <Text type="secondary">Нет данных за этот период</Text>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.crudStats}
                        dataKey="count"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(entry) => `${entry.type}: ${entry.count}`}
                      >
                        {stats.crudStats.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={eventColors[entry.type] || '#ccc'}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </Col>

            <Col span={24}>
              <Card
                title="Тренды активности (Time Series)"
                className="shadow-sm"
                loading={statsLoading}
              >
                {stats.timeSeries.length === 0 ? (
                  <div className="text-center py-10">
                    <Text type="secondary">Нет логов за выбранный период</Text>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart
                      data={stats.timeSeries}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" />
                      <YAxis allowDecimals={false} />
                      <Tooltip wrapperStyle={{ borderRadius: '8px' }} />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#1890ff"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#1890ff' }}
                        activeDot={{ r: 8 }}
                        name="Кол-во операций"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
  ];

  return (
    <div className="p-2 flex flex-col gap-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold m-0 flex items-center gap-2">
          <SafetyCertificateOutlined className="text-blue-600" /> Аудит и
          Аналитика
        </h2>
        <Space>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'csv',
                  label: 'Скачать лог (CSV)',
                  onClick: () => handleExport('csv'),
                },
                {
                  key: 'json',
                  label: 'Скачать лог (JSON)',
                  onClick: () => handleExport('json'),
                },
              ],
            }}
          >
            <Button icon={<DownloadOutlined />} type="primary" ghost>
              Экспорт отчета
            </Button>
          </Dropdown>
        </Space>
      </div>

      <Tabs
        defaultActiveKey="1"
        items={tabItems}
        className="bg-white p-4 rounded-lg shadow-sm"
      />
    </div>
  );
};

export default SystemLogs;
