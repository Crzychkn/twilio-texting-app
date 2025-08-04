import React, { useState } from 'react';
import { Modal, Layout, Upload, Button, Typography, Table, message, Input, Space, Select } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import Papa from 'papaparse';
import { useContacts } from './ContactsContext';

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

    setIsSending(true);

    try {
      // Send message via Twilio API
      const results = await window.twilioAPI.sendMessage({
        message: messageText,
        to: contacts.map(c => c.phone),
        mediaUrl: mediaUrl.trim() || null
      });

      console.log('Twilio Message Send Results:', results); // Log the response

      // After message is sent, store it in the SQLite database
      await storeSentMessage(messageText, contacts.length);

      setSendStatus(results); // Update the UI with the results
    } catch (err) {
      console.error('Error sending message:', err);
      message.error('Failed to send message. Please try again later.');
    } finally {
      setIsSending(false);
    }
  };

  // Function to store sent messages in SQLite database
  const storeSentMessage = (content, recipientCount) => {
    return window.twilioAPI.storeMessage(content, recipientCount);
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
                .map((row, index) => ({ key: index, phone: row[value], ...row }));
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
        <Space>
          <Button
            type="primary"
            loading={isSending}
            onClick={() => setShowConfirm(true)}
            disabled={!contacts.length || !messageText.trim()}
          >
            Send Message ({contacts.length})
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
        title="Confirm Send"
        open={showConfirm}
        onCancel={() => setShowConfirm(false)}
        onOk={() => {
          setShowConfirm(false);
          handleSend();
        }}
        okText={`Send to ${contacts.length} contact${contacts.length !== 1 ? 's' : ''}`}
      >
        <p>You’re about to send this message:</p>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{messageText}</pre>
        <p>Are you sure?</p>
      </Modal>
    </div>
  );
};

export default MessageSender;
