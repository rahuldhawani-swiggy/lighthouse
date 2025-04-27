import React, { useState, useEffect } from "react";
import {
  Table,
  Badge,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Spin,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import axios from "axios";

const { Option } = Select;

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/tasks");
      setTasks(response.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      message.error("Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
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
      filters: [
        { text: "High", value: "high" },
        { text: "Medium", value: "medium" },
        { text: "Low", value: "low" },
      ],
      onFilter: (value, record) => record.priority === value,
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
      filters: [
        { text: "Completed", value: "completed" },
        { text: "In Progress", value: "in-progress" },
        { text: "Pending", value: "pending" },
      ],
      onFilter: (value, record) => record.status === value,
    },
  ];

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      await axios.post("/api/tasks", values);

      message.success("Task added successfully");
      setIsModalVisible(false);
      form.resetFields();
      fetchTasks();
    } catch (error) {
      console.error("Error adding task:", error);
      message.error("Failed to add task");
    }
  };

  if (loading && tasks.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "50px 0" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h1>Tasks</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={showModal}>
          Add Task
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={tasks}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title="Add New Task"
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={handleCancel}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="Task Title"
            rules={[{ required: true, message: "Please enter a task title" }]}
          >
            <Input placeholder="Enter task title" />
          </Form.Item>

          <Form.Item name="priority" label="Priority" initialValue="medium">
            <Select>
              <Option value="high">High</Option>
              <Option value="medium">Medium</Option>
              <Option value="low">Low</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Tasks;
