import { Layout, Menu } from 'antd';
import { Route, Routes, Link } from 'react-router-dom';
import { MessageOutlined, SettingOutlined, HistoryOutlined, ScheduleOutlined, } from '@ant-design/icons';
import MessageSender from './MessageSender';
import Settings from './Settings';
import HistoryPage from './HistoryPage'; // Import the new HistoryPage component
import ScheduledPage from './ScheduledPage';

const { Header, Sider, Content } = Layout;

const App = () => {

  return (
      <Layout style={{ minHeight: '100vh' }}>
        <Sider breakpoint="lg" collapsedWidth="0">
          <div style={{ color: 'white', padding: '1rem', fontWeight: 'bold' }}>
            Twilio App
          </div>
          <Menu
            theme="dark"
            mode="inline"
            defaultSelectedKeys={['messages']} // Set default view to "messages"
          >
            <Menu.Item key="messages" icon={<MessageOutlined />}>
              <Link to="/">Send</Link>
            </Menu.Item>
            <Menu.Item key="settings" icon={<SettingOutlined />}>
              <Link to="/settings">Settings</Link>
            </Menu.Item>
            <Menu.Item key="scheduled" icon={<ScheduleOutlined />}>
              <Link to="/scheduled">Scheduled</Link>
            </Menu.Item>
            <Menu.Item key="history" icon={<HistoryOutlined />}>
              <Link to="/history">History</Link>
            </Menu.Item>
          </Menu>
        </Sider>
        <Layout>
          <Content style={{ margin: '1rem' }}>
              <Routes>
                <Route path="/" element={<MessageSender />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/scheduled" element={<ScheduledPage />} />
                <Route path="/history" element={<HistoryPage />} />
              </Routes>
          </Content>
        </Layout>
      </Layout>
  );
};

export default App;
