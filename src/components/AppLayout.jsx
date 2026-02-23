import React, { useState } from 'react';
import { Layout, Menu, theme, Button } from 'antd';
import {
  UserOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  DashboardOutlined,
  TeamOutlined,
  SmileOutlined,
  InboxOutlined,
  SafetyCertificateOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Header, Content, Footer, Sider } = Layout;

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth(); // Достаем юзера и функцию выхода

  // Добавляем массив ролей, которым доступен каждый пункт меню
  const allMenuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Главная панель',
      roles: ['admin', 'dentist', 'assistant'],
    },
    {
      key: '/patients',
      icon: <UserOutlined />,
      label: 'Пациенты',
      roles: ['admin', 'dentist', 'assistant'],
    },
    {
      key: '/appointments',
      icon: <CalendarOutlined />,
      label: 'Приёмы',
      roles: ['admin', 'dentist', 'assistant'],
    },
    {
      key: '/treatments',
      icon: <MedicineBoxOutlined />,
      label: 'Лечение',
      roles: ['admin', 'dentist'],
    },
    {
      key: '/inventory',
      icon: <InboxOutlined />,
      label: 'Склад',
      roles: ['admin', 'assistant'],
    },
    {
      key: '/dentists',
      icon: <TeamOutlined />,
      label: 'Стоматологи',
      roles: ['admin'],
    },
    {
      key: '/assistants',
      icon: <SmileOutlined />,
      label: 'Ассистенты',
      roles: ['admin'],
    },
    {
      key: '/logs',
      icon: <SafetyCertificateOutlined />,
      label: 'Аудит',
      roles: ['admin'],
    },
  ];

  // Фильтруем меню в зависимости от роли текущего юзера
  const menuItems = allMenuItems.filter((item) =>
    item.roles.includes(user?.role)
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
      >
        <div className="h-16 m-4 bg-white/20 rounded flex flex-col items-center justify-center text-white font-bold">
          {collapsed ? 'DC' : 'Dental Clinic'}
          {!collapsed && (
            <span className="text-xs font-normal opacity-70 mt-1">
              Роль: {user?.role}
            </span>
          )}
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
        <Header
          style={{
            padding: '0 24px',
            background: token.colorBgContainer,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            danger
          >
            Выйти
          </Button>
        </Header>
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
