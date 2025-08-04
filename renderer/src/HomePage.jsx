import React from 'react';
import { Button, Typography } from 'antd';
import { Link } from 'react-router-dom';

const { Title } = Typography;

const HomePage = () => {
  return (
    <div style={{ padding: '1rem' }}>
      <Title level={2}>Welcome to the Twilio App</Title>
      <p>This is a simple static home page.</p>
      <Link to="/messages">
        <Button type="primary">Go to Send Messages</Button>
      </Link>
    </div>
  );
};

export default HomePage;
