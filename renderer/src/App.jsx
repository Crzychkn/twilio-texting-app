import { Layout, Menu } from 'antd';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { MessageOutlined, SettingOutlined, HistoryOutlined } from '@ant-design/icons';
import MessageSender from './MessageSender';
import Settings from './Settings';
import HistoryPage from './HistoryPage'; // Import the new HistoryPage component

const { Header, Sider, Content } = Layout;

const App = () => {

  return (
    <Router>
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
              <Link to="/">Send Messages</Link>
            </Menu.Item>
            <Menu.Item key="settings" icon={<SettingOutlined />}>
              <Link to="/settings">Settings</Link>
            </Menu.Item>
            <Menu.Item key="history" icon={<HistoryOutlined />}>
              <Link to="/history">Message History</Link>
            </Menu.Item>
          </Menu>
        </Sider>
        <Layout>
          <Header style={{ background: '#fff', paddingLeft: '1rem' }}>
            {/* Dynamically change the header title based on the route */}
            <Routes>
              <Route path="/settings" element={'Settings'} />
              <Route path="/history" element={'Message History'} />
              <Route path="/" element={'Send Messages'} />
            </Routes>
          </Header>
          <Content style={{ margin: '1rem' }}>
              <Routes>
                <Route path="/" element={<MessageSender />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/history" element={<HistoryPage />} />
              </Routes>
          </Content>
        </Layout>
      </Layout>
    </Router>
  );
};

export default App;
