import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../utils/api';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (res.ok) {
        message.success(`Добро пожаловать, ${data.user.username}!`);
        login(data.user, data.token);
        navigate('/');
      } else {
        setErrorMsg(data.message || 'Ошибка входа');
      }
    } catch (error) {
      setErrorMsg('Ошибка соединения с сервером. Проверьте подключение.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md shadow-lg rounded-lg">
        <div className="text-center mb-6">
          <Typography.Title level={3}>Dental Clinic</Typography.Title>
          <Typography.Text type="secondary">
            Войдите в систему управления
          </Typography.Text>
        </div>

        {errorMsg && (
          <Alert
            message="Ошибка авторизации"
            description={errorMsg}
            type="error"
            showIcon
            style={{ marginBottom: '1rem' }}
          />
        )}

        <Form name="login" onFinish={onFinish} layout="vertical" size="large">
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Пожалуйста, введите логин!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Логин" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Пожалуйста, введите пароль!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Пароль" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full"
              loading={loading}
            >
              Войти
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
