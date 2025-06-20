"use client";

import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getColorForValue, getMetricInfo } from "../lib/mapDataUtils";

export default function FireManagementMap({
  data = [],
  height = "500px",
  selectedMetric = "status",
  darkMode = false,
}) {
  // Center on first valid point or fallback to California (where most prescribed fires occur)
  const center =
    data.length > 0 && data[0].latitude && data[0].longitude
      ? [data[0].latitude, data[0].longitude]
      : [36.7783, -119.4179]; // Central California

  return (
    <div style={{ width: "100%", height }}>
      <MapContainer
        center={center}
        zoom={7}
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
          const color = getColorForValue(value, selectedMetric.toLowerCase());
          
          return (
            <CircleMarker
              key={point.unitId || idx}
              center={[point.latitude, point.longitude]}
              radius={10}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.8,
                weight: 3,
              }}
            >
              <Popup>
                <div className="space-y-2">
                  <div>
                    <strong className="text-[#8C1515]">{point.unitName || point.unitId}</strong>
                  </div>
                  <div>
                    <strong>Location:</strong> {point.locationName}
                  </div>
                  <div>
                    <strong>Status:</strong> {point.status}
                  </div>
                  <div>
                    <strong>Burn Type:</strong> {point.burnType}
                  </div>
                  {point.acresPlanned && (
                    <div>
                      <strong>Acres Planned:</strong> {point.acresPlanned}
                    </div>
                  )}
                  {point.acresCompleted !== null && (
                    <div>
                      <strong>Acres Completed:</strong> {point.acresCompleted}
                    </div>
                  )}
                  <div>
                    <strong>Risk Level:</strong> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                      point.riskLevel === 'Low' ? 'bg-green-100 text-green-800' :
                      point.riskLevel === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                      point.riskLevel === 'High' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {point.riskLevel}
                    </span>
                  </div>
                  {point.temperature && (
                    <div>
                      <strong>Temperature:</strong> {point.temperature}°F
                    </div>
                  )}
                  {point.humidity && (
                    <div>
                      <strong>Humidity:</strong> {point.humidity}%
                    </div>
                  )}
                  {point.windSpeed && (
                    <div>
                      <strong>Wind:</strong> {point.windSpeed} mph {point.windDirection}
                    </div>
                  )}
                  {point.fuelMoisture && (
                    <div>
                      <strong>Fuel Moisture:</strong> {point.fuelMoisture}%
                    </div>
                  )}
                  {point.burnBoss && (
                    <div>
                      <strong>Burn Boss:</strong> {point.burnBoss}
                    </div>
                  )}
                  {point.crewSize && (
                    <div>
                      <strong>Crew Size:</strong> {point.crewSize} people
                    </div>
                  )}
                  {point.objectives && (
                    <div>
                      <strong>Objectives:</strong> {point.objectives}
                    </div>
                  )}
                  <div className="text-sm text-gray-500">
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