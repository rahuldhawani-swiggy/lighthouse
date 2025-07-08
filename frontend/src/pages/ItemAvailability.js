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
import {
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  ClearOutlined,
} from "@ant-design/icons";
import { format } from "date-fns";

const { Title, Text } = Typography;
const { Option } = Select;

const ItemAvailability = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [groupedData, setGroupedData] = useState({});
  const [filters, setFilters] = useState({
    itemId: null,
    itemInternalName: null,
    spotName: null,
    spotArea: null,
    spotCity: null,
  });
  const [availableFilters, setAvailableFilters] = useState({
    itemIds: [],
    spotNames: [],
    spotAreas: [],
    spotCities: [],
  });

  useEffect(() => {
    fetchItemAvailabilityData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (rawData.length > 0) {
      const filteredData = applyFilters(rawData, filters);
      const grouped = groupDataByItemId(filteredData);
      setGroupedData(grouped);
    }
  }, [rawData, filters]);

  const fetchItemAvailabilityData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        "http://localhost:5000/api/item-availability"
      );

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
      const grouped = groupDataByItemId(data);
      setGroupedData(grouped);
    } catch (err) {
      setError("Something went wrong");
      console.error("Error fetching item availability data:", err);
    } finally {
      setLoading(false);
    }
  };

  const extractFilterOptions = (data) => {
    // Create mapping between internal names and IDs
    const internalNameToIdMap = {};
    const itemInternalNames = [
      ...new Set(
        data.map((item) => {
          const internalName =
            item.item_internal_name || `Product ${item.item_id}`;
          internalNameToIdMap[internalName] = item.item_id;
          return internalName;
        })
      ),
    ].sort();

    const spotNames = [...new Set(data.map((item) => item.spot_name))].sort();
    const spotAreas = [...new Set(data.map((item) => item.spot_area))].sort();
    const spotCities = [...new Set(data.map((item) => item.spot_city))].sort();

    return {
      itemInternalNames,
      internalNameToIdMap,
      spotNames,
      spotAreas,
      spotCities,
    };
  };

  const applyFilters = (data, currentFilters) => {
    const filterOptions = extractFilterOptions(data);

    return data.filter((item) => {
      // Convert internal name filter to item ID for actual filtering
      const targetItemId = currentFilters.itemInternalName
        ? filterOptions.internalNameToIdMap[currentFilters.itemInternalName]
        : currentFilters.itemId;

      const matchesItemId = !targetItemId || item.item_id === targetItemId;
      const matchesSpotName =
        !currentFilters.spotName || item.spot_name === currentFilters.spotName;
      const matchesSpotArea =
        !currentFilters.spotArea || item.spot_area === currentFilters.spotArea;
      const matchesSpotCity =
        !currentFilters.spotCity || item.spot_city === currentFilters.spotCity;

      return (
        matchesItemId && matchesSpotName && matchesSpotArea && matchesSpotCity
      );
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
      itemId: null,
      itemInternalName: null,
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
      case "itemInternalName":
        return [
          ...new Set(
            filteredData.map(
              (item) => item.item_internal_name || `Product ${item.item_id}`
            )
          ),
        ].sort();
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

  const groupDataByItemId = (data) => {
    const grouped = {};

    data.forEach((item) => {
      const itemId = item.item_id;

      if (!grouped[itemId]) {
        grouped[itemId] = {
          itemInfo: {
            id: item.item_id,
            name: item.item_name || "Unknown Item",
            internalName: item.item_internal_name || null,
          },
          storeData: {},
        };
      }

      // Group by store location within each item
      const storeKey = `${item.spot_name}, ${item.spot_area}, ${item.spot_city}`;

      if (!grouped[itemId].storeData[storeKey]) {
        grouped[itemId].storeData[storeKey] = {
          storeInfo: {
            name: item.spot_name,
            area: item.spot_area,
            city: item.spot_city,
          },
          timelineData: [],
        };
      }

      grouped[itemId].storeData[storeKey].timelineData.push({
        timestamp: item.created_at,
        available: item.available,
        id: item.id,
        storeId: item.store_id,
        storeLocality: item.store_locality,
      });
    });

    // Sort timeline data by timestamp for each store within each item
    Object.keys(grouped).forEach((itemId) => {
      Object.keys(grouped[itemId].storeData).forEach((storeKey) => {
        grouped[itemId].storeData[storeKey].timelineData.sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );
      });
    });

    return grouped;
  };

  const getAvailabilityTag = (available) => {
    if (available === true) {
      return <CheckCircleTwoTone twoToneColor="#52c41a" />;
    } else if (available === false) {
      return <CloseCircleTwoTone twoToneColor="#ff4d4f" />;
    } else {
      return <CloseCircleTwoTone twoToneColor="#ff4d4f" />;
    }
  };

  const createStoreTimelineTable = (storeKey, storeData) => {
    const { storeInfo, timelineData } = storeData;

    // Get unique timestamps for this store, sorted in descending order (most recent first)
    const uniqueTimestamps = [
      ...new Set(timelineData.map((item) => item.timestamp)),
    ].sort((a, b) => new Date(b) - new Date(a));

    // Create a map of timestamp to availability and store info for quick lookup
    const timestampToData = {};
    timelineData.forEach((item) => {
      const timeKey = format(new Date(item.timestamp), "dd/MM, HH:mm");
      timestampToData[timeKey] = {
        available: item.available,
        storeId: item.storeId,
        storeLocality: item.storeLocality,
      };
    });

    // Create columns for each timestamp
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
        render: (available) => getAvailabilityTag(available),
      };
    });

    // Create single row data source
    const rowData = {
      key: storeKey,
    };

    // Fill in availability values for each timestamp
    uniqueTimestamps.forEach((timestamp) => {
      const timeKey = format(new Date(timestamp), "dd/MM, HH:mm");
      const entryData = timestampToData[timeKey];
      rowData[timeKey] = entryData ? entryData.available : null;
    });

    const dataSource = [rowData];

    return (
      <div key={storeKey} style={{ marginBottom: 16 }}>
        <Text strong style={{ marginBottom: 8, display: "block" }}>
          📍 {storeInfo.name}, {storeInfo.area}, {storeInfo.city}
        </Text>
        <Table
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          size="small"
          scroll={{ x: true }}
          style={{ marginLeft: 16 }}
        />
      </div>
    );
  };

  const createItemCard = (itemId, itemData) => {
    const { itemInfo, storeData } = itemData;

    return (
      <Card
        key={itemId}
        style={{ marginBottom: 24 }}
        title={
          <>
            🛍️{" "}
            {itemInfo.internalName
              ? itemInfo.internalName
              : `Product ID: ${itemInfo.id}`}
            {itemInfo.internalName && (
              <span
                style={{
                  marginLeft: 8,
                  color: "#999",
                  fontWeight: "normal",
                  fontSize: "0.9em",
                }}
              >
                [{itemInfo.id}]
              </span>
            )}
          </>
        }
      >
        {Object.entries(storeData).map(([storeKey, storeInfo]) =>
          createStoreTimelineTable(storeKey, storeInfo)
        )}
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
        Item Availability Timeline
      </Title>

      {/* Filter Section */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>Product Name:</Text>
            </div>
            <Select
              placeholder="Select Product Name"
              value={filters.itemInternalName}
              onChange={(value) =>
                handleFilterChange("itemInternalName", value)
              }
              style={{ width: "100%" }}
              allowClear
            >
              {getFilteredOptions("itemInternalName").map((internalName) => (
                <Option key={internalName} value={internalName}>
                  {internalName}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
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
          <Col xs={24} sm={12} md={6}>
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
          <Col xs={24} sm={12} md={6}>
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
        </Row>
        <Row style={{ marginTop: 16 }}>
          <Col span={24}>
            <Button
              icon={<ClearOutlined />}
              onClick={clearFilters}
              style={{ width: "150px" }}
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
              ? "No item availability data found matching the selected filters."
              : "No item availability data found."
          }
          type="info"
          showIcon
        />
      ) : (
        Object.entries(groupedData).map(([itemId, itemData]) =>
          createItemCard(itemId, itemData)
        )
      )}
    </div>
  );
};

export default ItemAvailability;
