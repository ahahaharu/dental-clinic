import React, { useState, useEffect } from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  message,
  Input,
  Modal,
  Form,
  DatePicker,
  Select,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [form] = Form.useForm();

  const fetchPatients = async (query = '') => {
    setLoading(true);
    try {
      const url = query
        ? `http://localhost:5000/api/patients?search=${query}`
        : 'http://localhost:5000/api/patients';

      const response = await fetch(url);
      const data = await response.json();
      setPatients(data);
    } catch (error) {
      message.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const onSearch = (value) => {
    setSearchText(value);
    fetchPatients(value);
  };

  const showAddModal = () => {
    setEditingPatient(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const showEditModal = (record) => {
    setEditingPatient(record);
    form.setFieldsValue({
      ...record,
      birth_date: record.birth_date ? dayjs(record.birth_date) : null,
    });
    setIsModalOpen(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      const formattedValues = {
        ...values,
        birth_date: values.birth_date
          ? values.birth_date.format('YYYY-MM-DD')
          : null,
      };

      let url = 'http://localhost:5000/api/patients';
      let method = 'POST';

      if (editingPatient) {
        url = `http://localhost:5000/api/patients/${editingPatient.id}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedValues),
      });

      if (response.ok) {
        message.success(
          editingPatient ? 'Пациент обновлен' : 'Пациент добавлен'
        );
        setIsModalOpen(false);
        fetchPatients(searchText);
      } else {
        message.error('Ошибка при сохранении');
      }
    } catch (error) {
      console.log('Validate Failed:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/api/patients/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        message.success('Пациент удален');
        fetchPatients(searchText);
      } else {
        message.error('Ошибка удаления');
      }
    } catch (error) {
      message.error('Ошибка сети');
    }
  };

  const columns = [
    {
      title: 'Фамилия Имя',
      key: 'name',
      render: (_, record) => (
        <b>
          {record.last_name} {record.first_name}
        </b>
      ),
    },
    {
      title: 'Телефон',
      dataIndex: 'phone_number',
      key: 'phone_number',
    },
    {
      title: 'Пол',
      dataIndex: 'gender',
      key: 'gender',
      render: (gender) => (
        <Tag
          color={
            gender === 'M' ? 'blue' : gender === 'F' ? 'magenta' : 'orange'
          }
        >
          {gender}
        </Tag>
      ),
    },
    {
      title: 'Дата рождения',
      dataIndex: 'birth_date',
      key: 'birth_date',
      render: (date) => (date ? new Date(date).toLocaleDateString() : '-'),
    },
    {
      title: 'Действия',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
          />
          <Popconfirm
            title="Удалить пациента?"
            description="Это действие нельзя отменить."
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-4">
        <h2 className="text-2xl font-bold m-0">Пациенты</h2>

        <Input.Search
          placeholder="Поиск по имени или телефону"
          allowClear
          onChange={(e) => onSearch(e.target.value)}
          onSearch={onSearch}
          style={{ width: 300 }}
        />

        <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>
          Новый пациент
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={patients}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 6 }}
      />

      <Modal
        title={editingPatient ? 'Редактировать пациента' : 'Новый пациент'}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={() => setIsModalOpen(false)}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical" name="patient_form">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="first_name"
              label="Имя"
              rules={[{ required: true, message: 'Введите имя' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="last_name"
              label="Фамилия"
              rules={[{ required: true, message: 'Введите фамилию' }]}
            >
              <Input />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="phone_number"
              label="Телефон"
              rules={[{ required: true, message: 'Введите телефон' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="birth_date"
              label="Дата рождения"
              rules={[{ required: true, message: 'Выберите дату' }]}
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </div>

          <Form.Item
            name="gender"
            label="Пол"
            rules={[{ required: true, message: 'Выберите пол' }]}
          >
            <Select>
              <Select.Option value="M">Мужской</Select.Option>
              <Select.Option value="F">Женский</Select.Option>
              <Select.Option value="O">Другой</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[{ type: 'email', message: 'Некорректный email' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="Address" label="Адрес">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Patients;
