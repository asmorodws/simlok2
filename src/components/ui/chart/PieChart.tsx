"use client";
import React from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type PieChartProps = {
  series: number[];
  labels: string[];
  colors?: string[];
  height?: number;
  donut?: boolean;
};

export default function PieChart({
  series,
  labels,
  colors = ["#465FFF", "#10B981", "#F59E0B", "#EF4444"],
  height = 300,
  donut = false,
}: PieChartProps) {
  // Improve default colors if caller didn't supply custom ones
  const defaultColors = ["#2196F3", "#00C853", "#FFB300", "#FF5252"]; // bright blue, green, amber, red
  const sliceColors = colors && colors.length ? colors : defaultColors;

  // Build plotOptions.pie.donut only when donut is true to satisfy strict TS settings
  const plotOptions: any = {
    pie: {
      expandOnClick: true,
    },
  };
  if (donut) {
    plotOptions.pie.donut = { size: "55%" };
  }

  const options: ApexOptions = {
    labels,
    colors: sliceColors,
    chart: {
      type: donut ? "donut" : "pie",
      height,
      width: '100%',
      toolbar: { show: false },
    },
    legend: {
      show: true,
      position: "right",
      horizontalAlign: "center",
      fontFamily: "Outfit",
      markers: {
        size: 14,
        strokeWidth: 0,
      },
      labels: {
        colors: ['#111827']
      },
      itemMargin: {
        horizontal: 8,
        vertical: 6
      }
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['#ffffff']
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: number) {
        return `${val.toFixed(1)}%`;
      },
      style: {
        colors: ['#ffffff'],
        fontSize: '14px',
        fontWeight: '600'
      },
      dropShadow: {
        enabled: true,
        top: 1,
        left: 1,
        blur: 2,
        color: 'rgba(0,0,0,0.5)'
      }
    },
    tooltip: {
      theme: 'light',
      fillSeriesColor: false,
      y: {
        formatter: (val: number) => `${val}`,
      },
    },
    plotOptions,
    responsive: [
      {
        breakpoint: 768,
        options: {
          legend: { position: 'bottom' }
        }
      }
    ]
  };

  return (
    <div className="w-full piechart-white-labels">
      {/* Force on-slice data label text to white for better contrast. Target text and tspan for SVG output. */}
  <style>{`.piechart-white-labels .apexcharts-datalabel text,
.piechart-white-labels .apexcharts-datalabel tspan,
.piechart-white-labels .apexcharts-datalabel .apexcharts-text,
.piechart-white-labels .apexcharts-datalabel div,
.piechart-white-labels .apexcharts-series text,
.piechart-white-labels svg text {
  fill: #ffffff !important;
  color: #ffffff !important;
  stroke: none !important;
}
.piechart-white-labels .apexcharts-legend .apexcharts-legend-text,
.piechart-white-labels .apexcharts-legend-text {
  color: #111827 !important;
  fill: #111827 !important;
}
/* Force tooltip background to white with dark text for readability */
.piechart-white-labels .apexcharts-tooltip {
  background: #ffffff !important;
  color: #111827 !important;
  box-shadow: 0 4px 16px rgba(2,6,23,0.08) !important;
  border: 1px solid rgba(0,0,0,0.06) !important;
}
.piechart-white-labels .apexcharts-tooltip * {
  color: #111827 !important;
  fill: #111827 !important;
}
/* Global fallback: ApexCharts may append tooltip to body with its own class -- override that too */
.apexcharts-tooltip {
  background: #ffffff !important;
  color: #111827 !important;
  box-shadow: 0 4px 16px rgba(2,6,23,0.08) !important;
  border: 1px solid rgba(0,0,0,0.06) !important;
}
.apexcharts-tooltip * {
  color: #111827 !important;
  fill: #111827 !important;
}
/* Stronger overrides to catch inline style backgrounds: */
.apexcharts-tooltip[style] { background-color: #ffffff !important; }
.apexcharts-tooltip [style] { background-color: transparent !important; }
.apexcharts-tooltip [style*='background'] { background: transparent !important; }
.apexcharts-tooltip [style*='background-color'] { background-color: transparent !important; }
/* Remove any colored background applied to series rows inside tooltip */
.apexcharts-tooltip .apexcharts-tooltip-series,
.apexcharts-tooltip .apexcharts-tooltip-inner,
.apexcharts-tooltip .apexcharts-tooltip-title { background: transparent !important; }
/* Ensure series marker is neutral */
.apexcharts-tooltip .apexcharts-tooltip-series-marker,
.apexcharts-tooltip .apexcharts-marker {
  background: transparent !important;
  border: 8px solid rgba(0,0,0,0.06) !important;
  box-shadow: none !important;
}
/* Force tooltip text elements to dark */
.apexcharts-tooltip .apexcharts-tooltip-text,
.apexcharts-tooltip .apexcharts-tooltip-value,
.apexcharts-tooltip .apexcharts-tooltip-title {
  color: #111827 !important;
  fill: #111827 !important;
}`}</style>
      <div style={{ width: '100%', maxWidth: '100%' }}>
        <ReactApexChart options={options} series={series} type={donut ? "donut" : "pie"} height={height} />
      </div>
    </div>
  );
}
