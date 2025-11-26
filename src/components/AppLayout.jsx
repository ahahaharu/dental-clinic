import React, { useState } from 'react';
import { Layout, Menu, theme } from 'antd';
import {
  UserOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Header, Content, Footer, Sider } = Layout;

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: 'Дашборд' },
    { key: '/patients', icon: <UserOutlined />, label: 'Пациенты' },
    { key: '/appointments', icon: <CalendarOutlined />, label: 'Приёмы' },
    { key: '/treatments', icon: <MedicineBoxOutlined />, label: 'Лечение' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
      >
        <div className="h-16 m-4 bg-white/20 rounded flex items-center justify-center text-white font-bold text-xl">
          {collapsed ? 'DC' : 'Dental Clinic'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: token.colorBgContainer }} />
        <Content style={{ margin: '16px' }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: token.colorBgContainer,
              borderRadius: token.borderRadiusLG,
            }}
          >
            <Outlet />
          </div>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          Andrey Bogdanovich 353504
        </Footer>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
