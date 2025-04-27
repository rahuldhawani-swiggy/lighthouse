import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Layout, Menu, theme } from "antd";
import {
  DashboardOutlined,
  UnorderedListOutlined,
  UserOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";

const { Header, Content, Footer, Sider } = Layout;

function App() {
  const [collapsed, setCollapsed] = React.useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  return (
    <Router>
      <Layout style={{ minHeight: "100vh" }}>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
        >
          <div className="demo-logo-vertical" />
          <div
            style={{
              height: 32,
              margin: 16,
              background: "rgba(255, 255, 255, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "white", fontWeight: "bold" }}>
              {collapsed ? "LH" : "LIGHTHOUSE"}
            </span>
          </div>
          <Menu theme="dark" defaultSelectedKeys={["1"]} mode="inline">
            <Menu.Item key="1" icon={<DashboardOutlined />}>
              <Link to="/">Dashboard</Link>
            </Menu.Item>
            <Menu.Item key="2" icon={<UnorderedListOutlined />}>
              <Link to="/tasks">Tasks</Link>
            </Menu.Item>
            <Menu.Item key="3" icon={<UserOutlined />}>
              <Link to="/users">Users</Link>
            </Menu.Item>
            <Menu.Item key="4" icon={<SettingOutlined />}>
              <Link to="/settings">Settings</Link>
            </Menu.Item>
          </Menu>
        </Sider>
        <Layout>
          <Header style={{ padding: 0, background: colorBgContainer }} />
          <Content style={{ margin: "0 16px" }}>
            <div
              style={{
                padding: 24,
                minHeight: 360,
                background: colorBgContainer,
                borderRadius: borderRadiusLG,
                marginTop: 16,
              }}
            >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route
                  path="/users"
                  element={<div>Users Page (Coming Soon)</div>}
                />
                <Route
                  path="/settings"
                  element={<div>Settings Page (Coming Soon)</div>}
                />
              </Routes>
            </div>
          </Content>
          <Footer style={{ textAlign: "center" }}>
            Lighthouse Dashboard ©{new Date().getFullYear()} Created with Ant
            Design
          </Footer>
        </Layout>
      </Layout>
    </Router>
  );
}

export default App;
