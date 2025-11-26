import React from 'react';
import { Card, Statistic, Row, Col } from 'antd';
import {
  UserOutlined,
  DollarOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';

const Dashboard = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Обзор клиники</h2>
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Пациентов"
              value={1128}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Приемов сегодня"
              value={12}
              prefix={<ScheduleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Выручка (мес)"
              value={93000}
              prefix={<DollarOutlined />}
              suffix="₽"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
