import React, { useState, useEffect } from 'react';
import {
  Table,
  Space,
  Button,
  message,
  Input,
  Modal,
  Form,
  Popconfirm,
  InputNumber,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const Assistants = () => {
  const [assistants, setAssistants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState(null);
  const [form] = Form.useForm();

  const fetchAssistants = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/assistants');
      const data = await res.json();
      setAssistants(data);
    } catch (error) {
      message.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssistants();
  }, []);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const url = editingAssistant
        ? `http://localhost:5000/api/assistants/${editingAssistant.id}`
        : 'http://localhost:5000/api/assistants';
      const method = editingAssistant ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success('Сохранено');
        setIsModalOpen(false);
        fetchAssistants();
      } else {
        message.error('Ошибка');
      }
    } catch (e) {
      console.log(e);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/assistants/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        message.success('Удалено');
        fetchAssistants();
      } else {
        message.error('Нельзя удалить (связанные данные)');
      }
    } catch (e) {
      message.error('Ошибка сети');
    }
  };

  const openModal = (r = null) => {
    setEditingAssistant(r);
    if (r) form.setFieldsValue(r);
    else form.resetFields();
    setIsModalOpen(true);
  };

  const columns = [
    {
      title: 'Ассистент',
      key: 'name',
      render: (_, r) => (
        <b>
          {r.last_name} {r.first_name}
        </b>
      ),
    },
    { title: 'Должность', dataIndex: 'position', key: 'pos' },
    { title: 'Стаж (лет)', dataIndex: 'experience', key: 'exp' },
    {
      title: 'Действия',
      key: 'act',
      render: (_, r) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openModal(r)} />
          <Popconfirm title="Удалить?" onConfirm={() => handleDelete(r.id)}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-2xl font-bold">Ассистенты</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openModal(null)}
        >
          Добавить
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={assistants}
        rowKey="id"
        loading={loading}
      />

      <Modal
        open={isModalOpen}
        onOk={handleOk}
        onCancel={() => setIsModalOpen(false)}
        title="Ассистент"
      >
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="first_name"
              label="Имя"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="last_name"
              label="Фамилия"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
          </div>
          <Form.Item
            name="position"
            label="Должность"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="experience" label="Стаж">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Assistants;
