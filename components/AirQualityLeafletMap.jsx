"use client";

import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getColorForValue, getMetricInfo } from "../lib/mapDataUtils";

export default function AirQualityLeafletMap({
  data = [],
  height = "500px",
  selectedMetric = "pm25Standard",
  darkMode = false,
}) {
  // Center on first valid point or fallback to SF
  const center =
    data.length > 0 && data[0].latitude && data[0].longitude
      ? [data[0].latitude, data[0].longitude]
      : [37.7749, -122.4194];

  return (
    <div style={{ width: "100%", height }}>
      <MapContainer
        center={center}
        zoom={11}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          url={
            darkMode
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
          attribution='&copy; OpenStreetMap contributors'
        />
        {data.map((point, idx) => {
          const value = point[selectedMetric];
          const color = getColorForValue(value, selectedMetric.replace("Standard", "").toLowerCase());
          return (
            <CircleMarker
              key={point.deviceId || idx}
              center={[point.latitude, point.longitude]}
              radius={8}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.8,
                weight: 2,
              }}
            >
              <Popup>
                <div>
                  <div>
                    <b>{point.deviceName || point.deviceId}</b>
                  </div>
                  <div>
                    {getMetricInfo(selectedMetric).name}:{" "}
                    {value !== null && value !== undefined ? value : "N/A"}{" "}
                    {getMetricInfo(selectedMetric).unit}
                  </div>
                  <div>
                    {point.datetime
                      ? new Date(point.datetime).toLocaleString()
                      : ""}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
