import React, { useState, useEffect } from "react";
import { Row, Col, Card, Statistic, Table, Badge, Spin } from "antd";
import {
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import axios from "axios";

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsResponse, tasksResponse] = await Promise.all([
          axios.get("/api/stats"),
          axios.get("/api/tasks"),
        ]);

        setStats(statsResponse.data);
        setTasks(tasksResponse.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "Task",
      dataIndex: "title",
      key: "title",
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      render: (priority) => {
        const colors = {
          high: "red",
          medium: "orange",
          low: "green",
        };
        return <Badge color={colors[priority]} text={priority.toUpperCase()} />;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        let badgeStatus = "default";
        let text = status;

        switch (status) {
          case "completed":
            badgeStatus = "success";
            break;
          case "in-progress":
            badgeStatus = "processing";
            break;
          case "pending":
            badgeStatus = "warning";
            break;
          default:
            badgeStatus = "default";
        }

        return <Badge status={badgeStatus} text={text} />;
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px 0" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <h1>Dashboard</h1>

      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Users"
              value={stats?.users || 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Tasks"
              value={stats?.tasks || 0}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Completion Rate"
              value={stats?.completionRate || 0}
              suffix="%"
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <h2 style={{ marginTop: 24 }}>Latest Tasks</h2>
      <Table
        columns={columns}
        dataSource={tasks}
        rowKey="id"
        pagination={{ pageSize: 5 }}
      />
    </div>
  );
};

export default Dashboard;
