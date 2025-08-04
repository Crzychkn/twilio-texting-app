import React, { useEffect, useState } from 'react';
import { Table, Typography, message, Space } from 'antd';

const { Title } = Typography;

const HistoryPage = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch the sent messages when the component mounts
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const messages = await window.twilioAPI.getMessages();
        setMessages(messages);
      } catch (err) {
        message.error('Failed to load message history.');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Message Content', dataIndex: 'content', key: 'content' },
    { title: 'Recipient Count', dataIndex: 'recipient_count', key: 'recipient_count' },
    { title: 'Sent At', dataIndex: 'send_time', key: 'send_time' },
  ];

  return (
    <div style={{ padding: '1rem' }}>
      <Title level={3}>Message History</Title>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Table
          loading={loading}
          dataSource={messages}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          bordered
        />
      </Space>
    </div>
  );
};

export default HistoryPage;
