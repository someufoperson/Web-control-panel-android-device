// src/pages/CreateDevicePage.jsx
import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import toast from 'react-hot-toast';
import { FiRefreshCw } from 'react-icons/fi';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  background-color: #0e1215;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
`;

const Title = styled.h2`
  font-size: 24px;
  margin-bottom: 28px;
  color: #e0ecf0;
`;

const Field = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #a0b3ba;
`;

const Select = styled.select`
  background-color: #1e2428;
  border: 1px solid #313d45;
  border-radius: 6px;
  padding: 10px 14px;
  color: #fff;
  font-size: 14px;
  width: 100%;
  appearance: none;
  cursor: pointer;

  &:focus {
    border-color: #3b8c7a;
    outline: none;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  option {
    background-color: #1e2428;
    color: #fff;
  }
`;

const ErrorMessage = styled.div`
  color: #e06c6c;
  font-size: 13px;
  margin-top: 6px;
`;

const RefreshButton = styled(Button)`
  margin-left: 12px;
`;

const CreateDevicePage = () => {
  const [serialOptions, setSerialOptions] = useState([]);
  const [form, setForm] = useState({
    serial_number: '',
    label: '',
  });
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const fetchSerials = useCallback(
    async (isManual = false) => {
      if (isManual) {
        setIsManualRefreshing(true);
      }

      setFetchError('');
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch('http://localhost:8000/v1/devices/not-auth-devices', {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Получены серийные номера:', data);

        const newOptions = Array.isArray(data) ? data : [];

        setSerialOptions(newOptions);

        setForm((prev) => {
          if (prev.serial_number && newOptions.includes(prev.serial_number)) {
            return prev;
          }
          return {
            ...prev,
            serial_number: newOptions.length > 0 ? newOptions[0] : '',
          };
        });
      } catch (error) {
        console.error('❌ Ошибка загрузки серийных номеров:', error);
        setFetchError('Не удалось загрузить список серийных номеров');
        if (!isManual) {
        } else {
          toast.error('Ошибка загрузки списка устройств');
        }
      } finally {
        setIsInitialLoading(false);
        if (isManual) {
          setIsManualRefreshing(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    fetchSerials(false); // не ручное
    const intervalId = setInterval(() => fetchSerials(false), 1000);
    return () => clearInterval(intervalId);
  }, [fetchSerials]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.serial_number) {
      toast.error('Выберите серийный номер');
      return;
    }
    if (!form.label.trim()) {
      toast.error('Введите метку (Label)');
      return;
    }

    const loadingToast = toast.loading('Создание устройства...');

    try {
      const response = await fetch('http://localhost:8000/v1/devices/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serial_number: form.serial_number,
          label: form.label.trim(),
        }),
      });

      const responseData = await response.json().catch(() => ({}));
      console.log('Ответ сервера:', response.status, responseData);

      if (response.status === 201) {
        toast.success('Устройство успешно создано', { id: loadingToast });
        setForm((prev) => ({ ...prev, label: '' }));
        fetchSerials(false);
      } else if (response.status === 400) {
        const errorMsg = responseData.error || responseData.message || 'Ошибка валидации';
        toast.error(`❌ Ошибка: ${errorMsg}`, { id: loadingToast });
      } else {
        toast.error(`❌ Неизвестная ошибка (код ${response.status})`, { id: loadingToast });
      }
    } catch (error) {
      console.error('❌ Ошибка создания устройства:', error);
      toast.error('Сетевая ошибка. Проверьте подключение к серверу.', { id: loadingToast });
    }
  };

  const handleManualRefresh = () => {
    fetchSerials(true);
  };

  return (
    <Container>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Title>Добавить устройство в базу данных</Title>
        </div>

      <form onSubmit={handleSubmit}>
        <Field>
          <Label>Серийный номер</Label>
          {fetchError && serialOptions.length === 0 ? (
            <ErrorMessage>{fetchError}</ErrorMessage>
          ) : (
            <Select
              name="serial_number"
              value={form.serial_number}
              onChange={handleChange}
              required
              disabled={isInitialLoading} 
            >
              {isInitialLoading ? (
                <option value="">Загрузка доступных устройств...</option>
              ) : serialOptions.length === 0 ? (
                <option value="">Нет доступных устройств</option>
              ) : (
                serialOptions.map((sn) => (
                  <option key={sn} value={sn}>
                    {sn}
                  </option>
                ))
              )}
            </Select>
          )}
        </Field>

        <Field>
          <Label>ФИО</Label>
          <Input
            name="label"
            value={form.label}
            onChange={handleChange}
            placeholder="Введите ФИО (например, Иванов Иван)"
            required
          />
        </Field>

        <Button
          type="submit"
          variant="primary"
          style={{ width: '100%', marginTop: 20 }}
          disabled={isInitialLoading || serialOptions.length === 0}
        >
          Добавить устройство
        </Button>
      </form>
    </Container>
  );
};

export default CreateDevicePage;