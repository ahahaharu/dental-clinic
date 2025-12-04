import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  message,
  Input,
  Modal,
  Form,
  InputNumber,
  Space,
  Popconfirm,
  Tag,
  Select,
  Divider,
  Spin,
  Descriptions,
  List,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MinusCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';

const Treatments = () => {
  const [treatments, setTreatments] = useState([]);

  const [materialsList, setMaterialsList] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);

  // Состояния загрузки
  const [loading, setLoading] = useState(false); // Для таблицы
  const [loadingDetails, setLoadingDetails] = useState(false); // Для модалки

  // Модалка Редактирования/Создания
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Модалка Просмотра
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewData, setViewData] = useState(null);

  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  // --- 1. Загрузка данных ---
  const fetchTreatments = async (search = '') => {
    setLoading(true);
    try {
      const url = search
        ? `http://localhost:5000/api/treatments?search=${search}`
        : 'http://localhost:5000/api/treatments';
      const res = await fetch(url);
      setTreatments(await res.json());
    } catch (error) {
      message.error('Ошибка загрузки прайс-листа');
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async () => {
    try {
      const [matRes, eqRes] = await Promise.all([
        fetch('http://localhost:5000/api/materials'),
        fetch('http://localhost:5000/api/equipment'),
      ]);
      setMaterialsList(await matRes.json());
      setEquipmentList(await eqRes.json());
    } catch (e) {
      console.error('Ошибка загрузки ресурсов', e);
    }
  };

  useEffect(() => {
    fetchTreatments();
    fetchResources();
  }, []);

  const onSearch = (value) => {
    setSearchText(value);
    fetchTreatments(value);
  };

  // --- 2. Логика Редактирования/Создания ---
  const showEditModal = async (record = null) => {
    setEditingId(record ? record.id : null);
    form.resetFields(); // <-- ВАЖНО: Сначала очищаем форму
    setIsModalOpen(true);

    if (record) {
      setLoadingDetails(true); // Включаем спиннер
      try {
        // Подгружаем полные данные (включая материалы и оборудование)
        const res = await fetch(
          `http://localhost:5000/api/treatments/${record.id}`
        );
        const data = await res.json();

        // Устанавливаем значения в форму
        form.setFieldsValue({
          ...data,
          // Если массив materials пустой или null, ставим []
          materials: data.materials || [],
          equipment: data.equipment || [],
        });
      } catch (e) {
        message.error('Не удалось загрузить детали');
      } finally {
        setLoadingDetails(false); // Выключаем спиннер
      }
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const url = editingId
        ? `http://localhost:5000/api/treatments/${editingId}`
        : 'http://localhost:5000/api/treatments';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (res.ok) {
        message.success(editingId ? 'Услуга обновлена' : 'Услуга добавлена');
        setIsModalOpen(false);
        fetchTreatments(searchText);
      } else {
        message.error(data.error || 'Ошибка сохранения');
      }
    } catch (error) {
      console.log('Validation failed:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/treatments/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        message.success('Услуга удалена');
        fetchTreatments(searchText);
      } else {
        const data = await res.json();
        message.error(data.error || 'Ошибка удаления');
      }
    } catch (error) {
      message.error('Ошибка сети');
    }
  };

  // --- 3. Логика Просмотра (View Details) ---
  const showViewModal = async (record) => {
    setIsViewModalOpen(true);
    setViewData(null); // Сброс перед загрузкой
    setLoadingDetails(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/treatments/${record.id}`
      );
      const data = await res.json();
      setViewData(data);
    } catch (error) {
      message.error('Не удалось загрузить данные');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Вспомогательная функция для получения имени материала по ID
  const getMaterialName = (id) => {
    const m = materialsList.find((item) => item.id === id);
    return m ? m.name : 'Неизвестный материал';
  };

  // Вспомогательная функция для получения имени оборудования по ID
  const getEquipmentName = (id) => {
    const e = equipmentList.find((item) => item.id === id);
    return e
      ? `${e.name} (SN: ${e.serial_number})`
      : 'Неизвестное оборудование';
  };

  const columns = [
    {
      title: 'Название процедуры',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <b>{text}</b>,
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Длительность',
      dataIndex: 'duration',
      key: 'duration',
      render: (mins) => <Tag color="blue">{mins} мин.</Tag>,
    },
    {
      title: 'Стоимость',
      dataIndex: 'cost',
      key: 'cost',
      render: (cost) => <span>{Number(cost).toFixed(2)} BYN</span>,
    },
    {
      title: 'Действия',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          {/* Кнопка ПРОСМОТРА */}
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => showViewModal(record)}
            title="Просмотр деталей"
          />
          {/* Кнопка РЕДАКТИРОВАНИЯ */}
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
            title="Редактировать"
          />
          <Popconfirm
            title="Удалить?"
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
        <h2 className="text-2xl font-bold m-0">Прайс-лист услуг</h2>
        <Input.Search
          placeholder="Поиск услуги..."
          allowClear
          onSearch={onSearch}
          onChange={(e) => onSearch(e.target.value)}
          style={{ width: 300 }}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => showEditModal(null)}
        >
          Добавить услугу
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={treatments}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 8 }}
      />

      {/* --- МОДАЛКА РЕДАКТИРОВАНИЯ/СОЗДАНИЯ --- */}
      <Modal
        title={editingId ? 'Редактирование услуги' : 'Новая услуга'}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={() => setIsModalOpen(false)}
        okText="Сохранить"
        cancelText="Отмена"
        width={700}
      >
        <Spin spinning={loadingDetails}>
          <Form form={form} layout="vertical">
            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                name="name"
                label="Название"
                rules={[{ required: true, message: 'Введите название' }]}
              >
                <Input placeholder="Например: Лечение пульпита" />
              </Form.Item>
              <Form.Item name="description" label="Описание">
                <Input placeholder="Краткое описание" />
              </Form.Item>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                name="duration"
                label="Длительность (мин)"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name="cost"
                label="Стоимость (BYN)"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={0}
                  precision={2}
                  style={{ width: '100%' }}
                  prefix="BYN"
                />
              </Form.Item>
            </div>

            <Divider orientation="left">Технологическая карта</Divider>

            {/* МАТЕРИАЛЫ */}
            <p className="font-bold mb-2">Расходные материалы:</p>
            <Form.List name="materials">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space
                      key={key}
                      style={{ display: 'flex', marginBottom: 8 }}
                      align="baseline"
                    >
                      <Form.Item
                        {...restField}
                        name={[name, 'id']}
                        rules={[
                          { required: true, message: 'Выберите материал' },
                        ]}
                        style={{ width: '300px' }}
                      >
                        <Select placeholder="Материал">
                          {materialsList.map((m) => (
                            <Select.Option key={m.id} value={m.id}>
                              {m.name} (Остаток: {m.quantity})
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'quantity']}
                        rules={[{ required: true, message: 'Кол-во' }]}
                      >
                        <InputNumber min={1} placeholder="Кол-во" />
                      </Form.Item>
                      <MinusCircleOutlined onClick={() => remove(name)} />
                    </Space>
                  ))}
                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<PlusOutlined />}
                    >
                      Добавить материал
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>

            <Form.Item name="equipment" label="Необходимое оборудование">
              <Select mode="multiple" placeholder="Выберите оборудование">
                {equipmentList.map((e) => (
                  <Select.Option key={e.id} value={e.id}>
                    {e.name} (SN: {e.serial_number})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </Spin>
      </Modal>

      <Modal
        title="Информация об услуге"
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsViewModalOpen(false)}>
            Закрыть
          </Button>,
        ]}
        width={600}
      >
        <Spin spinning={loadingDetails}>
          {viewData && (
            <div>
              <Descriptions
                title={viewData.name}
                bordered
                column={1}
                size="small"
              >
                <Descriptions.Item label="Описание">
                  {viewData.description || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Длительность">
                  {viewData.duration} мин.
                </Descriptions.Item>
                <Descriptions.Item label="Стоимость">
                  {Number(viewData.cost).toFixed(2)} BYN
                </Descriptions.Item>
              </Descriptions>

              <Divider orientation="left" style={{ fontSize: '14px' }}>
                Расходные материалы
              </Divider>
              {viewData.materials && viewData.materials.length > 0 ? (
                <List
                  size="small"
                  bordered
                  dataSource={viewData.materials}
                  renderItem={(item) => (
                    <List.Item>
                      <div className="flex justify-between w-full">
                        <span>{getMaterialName(item.id)}</span>
                        <Tag>{item.quantity} шт.</Tag>
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <p className="text-gray-500 italic">Материалы не требуются</p>
              )}

              <Divider orientation="left" style={{ fontSize: '14px' }}>
                Оборудование
              </Divider>
              {viewData.equipment && viewData.equipment.length > 0 ? (
                <List
                  size="small"
                  bordered
                  dataSource={viewData.equipment}
                  renderItem={(equipId) => (
                    <List.Item>
                      <span>{getEquipmentName(equipId)}</span>
                    </List.Item>
                  )}
                />
              ) : (
                <p className="text-gray-500 italic">
                  Оборудование не требуется
                </p>
              )}
            </div>
          )}
        </Spin>
      </Modal>
    </div>
  );
};

export default Treatments;
