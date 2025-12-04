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

const Dentists = () => {
  const [dentists, setDentists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDentist, setEditingDentist] = useState(null);
  const [form] = Form.useForm();

  const fetchDentists = async (search = '') => {
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/dentists?search=${search}`
      );
      const data = await res.json();
      setDentists(data);
    } catch (error) {
      message.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDentists();
  }, []);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const url = editingDentist
        ? `http://localhost:5000/api/dentists/${editingDentist.id}`
        : 'http://localhost:5000/api/dentists';
      const method = editingDentist ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success('Успешно сохранено');
        setIsModalOpen(false);
        fetchDentists();
      } else {
        message.error('Ошибка сохранения');
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/dentists/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        message.success('Удалено');
        fetchDentists();
      } else {
        // Скорее всего, нельзя удалить из-за foreign key
        message.error('Невозможно удалить: у врача есть записи');
      }
    } catch (e) {
      message.error('Ошибка сети');
    }
  };

  const openModal = (record = null) => {
    setEditingDentist(record);
    if (record) form.setFieldsValue(record);
    else form.resetFields();
    setIsModalOpen(true);
  };

  const columns = [
    {
      title: 'Врач',
      key: 'name',
      render: (_, r) => (
        <b>
          {r.last_name} {r.first_name}
        </b>
      ),
    },
    { title: 'Специализация', dataIndex: 'specialization', key: 'spec' },
    { title: 'Стаж (лет)', dataIndex: 'experience', key: 'exp' },
    { title: 'Лицензия', dataIndex: 'license_number', key: 'lic' },
    { title: 'График', dataIndex: 'schedule', key: 'sch' }, // <-- Пункт 4 лабы: График работы
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
        <h2 className="text-2xl font-bold">Стоматологи</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openModal(null)}
        >
          Добавить врача
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={dentists}
        rowKey="id"
        loading={loading}
      />

      <Modal
        open={isModalOpen}
        onOk={handleOk}
        onCancel={() => setIsModalOpen(false)}
        title="Стоматолог"
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
            name="specialization"
            label="Специализация"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="experience" label="Стаж">
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item
              name="license_number"
              label="№ Лицензии"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
          </div>
          <Form.Item name="schedule" label="График работы">
            <Input placeholder="Пн-Пт 9:00-18:00" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Dentists;
