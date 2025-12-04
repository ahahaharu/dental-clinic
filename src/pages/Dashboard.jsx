import React, { useEffect, useState } from 'react';
import { Card, Statistic, Row, Col, Spin, message, Alert } from 'antd';
import {
  UserOutlined,
  DollarOutlined,
  ScheduleOutlined,
  RiseOutlined,
  AlertOutlined,
  MedicineBoxOutlined,
} from '@ant-design/icons';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/dashboard/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        message.error('Ошибка загрузки статистики');
      }
    } catch (error) {
      console.error(error);
      message.error('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spin size="large" tip="Загрузка аналитики..." />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Обзор клиники</h2>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card
            bordered={false}
            className="shadow-sm hover:shadow-md transition-shadow"
          >
            <Statistic
              title="Всего пациентов"
              value={stats?.patientsCount}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card
            bordered={false}
            className="shadow-sm hover:shadow-md transition-shadow"
          >
            <Statistic
              title="Приемов сегодня"
              value={stats?.appointmentsToday}
              prefix={<ScheduleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card
            bordered={false}
            className="shadow-sm hover:shadow-md transition-shadow"
          >
            <Statistic
              title="Выручка (Текущий месяц)"
              value={stats?.monthlyRevenue}
              precision={2}
              prefix={<DollarOutlined />}
              suffix="BYN"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} sm={12} lg={12}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Топ услуга месяца"
              value={stats?.topTreatment}
              prefix={<RiseOutlined />}
              valueStyle={{ fontSize: '18px', fontWeight: 'bold' }}
            />
            <div className="text-gray-400 text-xs mt-2">
              Чаще всего выполняется врачами
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={12}>
          <Card
            bordered={false}
            className="shadow-sm"
            style={{
              borderLeft:
                stats?.lowStockCount > 0
                  ? '4px solid #faad14'
                  : '4px solid #52c41a',
            }}
          >
            <Statistic
              title="Материалы заканчиваются"
              value={stats?.lowStockCount}
              prefix={<AlertOutlined />}
              valueStyle={{
                color: stats?.lowStockCount > 0 ? '#faad14' : '#52c41a',
              }}
              suffix="позиций"
            />
            {stats?.lowStockCount > 0 ? (
              <div className="text-orange-500 text-xs mt-2">
                Требуется закупка! (Остаток &lt; 10)
              </div>
            ) : (
              <div className="text-green-500 text-xs mt-2">Склад в порядке</div>
            )}
          </Card>
        </Col>
      </Row>

      <div className="mt-6">
        {stats?.appointmentsToday > 0 && (
          <Alert
            message="Напоминание"
            description={`Сегодня ожидается ${stats.appointmentsToday} пациентов. Проверьте готовность кабинетов.`}
            type="info"
            showIcon
            icon={<MedicineBoxOutlined />}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
