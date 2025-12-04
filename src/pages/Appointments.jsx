import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Badge,
  message,
  Modal,
  Form,
  Select,
  DatePicker,
  Button,
  Card,
  Tag,
  List,
  Divider,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  UserOutlined,
  ClockCircleOutlined,
  MedicineBoxOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const Appointments = () => {
  // --- Состояния данных ---
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [treatmentsList, setTreatmentsList] = useState([]); // Прайс-лист услуг

  // --- Состояния модальных окон ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

  // --- Выбранные элементы ---
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [appointmentDetails, setAppointmentDetails] = useState(null); // Детали (включая счет)

  const [form] = Form.useForm();
  const [completeForm] = Form.useForm();

  // 1. ЗАГРУЗКА ВСЕХ ДАННЫХ
  const fetchAllData = async () => {
    try {
      const [appRes, patRes, dentRes, roomRes, treatRes] = await Promise.all([
        fetch('http://localhost:5000/api/appointments'),
        fetch('http://localhost:5000/api/patients'),
        fetch('http://localhost:5000/api/dentists'),
        fetch('http://localhost:5000/api/rooms'),
        fetch('http://localhost:5000/api/treatments'),
      ]);

      if (appRes.ok) setAppointments(await appRes.json());
      if (patRes.ok) setPatients(await patRes.json());
      if (dentRes.ok) setDentists(await dentRes.json());
      if (roomRes.ok) setRooms(await roomRes.json());
      if (treatRes.ok) setTreatmentsList(await treatRes.json());
    } catch (error) {
      message.error('Ошибка загрузки данных');
      console.error(error);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // 2. ЗАГРУЗКА ДЕТАЛЕЙ ОДНОГО ПРИЕМА (включая услуги)
  const fetchDetails = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/appointments/${id}`);
      if (res.ok) {
        const data = await res.json();
        setAppointmentDetails(data);
      }
    } catch (error) {
      console.error('Ошибка при загрузке деталей:', error);
    }
  };

  // 3. СОЗДАНИЕ НОВОЙ ЗАПИСИ
  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const formattedValues = {
        ...values,
        date_time: values.date_time.format('YYYY-MM-DD HH:mm:ss'),
      };

      const res = await fetch('http://localhost:5000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedValues),
      });

      if (res.ok) {
        message.success('Запись создана');
        setIsAddModalOpen(false);
        form.resetFields();
        fetchAllData();
      } else {
        message.error('Ошибка создания');
      }
    } catch (e) {
      console.log('Validation Error:', e);
    }
  };

  // 4. ОТКРЫТИЕ ДЕТАЛЕЙ (Клик по календарю)
  const openDetails = (app) => {
    setSelectedAppointment(app);
    setAppointmentDetails(null); // Сброс перед загрузкой
    fetchDetails(app.id); // Загружаем свежие данные (с услугами)
    setIsDetailModalOpen(true);
  };

  // 5. ОТКРЫТИЕ ОКНА ЗАВЕРШЕНИЯ
  const openCompleteModal = () => {
    setIsDetailModalOpen(false); // Закрываем детали
    setIsCompleteModalOpen(true); // Открываем форму завершения
    completeForm.resetFields();
  };

  // 6. ЗАВЕРШЕНИЕ ПРИЕМА (Отправка услуг на сервер)
  const handleComplete = async () => {
    try {
      const values = await completeForm.validateFields();
      // values.treatments - массив ID, например [1, 5]

      const res = await fetch(
        `http://localhost:5000/api/appointments/${selectedAppointment.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'completed',
            treatments: values.treatments, // Отправляем список услуг
          }),
        }
      );

      if (res.ok) {
        message.success('Прием завершен, услуги сохранены!');
        setIsCompleteModalOpen(false);
        fetchAllData(); // Обновляем календарь
      } else {
        message.error('Ошибка сохранения');
      }
    } catch (error) {
      console.log('Validation Error:', error);
    }
  };

  // 7. ПРОСТОЕ ОБНОВЛЕНИЕ СТАТУСА (Например, Отмена или Возврат)
  const updateStatus = async (status) => {
    if (!selectedAppointment) return;
    try {
      const res = await fetch(
        `http://localhost:5000/api/appointments/${selectedAppointment.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }), // Без treatments, просто статус
        }
      );

      if (res.ok) {
        message.success(`Статус обновлен: ${status}`);
        setIsDetailModalOpen(false);
        fetchAllData();
      }
    } catch (error) {
      message.error('Ошибка сети');
    }
  };

  // 8. ПОДСЧЕТ ИТОГОВОЙ СУММЫ
  const calculateTotal = () => {
    if (!appointmentDetails || !appointmentDetails.treatments) return 0;
    return appointmentDetails.treatments.reduce(
      (sum, t) => sum + Number(t.cost),
      0
    );
  };

  // 9. РЕНДЕР ЯЧЕЙКИ КАЛЕНДАРЯ
  const dateCellRender = (value) => {
    const dateString = value.format('YYYY-MM-DD');
    const list = appointments.filter(
      (a) => dayjs(a.date_time).format('YYYY-MM-DD') === dateString
    );

    return (
      <ul className="m-0 p-0 list-none">
        {list.map((item) => {
          let statusType = 'processing';
          if (item.status === 'completed') statusType = 'success';
          if (item.status === 'canceled') statusType = 'error';

          return (
            <li
              key={item.id}
              onClick={(e) => {
                e.stopPropagation();
                openDetails(item);
              }}
              className="mb-1 cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors"
            >
              <Badge
                status={statusType}
                text={
                  <span className="text-xs">
                    <b>{dayjs(item.date_time).format('HH:mm')}</b> {item.p_last}
                  </span>
                }
              />
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div>
      {/* ЗАГОЛОВОК И КНОПКА ДОБАВЛЕНИЯ */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold m-0">Журнал записи</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Записать пациента
        </Button>
      </div>

      {/* КАЛЕНДАРЬ */}
      <Card>
        <Calendar dateCellRender={dateCellRender} />
      </Card>

      {/* МОДАЛКА 1: СОЗДАНИЕ ЗАПИСИ */}
      <Modal
        title="Новая запись"
        open={isAddModalOpen}
        onOk={handleCreate}
        onCancel={() => setIsAddModalOpen(false)}
        okText="Создать"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="patient_id"
            label="Пациент"
            rules={[{ required: true, message: 'Выберите пациента' }]}
          >
            <Select
              showSearch
              placeholder="Поиск по фамилии..."
              optionFilterProp="children"
            >
              {patients.map((p) => (
                <Select.Option key={p.id} value={p.id}>
                  {p.last_name} {p.first_name} ({p.phone_number})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="dentist_id"
            label="Врач"
            rules={[{ required: true, message: 'Выберите врача' }]}
          >
            <Select placeholder="Врач...">
              {dentists.map((d) => (
                <Select.Option key={d.id} value={d.id}>
                  {d.last_name} ({d.specialization})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="date_time"
              label="Время"
              rules={[{ required: true, message: 'Укажите время' }]}
            >
              <DatePicker
                showTime
                format="YYYY-MM-DD HH:mm"
                className="w-full"
              />
            </Form.Item>
            <Form.Item
              name="room_id"
              label="Кабинет"
              rules={[{ required: true, message: 'Выберите кабинет' }]}
            >
              <Select placeholder="№">
                {rooms.map((r) => (
                  <Select.Option key={r.id} value={r.id}>
                    {r.number}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* МОДАЛКА 2: ЗАВЕРШЕНИЕ ПРИЕМА (ВЫБОР УСЛУГ) */}
      <Modal
        title="Завершение приема"
        open={isCompleteModalOpen}
        onOk={handleComplete}
        onCancel={() => setIsCompleteModalOpen(false)}
        okText="Сохранить и выставить счет"
        cancelText="Назад"
      >
        <p className="text-gray-500 mb-4">
          Отметьте процедуры, которые были выполнены во время приема. Эти данные
          сформируют итоговый счет.
        </p>
        <Form form={completeForm} layout="vertical">
          <Form.Item
            name="treatments"
            rules={[
              { required: true, message: 'Выберите хотя бы одну процедуру' },
            ]}
          >
            <Select
              mode="multiple"
              placeholder="Выберите услуги из прайса..."
              style={{ width: '100%' }}
              optionLabelProp="label"
            >
              {treatmentsList.map((t) => (
                <Select.Option key={t.id} value={t.id} label={t.name}>
                  <div className="flex justify-between w-full">
                    <span>{t.name}</span>
                    <span className="text-gray-400 font-bold">
                      {t.cost} BYN
                    </span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* МОДАЛКА 3: ДЕТАЛИ И ПРОСМОТР СЧЕТА */}
      <Modal
        title="Карточка приема"
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={null}
        width={600}
      >
        {selectedAppointment && (
          <div>
            {/* Шапка карточки */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {selectedAppointment.p_last} {selectedAppointment.p_first}
                </Typography.Title>
                <span className="text-gray-500">Пациент</span>
              </div>
              <Tag
                color={
                  selectedAppointment.status === 'completed'
                    ? 'green'
                    : selectedAppointment.status === 'canceled'
                    ? 'red'
                    : 'blue'
                }
                style={{ fontSize: '14px', padding: '4px 10px' }}
              >
                {selectedAppointment.status === 'completed' && 'Завершен'}
                {selectedAppointment.status === 'scheduled' && 'Запланирован'}
                {selectedAppointment.status === 'canceled' && 'Отменен'}
              </Tag>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* Инфо о враче и времени */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="mb-1 text-gray-500">
                  <MedicineBoxOutlined /> Врач:
                </p>
                <p className="font-medium">
                  {selectedAppointment.d_last} {selectedAppointment.d_first}
                </p>
                <p className="text-xs text-gray-400">
                  {selectedAppointment.specialization}
                </p>
              </div>
              <div>
                <p className="mb-1 text-gray-500">
                  <ClockCircleOutlined /> Время:
                </p>
                <p className="font-medium text-lg">
                  {dayjs(selectedAppointment.date_time).format(
                    'DD.MM.YYYY HH:mm'
                  )}
                </p>
              </div>
            </div>

            {selectedAppointment.status === 'completed' ? (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-bold mb-3 flex items-center text-gray-700">
                  <DollarOutlined className="mr-2" /> Оказанные услуги (Счет):
                </h4>

                {appointmentDetails?.treatments &&
                appointmentDetails.treatments.length > 0 ? (
                  <>
                    <List
                      size="small"
                      dataSource={appointmentDetails.treatments}
                      renderItem={(item) => (
                        <List.Item>
                          <div className="flex justify-between w-full">
                            <span>{item.name}</span>
                            <b>{item.cost} BYN</b>
                          </div>
                        </List.Item>
                      )}
                    />
                    <div className="border-t border-gray-300 mt-3 pt-3 flex justify-between text-lg font-bold">
                      <span>ИТОГО:</span>
                      <span className="text-blue-600">
                        {calculateTotal().toFixed(2)} BYN
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-red-500 italic">
                    Услуги не были указаны при завершении.
                  </p>
                )}
              </div>
            ) : selectedAppointment.status === 'canceled' ? (
              <div className="alert alert-error text-red-500 text-center py-4 bg-red-50 rounded border border-red-100">
                Прием был отменен.
              </div>
            ) : (
              <div className="alert alert-info text-gray-500 text-center py-4 bg-gray-100 rounded border border-gray-200">
                Прием еще не проведен. Счет будет сформирован после завершения.
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              {selectedAppointment.status === 'scheduled' && (
                <>
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={() => updateStatus('canceled')}
                  >
                    Отменить запись
                  </Button>
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={openCompleteModal}
                  >
                    Завершить прием
                  </Button>
                </>
              )}

              {selectedAppointment.status !== 'scheduled' && (
                <Button
                  icon={<RollbackOutlined />}
                  onClick={() => updateStatus('scheduled')}
                >
                  Вернуть в работу
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Appointments;
