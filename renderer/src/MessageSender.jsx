import React, { useState } from 'react';
import { Modal, Layout, Upload, Button, Typography, Table, message, Input, Space, Select, Radio, DatePicker } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import Papa from 'papaparse';
import { useContacts } from './ContactsContext';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

const { Title } = Typography;

const MessageSender = () => {
  const { contacts, setContacts } = useContacts();
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState({});
  const [columnOptions, setColumnOptions] = useState([]);
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [rawRows, setRawRows] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [deliverMode, setDeliverMode] = useState('now'); // 'now' | 'schedule'
  const [scheduleAt, setScheduleAt] = useState(null);    // dayjs | null

  const handleFile = (file) => {
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const rows = results.data.filter(r => Object.values(r).some(Boolean));
        setRawRows(rows);
        if (!rows.length) {
          message.error('CSV appears empty.');
          return;
        }

        const cols = Object.keys(rows[0]);
        setColumnOptions(cols);
        setSelectedColumn(null);
        setContacts([]); // wait for column selection
        message.info('Please select the column with phone numbers.');
      }
    });
    return false;
  };

  const handleSend = async () => {
    if (!contacts.length) {
      message.warning('Please upload contacts first.');
      return;
    }
    if (!messageText.trim()) {
      message.warning('Please enter a message.');
      return;
    }
    if (!window.twilioAPI?.sendMessage) {
      return message.error('Native API not available (preload not loaded).');
    }

    setIsSending(true);

    try {
      const toList = contacts.map(c => c.phone);
      const media = mediaUrl.trim() || null;

      if (deliverMode === 'schedule') {
        if (!scheduleAt) {
          message.error('Please choose a date & time.');
          return;
        }
        // schedule via Twilio API (requires Messaging Service)
        const res = await window.twilioAPI.scheduleCreate({
          recipients: toList,
          content: messageText.trim(),
          mediaUrl: media,
          sendAtISO: scheduleAt.utc().toISOString(),
        });

        const scheduledCount = (res?.results || []).filter(r => r.sid).length;
        if (scheduledCount) {
          message.success(`Scheduled ${scheduledCount} message${scheduledCount === 1 ? '' : 's'}.`);
          // optionally reset fields after scheduling
          setSendStatus({});
          setMessageText('');
          setMediaUrl('');
          setScheduleAt(null);
        } else {
          message.error(res?.error || 'Failed to schedule.');
        }
      } else {
        // Send now via Twilio API
        const results = await window.twilioAPI.sendMessage({
          message: messageText,
          to: toList,
          mediaUrl: media
        });

        console.log('Twilio Message Send Results:', results);
        setSendStatus(results.results || {});
        const ok = Number(results.ok || 0);
        const fail = Number(results.fail || 0);

        if (ok > 0 && fail === 0) {
          message.success(`Sent ${ok} message${ok === 1 ? '' : 's'}.`);
        } else if (ok > 0 && fail > 0) {
          message.warning(`Partial success: sent ${ok}, failed ${fail}.`);
        } else {
          message.error('Failed to send all messages.');
        }

        // fire-and-forget logging
        window.twilioAPI?.storeMessage(
          messageText,
          contacts.length,
          ok > 0 && fail === 0 ? 'sent' : ok > 0 ? 'partial' : 'failed',
          fail ? `failed: ${fail}` : null
        ).then(r => console.log('Logged batch:', r))
          .catch(e => console.warn('Logging failed (non-fatal):', e));
      }
    } catch (err) {
      console.error('Error (send/schedule):', err);
      message.error('Action failed. Please try again later.');
    } finally {
      setIsSending(false);
    }
  };

  const columns = [
    { title: 'Phone Number', dataIndex: 'phone', key: 'phone' },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => sendStatus[record.phone] || ''
    }
  ];

  return (
    <div style={{ padding: '1rem' }}>
      <Title level={3}>Send Messages</Title>

      <Upload beforeUpload={handleFile} accept=".csv" showUploadList={false}>
        <Button icon={<UploadOutlined />}>Upload CSV</Button>
      </Upload>

      {columnOptions.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <label>Select phone number column: </label>
          <Select
            style={{ width: 300 }}
            options={columnOptions.map(col => ({ label: col, value: col }))}
            onChange={(value) => {
              setSelectedColumn(value);
              const parsed = rawRows
                .filter(row => !!row[value])
                .map((row, index) => ({ key: index, phone: String(row[value]).trim(), ...row }));
              setContacts(parsed);
            }}
          />
        </div>
      )}

      <Space direction="vertical" style={{ marginTop: '2rem', width: '100%' }}>
        <Input.TextArea
          rows={4}
          placeholder="Enter your message here"
          value={messageText}
          onChange={e => setMessageText(e.target.value)}
        />
        <Input
          placeholder="Optional media URL (image, gif, etc)"
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
        />

        <Space direction="vertical" size="small">
          <Radio.Group
            value={deliverMode}
            onChange={(e) => setDeliverMode(e.target.value)}
            options={[
              { label: 'Send now', value: 'now' },
              { label: 'Schedule for later', value: 'schedule' }
            ]}
            optionType="button"
            buttonStyle="solid"
          />
          {deliverMode === 'schedule' && (
            <DatePicker
              showTime
              value={scheduleAt}
              onChange={setScheduleAt}
              style={{ width: 300 }}
              placeholder="Pick date & time"
            />
          )}
        </Space>

        <Space>
          <Button
            type="primary"
            loading={isSending}
            onClick={() => setShowConfirm(true)}
            disabled={!contacts.length || !messageText.trim() || (deliverMode === 'schedule' && !scheduleAt)}
          >
            {deliverMode === 'schedule'
              ? `Schedule (${contacts.length})`
              : `Send Message (${contacts.length})`}
          </Button>

          <Button
            danger
            onClick={() => {
              setContacts([]);
              setSendStatus({});
              message.info('Contacts cleared.');
            }}
          >
            Clear Contacts
          </Button>
        </Space>
      </Space>

      <Table
        style={{ marginTop: '2rem' }}
        dataSource={contacts}
        columns={columns}
        pagination={false}
        bordered
      />

      <Modal
        title={deliverMode === 'schedule' ? 'Confirm Schedule' : 'Confirm Send'}
        open={showConfirm}
        onCancel={() => setShowConfirm(false)}
        onOk={() => {
          setShowConfirm(false);
          handleSend();
        }}
        okText={
          deliverMode === 'schedule'
            ? `Schedule for ${contacts.length} contact${contacts.length !== 1 ? 's' : ''}`
            : `Send to ${contacts.length} contact${contacts.length !== 1 ? 's' : ''}`
        }
      >
        <p>You’re about to {deliverMode === 'schedule' ? 'schedule' : 'send'} this message{deliverMode === 'schedule' && scheduleAt ? ` for ${scheduleAt.local().format('MMM D, HH:mm')}` : ''}:</p>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{messageText}</pre>
        {deliverMode === 'schedule' && !scheduleAt && (
          <p style={{ color: 'red' }}>Please pick a date & time.</p>
        )}
      </Modal>
    </div>
  );
};

export default MessageSender;
