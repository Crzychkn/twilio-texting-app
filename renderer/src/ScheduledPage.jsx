// renderer/src/ScheduledPage.jsx
import React, { useEffect, useState } from 'react';
import { Card, Button, Table, Space, message, Typography, Tooltip, Tag, Popover } from 'antd';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

const { Text, Paragraph } = Typography;

export default function ScheduledPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const data = await window.twilioAPI.scheduleList({ pageSize: 100 });
      const mapped = (data || []).map(m => ({
        sid: m.sid,
        to: m.to,
        status: m.status,
        dateCreated: m.dateCreated,
        messagingServiceSid: m.messagingServiceSid,
        bodyPreview: m.bodyPreview || '',
        numMedia: Number(m.numMedia || 0),
        mediaUrl: m.mediaUrl || '',
        sendAtISO: m.sendAtISO || null,
      }));
      setRows(mapped);
    } catch (e) {
      console.error(e);
      message.error('Failed to load scheduled messages.');
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const cancel = async (sid) => {
    try {
      const res = await window.twilioAPI.scheduleCancel(sid);
      if (res?.ok) {
        message.success('Cancelled.');
        load();
      } else {
        message.error(res?.error || 'Cancel failed.');
      }
    } catch (e) {
      console.error(e);
      message.error('Cancel failed.');
    }
  };

  const columns = [
    {
      title: 'When',
      dataIndex: 'dateCreated',
      width: 160,
      render: (v, rec) => (
        <Space direction="vertical" size={0}>
          <Text>{v ? dayjs(v).local().format('MMM D, HH:mm') : '-'}</Text>
          {rec.sendAtISO && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              send @ {dayjs(rec.sendAtISO).local().format('MMM D, HH:mm')}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: 'To',
      dataIndex: 'to',
      width: 150,
      render: (v) => (
        <Tooltip title={v}>
          <Text ellipsis style={{ maxWidth: 130, display: 'inline-block' }}>{v}</Text>
        </Tooltip>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (s) => {
        const color =
          s === 'scheduled' ? 'blue' :
            s === 'canceled'  ? 'default' :
              s === 'failed'    ? 'error' :
                'processing';
        return <Tag color={color}>{s}</Tag>;
      }
    },
    {
      title: 'Preview',
      dataIndex: 'bodyPreview',
      width: 110,
      render: (_, rec) => (
        <Popover
          overlayStyle={{ maxWidth: 420 }}
          title="Scheduled Message"
          trigger="hover"
          content={
            <Space direction="vertical" size="small">
              <Text type="secondary">Message</Text>
              <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {rec.bodyPreview || '(empty)'}
              </Paragraph>

              {rec.numMedia > 0 && (
                <>
                  <Text type="secondary" style={{ marginTop: 8 }}>Media</Text>
                  <Paragraph copyable style={{ margin: 0 }}>
                    {rec.mediaUrl || '(set at schedule)'}
                  </Paragraph>
                </>
              )}

              <Text type="secondary" style={{ marginTop: 8 }}>SID</Text>
              <Paragraph copyable style={{ margin: 0 }}>{rec.sid}</Paragraph>

              {rec.messagingServiceSid && (
                <>
                  <Text type="secondary" style={{ marginTop: 8 }}>Messaging Service</Text>
                  <Paragraph copyable style={{ margin: 0 }}>{rec.messagingServiceSid}</Paragraph>
                </>
              )}
            </Space>
          }
        >
          <Button size="small">View</Button>
        </Popover>
      )
    },
    {
      title: 'Actions',
      width: 110,
      render: (_, rec) => (
        <Space>
          {rec.status === 'scheduled' && (
            <Button danger size="small" onClick={() => cancel(rec.sid)}>Cancel</Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Card
        title="Scheduled Messages (Twilio)"
        extra={<Button size="small" onClick={load} loading={loading}>Refresh</Button>}
      >
        <Table
          rowKey="sid"
          size="small"
          tableLayout="fixed"
          dataSource={rows}
          columns={columns}
          pagination={{ pageSize: 10, size: 'small' }}
          scroll={{ x: 700 }}
        />
      </Card>
    </Space>
  );
}
