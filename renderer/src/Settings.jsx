import React, { useEffect, useState } from 'react';
import { Input, Button, Typography, Form, message, Space } from 'antd';

const { Title } = Typography;

const Settings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!window.twilioAPI?.getSettings) return;
    window.twilioAPI.getSettings().then(settings => {
      form.setFieldsValue(settings);
    });
  }, [form]);

  const onFinish = async (values) => {
    setLoading(true);
    await window.twilioAPI.saveSettings(values);
    setLoading(false);
    message.success('Settings saved!');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 600 }}>
      <Title level={3}>Twilio Settings</Title>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        autoComplete="off"
      >
        <Form.Item label="Account SID" name="twilioAccountSid" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Auth Token" name="twilioAuthToken" rules={[{ required: true }]}>
          <Input.Password />
        </Form.Item>
        <Form.Item label="From Phone Number" name="twilioPhoneNumber" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              Save Settings
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Settings;
