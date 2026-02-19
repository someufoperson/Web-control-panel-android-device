import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import toast from 'react-hot-toast';
import { FiRefreshCw } from 'react-icons/fi';
import Button from '../components/UI/Button';
import DevicesTable from '../components/DevicesTable/DevicesTable';

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 600;
  color: #f0f6fa;
`;

const Stats = styled.div`
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #a0b3ba;
`;

const RefreshButton = styled(Button)`
  margin-left: 0; /* убрали старый margin, так как теперь в группе */
`;

const DevicesPage = () => {
  const [devices, setDevices] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const [isAllSessionsUpLoading, setIsAllSessionsUpLoading] = useState(false);
  const [isAllSessionsDownLoading, setIsAllSessionsDownLoading] = useState(false);

  const fetchDevices = useCallback(
    async (isManual = false) => {
      if (isManual) setIsManualRefreshing(true);
      setFetchError('');

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch('http://localhost:8000/v1/devices/', {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        console.log('✅ Устройства получены:', data);
        setDevices(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('❌ Ошибка загрузки устройств:', error);
        setFetchError('Не удалось загрузить список устройств');
        if (isManual) toast.error('Ошибка загрузки устройств');
      } finally {
        setIsInitialLoading(false);
        if (isManual) setIsManualRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchDevices(false);
    const intervalId = setInterval(() => fetchDevices(false), 5000);
    return () => clearInterval(intervalId);
  }, [fetchDevices]);

  const handleAllSessionsUp = async () => {
    setIsAllSessionsUpLoading(true);
    const loadingToast = toast.loading('Начинается поднятие всех сессий...');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 сек

      const response = await fetch('http://localhost:8000/v1/devices/edit-all?status=ACTIVE', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        toast.success('✅ Все сессии успешно подняты', { id: loadingToast });
        // После успешного поднятия можно обновить список устройств
        fetchDevices(false);
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `Ошибка ${response.status}`);
      }
    } catch (error) {
      console.error('❌ All sessions up error:', error);
      if (error.name === 'AbortError') {
        toast.error('❌ Превышено время ожидания (30 сек). Сервер не отвечает.', {
          id: loadingToast,
        });
      } else {
        toast.error(`❌ Ошибка: ${error.message}`, { id: loadingToast });
      }
    } finally {
      setIsAllSessionsUpLoading(false);
    }
  };

  // --- Массовое отключение всех сессий ---
  const handleAllSessionsDown = async () => {
    setIsAllSessionsDownLoading(true);
    const loadingToast = toast.loading('Начинается отключение всех сессий...');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('http://localhost:8000/v1/devices/edit-all?status=INACTIVE', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        toast.success('✅ Все сессии успешно отключены', { id: loadingToast });
        fetchDevices(false);
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `Ошибка ${response.status}`);
      }
    } catch (error) {
      console.error('❌ All sessions down error:', error);
      if (error.name === 'AbortError') {
        toast.error('❌ Превышено время ожидания (30 сек). Сервер не отвечает.', {
          id: loadingToast,
        });
      } else {
        toast.error(`❌ Ошибка: ${error.message}`, { id: loadingToast });
      }
    } finally {
      setIsAllSessionsDownLoading(false);
    }
  };

  // --- Остальные обработчики (без изменений) ---
  const handleCopyLink = (device) => {
    const { serial_number, session_status } = device;
    const link = `http://localhost:5000/${serial_number}`;
    navigator.clipboard.writeText(link);

    if (session_status?.toUpperCase() === 'INACTIVE') {
      toast.error('Ссылка для управления устройством скопирована, но сервер этого устройства не активен!', {
        icon: '⚠️',
        duration: 5000,
      });
    } else {
      toast.success('Ссылка скопирована');
    }
  };

  const handleSaveLabel = async (serial, newLabel) => {
    const previousDevices = devices;
    setDevices((prev) =>
      prev.map((dev) => (dev.serial_number === serial ? { ...dev, label: newLabel } : dev))
    );
    const loadingToast = toast.loading('Сохранение...');

    try {
      const url = `http://localhost:8000/v1/devices/edit-label/${serial_number}?label=${encodeURIComponent(newLabel)}`;
      const response = await fetch(url, { method: 'PATCH' });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `Ошибка ${response.status}`);
      }
      toast.success('✅ Метка обновлена', { id: loadingToast });
    } catch (error) {
      setDevices(previousDevices);
      toast.error(`❌ Ошибка: ${error.message}`, { id: loadingToast });
    }
  };

  const handleSessionUp = async (serial) => {
    const loadingToast = toast.loading('Запуск сервера... (до 45 секунд)');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);
      const response = await fetch(
        `http://localhost:8000/v1/devices/edit-status/session/${serial_number}?status=ACTIVE`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        setDevices((prev) =>
          prev.map((dev) =>
            dev.serial_number === serial ? { ...dev, session_status: 'ACTIVE' } : dev
          )
        );
        toast.success('✅ Сервер для управления устройством успешно поднят', {
          id: loadingToast,
        });
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `Ошибка ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Session Up error:', error);
      if (error.name === 'AbortError') {
        toast.error('❌ Превышено время ожидания (45 сек). Сервер не отвечает.', {
          id: loadingToast,
        });
      } else {
        toast.error(`❌ Ошибка: ${error.message}`, { id: loadingToast });
      }
    }
  };

  const handleSessionDown = async (serial) => {
    const loadingToast = toast.loading('Отключение сервера...');

    try {
      const response = await fetch(
        `http://localhost:8000/v1/devices/edit-status/session/${serial_number}?status=INACTIVE`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (response.ok) {
        setDevices((prev) =>
          prev.map((dev) =>
            dev.serial_number === serial ? { ...dev, session_status: 'INACTIVE' } : dev
          )
        );
        toast.success('✅ Сервер успешно отключен', { id: loadingToast });
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `Ошибка ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Session Down error:', error);
      toast.error(`❌ Ошибка: ${error.message}`, { id: loadingToast });
    }
  };

  const handleManualRefresh = () => fetchDevices(true);

  return (
    <div>
      <PageHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Title>Devices</Title>
          {!isInitialLoading && (
            <Stats>
              <span>Всего: {devices.length}</span>
              <span>Показано: {devices.length}</span>
            </Stats>
          )}
        </div>

        {/* Группа кнопок массового управления и обновления */}
        <div style={{ display: 'flex', gap: 12 }}>
          <Button
            variant="outline"
            onClick={handleAllSessionsUp}
            disabled={isAllSessionsUpLoading}
          >
            {isAllSessionsUpLoading ? 'Включение...' : 'Включить все сессии'}
          </Button>
          <Button
            variant="outline"
            onClick={handleAllSessionsDown}
            disabled={isAllSessionsDownLoading}
          >
            {isAllSessionsDownLoading ? 'Отключение...' : 'Отключить все сессии'}
          </Button>
          <RefreshButton
            variant="outline"
            icon={<FiRefreshCw />}
            onClick={handleManualRefresh}
            disabled={isManualRefreshing}
          >
            {isManualRefreshing ? 'Обновление...' : 'Refresh'}
          </RefreshButton>
        </div>
      </PageHeader>

      {isInitialLoading ? (
        <div style={{ color: '#a0b3ba', textAlign: 'center', padding: 40 }}>
          Загрузка устройств...
        </div>
      ) : fetchError && devices.length === 0 ? (
        <div style={{ color: '#e06c6c', textAlign: 'center', padding: 40 }}>
          {fetchError}
        </div>
      ) : (
        <DevicesTable
          devices={devices}
          onCopyLink={handleCopyLink}
          onSaveLabel={handleSaveLabel}
          onSessionUp={handleSessionUp}
          onSessionDown={handleSessionDown}
        />
      )}
    </div>
  );
};

export default DevicesPage;