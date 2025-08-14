"use client";
import React from "react";

export default function BarChartOne() {
  // Sample data untuk bar chart
  const data = [
    { month: "Jan", value: 168 },
    { month: "Feb", value: 385 },
    { month: "Mar", value: 201 },
    { month: "Apr", value: 298 },
    { month: "May", value: 187 },
    { month: "Jun", value: 195 },
    { month: "Jul", value: 291 },
    { month: "Aug", value: 110 },
    { month: "Sep", value: 215 },
    { month: "Oct", value: 390 },
    { month: "Nov", value: 280 },
    { month: "Dec", value: 112 },
  ];

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="w-full p-4">
      <div className="flex items-end space-x-2 h-48">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            <div
              className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
              style={{
                height: `${(item.value / maxValue) * 100}%`,
                minHeight: '4px'
              }}
              title={`${item.month}: ${item.value}`}
            />
            <span className="text-xs text-gray-600 mt-2 transform -rotate-45 origin-center">
              {item.month}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 text-center">
        <span className="text-sm text-gray-500">Monthly Sales Data</span>
      </div>
    </div>
  );
}
