import React, { useState, useEffect } from "react";
import {
  Card,
  Spin,
  Alert,
  Typography,
  Table,
  Tag,
  Tooltip,
  Select,
  Button,
  Row,
  Col,
} from "antd";
import { CloseCircleTwoTone, ClearOutlined } from "@ant-design/icons";
import { format } from "date-fns";

const { Title, Text } = Typography;
const { Option } = Select;

const StoreServiceability = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [groupedData, setGroupedData] = useState({});
  const [filters, setFilters] = useState({
    spotName: null,
    spotArea: null,
    spotCity: null,
  });
  const [availableFilters, setAvailableFilters] = useState({
    spotNames: [],
    spotAreas: [],
    spotCities: [],
  });

  useEffect(() => {
    fetchStoreServiceabilityData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (rawData.length > 0) {
      const filteredData = applyFilters(rawData, filters);
      const grouped = groupDataBySpotName(filteredData);
      setGroupedData(grouped);
    }
  }, [rawData, filters]);

  const fetchStoreServiceabilityData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/store-serviceability");

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const responseData = await response.json();
      const data = responseData.data || [];
      setRawData(data);

      // Extract filter options
      const filterOptions = extractFilterOptions(data);
      setAvailableFilters(filterOptions);

      // Initial grouping without filters
      const grouped = groupDataBySpotName(data);
      setGroupedData(grouped);
    } catch (err) {
      setError("Something went wrong");
      console.error("Error fetching store serviceability data:", err);
    } finally {
      setLoading(false);
    }
  };

  const extractFilterOptions = (data) => {
    const spotNames = [...new Set(data.map((item) => item.spot_name))].sort();
    const spotAreas = [...new Set(data.map((item) => item.spot_area))].sort();
    const spotCities = [...new Set(data.map((item) => item.spot_city))].sort();

    return {
      spotNames,
      spotAreas,
      spotCities,
    };
  };

  const applyFilters = (data, currentFilters) => {
    return data.filter((item) => {
      const matchesSpotName =
        !currentFilters.spotName || item.spot_name === currentFilters.spotName;
      const matchesSpotArea =
        !currentFilters.spotArea || item.spot_area === currentFilters.spotArea;
      const matchesSpotCity =
        !currentFilters.spotCity || item.spot_city === currentFilters.spotCity;

      return matchesSpotName && matchesSpotArea && matchesSpotCity;
    });
  };

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      spotName: null,
      spotArea: null,
      spotCity: null,
    });
  };

  const getFilteredOptions = (filterType) => {
    const tempFilters = { ...filters };
    delete tempFilters[filterType]; // Remove current filter to get available options

    const filteredData = applyFilters(rawData, tempFilters);

    switch (filterType) {
      case "spotName":
        return [...new Set(filteredData.map((item) => item.spot_name))].sort();
      case "spotArea":
        return [...new Set(filteredData.map((item) => item.spot_area))].sort();
      case "spotCity":
        return [...new Set(filteredData.map((item) => item.spot_city))].sort();
      default:
        return [];
    }
  };

  const groupDataBySpotName = (data) => {
    const grouped = {};

    data.forEach((item) => {
      const spotName = item.spot_name;

      if (!grouped[spotName]) {
        grouped[spotName] = {
          spotInfo: {
            name: item.spot_name,
            area: item.spot_area,
            city: item.spot_city,
          },
          timelineData: [],
        };
      }

      grouped[spotName].timelineData.push({
        timestamp: item.created_at,
        sla: item.sla,
        serviceability: item.serviceability,
        id: item.id,
        storeLocality: item.store_locality,
        storeId: item.store_id,
      });
    });

    // Sort timeline data by timestamp for each spot
    Object.keys(grouped).forEach((spotName) => {
      grouped[spotName].timelineData.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );
    });

    return grouped;
  };

  const getSlaTag = (sla) => {
    if (!sla || sla === "N/A") {
      return <CloseCircleTwoTone twoToneColor="#ff4d4f" />;
    }

    const minutes = parseInt(sla.replace(/\D/g, ""));
    let color = "success";

    if (minutes > 30) color = "error"; // Above 30min: red
    else if (minutes > 20) color = "warning"; // 21-30min: amber
    else color = "success"; // 0-20min: green

    return <Tag color={color}>{sla}</Tag>;
  };

  const createSpotTimelineTable = (spotName, spotData) => {
    const { spotInfo, timelineData } = spotData;

    // Get unique timestamps for this spot, sorted in descending order (most recent first)
    const uniqueTimestamps = [
      ...new Set(timelineData.map((item) => item.timestamp)),
    ].sort((a, b) => new Date(b) - new Date(a));

    // Create a map of timestamp to SLA and store info for quick lookup
    const timestampToData = {};
    timelineData.forEach((item) => {
      const timeKey = format(new Date(item.timestamp), "dd/MM, HH:mm");
      timestampToData[timeKey] = {
        sla: item.sla,
        storeId: item.storeId,
        storeLocality: item.storeLocality,
      };
    });

    // Create columns for each timestamp (no Location column)
    const columns = uniqueTimestamps.map((timestamp) => {
      const timeKey = format(new Date(timestamp), "dd/MM, HH:mm");
      const entryData = timestampToData[timeKey];
      const tooltipContent = entryData
        ? `Store ID: ${entryData.storeId}, Store Locality: ${entryData.storeLocality}`
        : "No store information available";

      return {
        title: (
          <Tooltip title={tooltipContent}>
            <span style={{ cursor: "help" }}>{timeKey}</span>
          </Tooltip>
        ),
        dataIndex: timeKey,
        key: timeKey,
        width: 76,
        align: "center",
        render: (sla) => getSlaTag(sla),
      };
    });

    // Create single row data source
    const rowData = {
      key: spotName,
    };

    // Fill in SLA values for each timestamp
    uniqueTimestamps.forEach((timestamp) => {
      const timeKey = format(new Date(timestamp), "dd/MM, HH:mm");
      const entryData = timestampToData[timeKey];
      rowData[timeKey] = entryData ? entryData.sla : "N/A";
    });

    const dataSource = [rowData];

    return (
      <Card
        key={spotName}
        style={{ marginBottom: 24 }}
        title={
          <>
            {spotInfo.name}, {spotInfo.area}, {spotInfo.city}
          </>
        }
      >
        <Table
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          size="small"
          scroll={{ x: true }}
          style={{ marginTop: 16 }}
        />
      </Card>
    );
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description={error}
        type="error"
        showIcon
        style={{ margin: "20px 0" }}
      />
    );
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        Store Serviceability Timeline
      </Title>

      {/* Filter Section */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>Spot Name:</Text>
            </div>
            <Select
              placeholder="Select Spot Name"
              value={filters.spotName}
              onChange={(value) => handleFilterChange("spotName", value)}
              style={{ width: "100%" }}
              allowClear
            >
              {getFilteredOptions("spotName").map((name) => (
                <Option key={name} value={name}>
                  {name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>Spot Area:</Text>
            </div>
            <Select
              placeholder="Select Spot Area"
              value={filters.spotArea}
              onChange={(value) => handleFilterChange("spotArea", value)}
              style={{ width: "100%" }}
              allowClear
            >
              {getFilteredOptions("spotArea").map((area) => (
                <Option key={area} value={area}>
                  {area}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>Spot City:</Text>
            </div>
            <Select
              placeholder="Select Spot City"
              value={filters.spotCity}
              onChange={(value) => handleFilterChange("spotCity", value)}
              style={{ width: "100%" }}
              allowClear
            >
              {getFilteredOptions("spotCity").map((city) => (
                <Option key={city} value={city}>
                  {city}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={24} md={6}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>&nbsp;</Text>
            </div>
            <Button
              icon={<ClearOutlined />}
              onClick={clearFilters}
              style={{ width: "100%" }}
            >
              Clear Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Results Section */}
      {Object.keys(groupedData).length === 0 ? (
        <Alert
          message="No Data Available"
          description={
            Object.values(filters).some((f) => f !== null)
              ? "No store serviceability data found matching the selected filters."
              : "No store serviceability data found."
          }
          type="info"
          showIcon
        />
      ) : (
        Object.entries(groupedData).map(([spotName, spotData]) =>
          createSpotTimelineTable(spotName, spotData)
        )
      )}
    </div>
  );
};

export default StoreServiceability;
