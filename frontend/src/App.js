import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Layout, Menu, theme } from "antd";
import {
  DashboardOutlined,
  CheckCircleOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import StoreServiceability from "./pages/StoreServiceability";
import ItemAvailability from "./pages/ItemAvailability";

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
              height: collapsed ? 48 : 64,
              margin: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s ease",
            }}
          >
            <img
              src="/lighthouse-logo.png"
              alt="Lighthouse Logo"
              style={{
                height: collapsed ? 32 : 120,
                width: collapsed ? 32 : 120,
                objectFit: "contain",
                transition: "all 0.3s ease",
              }}
            />
          </div>
          <Menu theme="dark" defaultSelectedKeys={["1"]} mode="inline">
            <Menu.Item key="1" icon={<DashboardOutlined />}>
              <Link to="/">Dashboard</Link>
            </Menu.Item>
            <Menu.Item key="2" icon={<CheckCircleOutlined />}>
              <Link to="/store-serviceability">Store Serviceability</Link>
            </Menu.Item>
            <Menu.Item key="3" icon={<ShoppingCartOutlined />}>
              <Link to="/item-availability">Item Availability</Link>
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
                <Route
                  path="/"
                  element={
                    <div style={{ textAlign: "center", padding: "60px 0" }}>
                      <h1
                        style={{
                          fontSize: "48px",
                          fontWeight: "300",
                          color: "#1890ff",
                          marginBottom: "24px",
                        }}
                      >
                        Welcome to Lighthouse
                      </h1>
                      <p
                        style={{
                          fontSize: "18px",
                          color: "#666",
                          maxWidth: "600px",
                          margin: "0 auto",
                          lineHeight: "1.6",
                        }}
                      >
                        Your comprehensive monitoring dashboard for store
                        serviceability and item availability tracking.
                      </p>
                    </div>
                  }
                />
                <Route
                  path="/store-serviceability"
                  element={<StoreServiceability />}
                />
                <Route
                  path="/item-availability"
                  element={<ItemAvailability />}
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
