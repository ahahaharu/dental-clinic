import React, { useState, useEffect } from 'react';
import {
  Tabs,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  message,
  Tag,
  Space,
  Select,
  Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const Inventory = () => {
  const [materials, setMaterials] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isMatModalOpen, setIsMatModalOpen] = useState(false);
  const [isEquipModalOpen, setIsEquipModalOpen] = useState(false);

  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [matRes, equipRes, roomRes] = await Promise.all([
        fetch('http://localhost:5000/api/materials'),
        fetch('http://localhost:5000/api/equipment'),
        fetch('http://localhost:5000/api/rooms'),
      ]);
      setMaterials(await matRes.json());
      setEquipment(await equipRes.json());
      setRooms(await roomRes.json());
    } catch (error) {
      message.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openMatModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      form.setFieldsValue({
        ...item,
        expiration_date: item.expiration_date
          ? dayjs(item.expiration_date)
          : null,
      });
    } else {
      form.resetFields();
    }
    setIsMatModalOpen(true);
  };

  const handleMaterialOk = async () => {
    try {
      const values = await form.validateFields();
      const formattedValues = {
        ...values,
        expiration_date: values.expiration_date
          ? values.expiration_date.format('YYYY-MM-DD')
          : null,
      };

      const url = editingItem
        ? `http://localhost:5000/api/materials/${editingItem.id}`
        : 'http://localhost:5000/api/materials';
      const method = editingItem ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedValues),
      });
      message.success('Сохранено');
      setIsMatModalOpen(false);
      fetchData();
    } catch (e) {
      message.error('Ошибка');
    }
  };

  const deleteMaterial = async (id) => {
    await fetch(`http://localhost:5000/api/materials/${id}`, {
      method: 'DELETE',
    });
    message.success('Удалено');
    fetchData();
  };

  const openEquipModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      form.setFieldsValue({
        ...item,
        date_of_purchase: item.date_of_purchase
          ? dayjs(item.date_of_purchase)
          : null,
      });
    } else {
      form.resetFields();
    }
    setIsEquipModalOpen(true);
  };

  const handleEquipOk = async () => {
    try {
      const values = await form.validateFields();
      const formattedValues = {
        ...values,
        date_of_purchase: values.date_of_purchase
          ? values.date_of_purchase.format('YYYY-MM-DD')
          : null,
      };

      const url = editingItem
        ? `http://localhost:5000/api/equipment/${editingItem.id}`
        : 'http://localhost:5000/api/equipment';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedValues),
      });

      if (res.ok) {
        message.success('Оборудование сохранено');
        setIsEquipModalOpen(false);
        fetchData();
      } else {
        message.error('Ошибка сохранения');
      }
    } catch (e) {
      message.error('Проверьте поля формы');
    }
  };

  const deleteEquipment = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/equipment/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        message.success('Оборудование удалено');
        fetchData();
      } else {
        message.error('Невозможно удалить');
      }
    } catch (e) {
      message.error('Ошибка сети');
    }
  };

  const materialColumns = [
    { title: 'Название', dataIndex: 'name', key: 'name' },
    {
      title: 'Кол-во',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (q) => <b className={q < 10 ? 'text-red-500' : ''}>{q}</b>,
    },
    {
      title: 'Годен до',
      dataIndex: 'expiration_date',
      render: (d) => (d ? dayjs(d).format('DD.MM.YYYY') : '-'),
    },
    {
      title: 'Действия',
      render: (_, r) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openMatModal(r)} />
          <Popconfirm title="Удалить?" onConfirm={() => deleteMaterial(r.id)}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const equipmentColumns = [
    { title: 'Название', dataIndex: 'name', key: 'name' },
    { title: 'Серийный №', dataIndex: 'serial_number', key: 'sn' },
    {
      title: 'Статус',
      dataIndex: 'status',
      render: (s) => (
        <Tag
          color={s === 'working' ? 'green' : s === 'repair' ? 'orange' : 'red'}
        >
          {s}
        </Tag>
      ),
    },
    { title: 'Кабинет', dataIndex: 'room_number', render: (t) => `Каб. ${t}` },
    {
      title: 'Действия',
      key: 'action',
      render: (_, r) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEquipModal(r)} />
          <Popconfirm title="Удалить?" onConfirm={() => deleteEquipment(r.id)}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const items = [
    {
      key: '1',
      label: 'Материалы',
      children: (
        <>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openMatModal(null)}
            className="mb-4 float-right"
          >
            Добавить
          </Button>
          <Table
            columns={materialColumns}
            dataSource={materials}
            rowKey="id"
            loading={loading}
          />
        </>
      ),
    },
    {
      key: '2',
      label: 'Оборудование',
      children: (
        <>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openEquipModal(null)}
            className="mb-4 float-right"
          >
            Добавить
          </Button>
          <Table
            columns={equipmentColumns}
            dataSource={equipment}
            rowKey="id"
            loading={loading}
          />
        </>
      ),
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Склад</h2>
      <Tabs defaultActiveKey="1" items={items} />

      {/* Модалка Материалов */}
      <Modal
        title={editingItem ? 'Ред. материал' : 'Новый материал'}
        open={isMatModalOpen}
        onOk={handleMaterialOk}
        onCancel={() => setIsMatModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="quantity"
            label="Количество"
            rules={[{ required: true }]}
          >
            <InputNumber className="w-full" />
          </Form.Item>
          <Form.Item
            name="expiration_date"
            label="Годен до"
            rules={[{ required: true }]}
          >
            <DatePicker className="w-full" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модалка Оборудования */}
      <Modal
        title={editingItem ? 'Ред. оборудование' : 'Новое оборудование'}
        open={isEquipModalOpen}
        onOk={handleEquipOk}
        onCancel={() => setIsEquipModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="serial_number"
            label="Серийный №"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="date_of_purchase"
            label="Дата покупки"
            rules={[{ required: true }]}
          >
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="status" label="Статус" initialValue="working">
            <Select>
              <Select.Option value="working">Рабочее</Select.Option>
              <Select.Option value="repair">В ремонте</Select.Option>
              <Select.Option value="out_of_order">Списано</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="room_id"
            label="Кабинет"
            rules={[{ required: true }]}
          >
            <Select>
              {rooms.map((r) => (
                <Select.Option key={r.id} value={r.id}>
                  Кабинет {r.number}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Inventory;
