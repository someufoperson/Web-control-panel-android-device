import { useState, useRef } from 'react';
import styled from 'styled-components';
import { FiCopy, FiSave, FiArrowUpCircle, FiArrowDownCircle } from 'react-icons/fi';
import Button from '../UI/Button';
import Input from '../UI/Input';

const Tr = styled.tr`
  border-bottom: 1px solid #232b30;
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background-color: #151d22;
  }
`;

const Td = styled.td`
  padding: 12px 16px;
  color: #d4e2e8;
  font-size: 15px;
  white-space: nowrap;
  text-align: center;
  vertical-align: middle;
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-align: center;
  min-width: 100px;

  ${({ $status }) => {
    const upperStatus = $status?.toUpperCase() || '';
    if (['ONLINE', 'CONNECTED', 'ACTIVE'].includes(upperStatus)) {
      return `
        background-color: #0f9100;
        color: #d8ffd4;
        border: 1px solid #7ff772;
      `;
    }
    if (['OFFLINE', 'DISCONNECTED', 'INACTIVE'].includes(upperStatus)) {
      return `
        background-color: #db0000;
        color: #ffcfcf;
        border: 1px solid #ff8080;
      `;
    }
    return `
      background-color: #2a3238;
      color: #b3c2cc;
      border: 1px solid #4a5a62;
    `;
  }}
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
`;

const LabelContent = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 200px;
  min-height: 40px;
  padding: 0;
`;

const LabelText = styled.span`
  display: inline-block;
  padding: 8px 12px;
  font-size: 14px;
  line-height: 1.5;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #d4e2e8;
  width: 100%;
  text-align: center;
  box-sizing: border-box;

  &:hover {
    background-color: #1e2a30;
    border-color: #3e4a52;
  }
`;

const StyledInput = styled(Input)`
  padding: 8px 12px;
  font-size: 14px;
  line-height: 1.5;
  border: 1px solid #3b8c7a;
  border-radius: 6px;
  background-color: #1e2428;
  color: #fff;
  width: 100%;
  min-width: 200px;
  box-sizing: border-box;
  text-align: left;

  &:focus {
    border-color: #4ab3a0;
    box-shadow: 0 0 0 2px rgba(43, 110, 92, 0.3);
    outline: none;
  }
`;

const TableRow = ({ device, onCopy, onSave, onSessionUp, onSessionDown }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedLabel, setEditedLabel] = useState(device.label);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const isSavingRef = useRef(false);

  const handleSave = (e) => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (editedLabel.trim() !== device.label) {
      onSave(device.serial_number, editedLabel.trim());
    }
    setIsEditing(false);

    setTimeout(() => {
      isSavingRef.current = false;
    }, 100);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave(e);
    }
  };

  const startEditing = (e) => {
    e?.stopPropagation();
    setEditedLabel(device.label);
    setIsEditing(true);
  };

  // --- ЛОГИКА ОТОБРАЖЕНИЯ КНОПОК СЕССИИ ---
  const sessionStatus = device.session_status?.toUpperCase();
  const deviceStatus = device.status_device?.toUpperCase();

  const isDeviceOffline = deviceStatus === 'OFFLINE';
  const showSessionUp = sessionStatus === 'INACTIVE';
  const showSessionDown = sessionStatus === 'ACTIVE';

  // Обработчики с блокировкой
  const handleSessionUpClick = async () => {
    if (isDeviceOffline) return; // дополнительная страховка
    setIsSessionLoading(true);
    await onSessionUp(device.serial_number);
    setIsSessionLoading(false);
  };

  const handleSessionDownClick = async () => {
    setIsSessionLoading(true);
    await onSessionDown(device.serial_number);
    setIsSessionLoading(false);
  };

  return (
    <Tr>
      <Td>{device.serial_number}</Td>
      <Td>
        <LabelContent>
          {isEditing ? (
            <StyledInput
              value={editedLabel}
              onChange={(e) => setEditedLabel(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              autoFocus
            />
          ) : (
            <LabelText onClick={startEditing}>
              {device.label || '—'}
            </LabelText>
          )}
        </LabelContent>
      </Td>
      <Td>
        <StatusBadge $status={device.status_device}>{device.status_device}</StatusBadge>
      </Td>
      <Td>
        <StatusBadge $status={device.connection_status}>{device.connection_status}</StatusBadge>
      </Td>
      <Td>
        <StatusBadge $status={device.session_status}>{device.session_status}</StatusBadge>
      </Td>
      <Td>{device.flask_port}</Td>
      <Td>
        <Actions>
          {showSessionUp && (
            <Button
              variant="outline"
              icon={<FiArrowUpCircle />}
              onClick={handleSessionUpClick}
              disabled={isSessionLoading || isDeviceOffline}
              title={isDeviceOffline ? 'Устройство не в сети' : 'Запустить сервер устройства'}
            >
              Session Up
            </Button>
          )}
          {showSessionDown && (
            <Button
              variant="outline"
              icon={<FiArrowDownCircle />}
              onClick={handleSessionDownClick}
              disabled={isSessionLoading}
              title="Остановить сервер устройства"
            >
              Session Down
            </Button>
          )}
          <Button
            variant="outline"
            icon={<FiCopy />}
            onClick={(e) => {
              e.stopPropagation();
              onCopy(device);
            }}
          >
            Copy Link
          </Button>
          {isEditing ? (
            <Button variant="primary" icon={<FiSave />} onClick={handleSave}>
              Save
            </Button>
          ) : (
            <Button variant="outline" icon={<FiSave />} onClick={startEditing}>
              Save
            </Button>
          )}
        </Actions>
      </Td>
    </Tr>
  );
};

export default TableRow;