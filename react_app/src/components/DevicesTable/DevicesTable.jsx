import styled from 'styled-components';
import TableRow from './TableRow';

const TableWrapper = styled.div`
  overflow-x: auto;
  border-radius: 12px;
  background-color: #0e1215;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 1000px; /* чуть шире для трёх кнопок */
`;

const Th = styled.th`
  padding: 12px 16px;
  background-color: #1a2126;
  color: #b3d0d9;
  font-weight: 500;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #2a353c;
  white-space: nowrap;
  text-align: center;
`;

const DevicesTable = ({ devices, onCopyLink, onSaveLabel, onSessionUp, onSessionDown }) => (
  <TableWrapper>
    <Table>
      <thead>
        <tr>
          <Th>Serial number</Th>
          <Th>Label</Th>
          <Th>Status device</Th>
          <Th>Connection status</Th>
          <Th>Session status</Th>
          <Th>Flask port</Th>
          <Th style={{ width: 320 }}>Actions</Th>
        </tr>
      </thead>
      <tbody>
        {devices.map((device) => (
          <TableRow
            key={device.serial_number}
            device={device}
            onCopy={onCopyLink}
            onSave={onSaveLabel}
            onSessionUp={onSessionUp}
            onSessionDown={onSessionDown}
          />
        ))}
      </tbody>
    </Table>
  </TableWrapper>
);

export default DevicesTable;