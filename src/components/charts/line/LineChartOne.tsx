"use client";
import React from "react";

export default function LineChartOne() {
  // Sample data untuk line chart
  const salesData = [180, 190, 170, 160, 175, 165, 170, 205, 230, 210, 240, 235];
  const revenueData = [40, 30, 50, 40, 55, 40, 70, 100, 110, 120, 150, 140];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const maxValue = Math.max(...salesData, ...revenueData);
  const chartHeight = 310;
  const chartWidth = 800;
  const padding = 40;

  // Function to generate SVG path for line
  const generatePath = (data: number[]) => {
    const stepX = (chartWidth - 2 * padding) / (data.length - 1);
    
    return data.map((value, index) => {
      const x = padding + index * stepX;
      const y = chartHeight - padding - ((value / maxValue) * (chartHeight - 2 * padding));
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  const salesPath = generatePath(salesData);
  const revenuePath = generatePath(revenueData);

  return (
    <div className="w-full p-4">
      <div className="mb-4 flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Sales</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-300 rounded-full"></div>
          <span className="text-sm text-gray-600">Revenue</span>
        </div>
      </div>
      
      <div className="relative">
        <svg width={chartWidth} height={chartHeight} className="w-full h-auto">
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map((i) => {
            const y = padding + (i * (chartHeight - 2 * padding)) / 4;
            return (
              <line
                key={i}
                x1={padding}
                y1={y}
                x2={chartWidth - padding}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            );
          })}
          
          {/* Sales line */}
          <path
            d={salesPath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            className="drop-shadow-sm"
          />
          
          {/* Revenue line */}
          <path
            d={revenuePath}
            fill="none"
            stroke="#93c5fd"
            strokeWidth="2"
            className="drop-shadow-sm"
          />
          
          {/* Data points for Sales */}
          {salesData.map((value, index) => {
            const stepX = (chartWidth - 2 * padding) / (salesData.length - 1);
            const x = padding + index * stepX;
            const y = chartHeight - padding - ((value / maxValue) * (chartHeight - 2 * padding));
            return (
              <circle
                key={`sales-${index}`}
                cx={x}
                cy={y}
                r="3"
                fill="#3b82f6"
                className="hover:r-4 transition-all duration-200"
              >
                <title>{`${months[index]}: ${value}`}</title>
              </circle>
            );
          })}
          
          {/* Data points for Revenue */}
          {revenueData.map((value, index) => {
            const stepX = (chartWidth - 2 * padding) / (revenueData.length - 1);
            const x = padding + index * stepX;
            const y = chartHeight - padding - ((value / maxValue) * (chartHeight - 2 * padding));
            return (
              <circle
                key={`revenue-${index}`}
                cx={x}
                cy={y}
                r="3"
                fill="#93c5fd"
                className="hover:r-4 transition-all duration-200"
              >
                <title>{`${months[index]}: ${value}`}</title>
              </circle>
            );
          })}
          
          {/* X-axis labels */}
          {months.map((month, index) => {
            const stepX = (chartWidth - 2 * padding) / (months.length - 1);
            const x = padding + index * stepX;
            return (
              <text
                key={month}
                x={x}
                y={chartHeight - 10}
                textAnchor="middle"
                className="text-xs fill-gray-600"
              >
                {month}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
