"use client";
import React, { useMemo } from "react";

import { ApexOptions } from "apexcharts";

import dynamic from "next/dynamic";

// Dynamically import the ReactApexChart component with loading fallback
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[310px]">
      <div className="animate-pulse text-gray-400">Loading chart...</div>
    </div>
  ),
});

interface LineChartProps {
  labels?: string[];
  series?: Array<{
    name: string;
    data: number[];
  }>;
}

const LineChartOne = React.memo<LineChartProps>(({ labels, series: propSeries }) => {
  // Memoize chart data to prevent unnecessary recalculations
  const chartLabels = useMemo(() => 
    labels || [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ], [labels]
  );

  const chartSeries = useMemo(() => 
    propSeries || [
      {
        name: "Total Pengajuan",
        data: [180, 190, 170, 160, 175, 165, 170, 205, 230, 210, 240, 235],
      },
      {
        name: "Disetujui",
        data: [40, 30, 50, 40, 55, 40, 70, 100, 110, 120, 150, 140],
      },
    ], [propSeries]
  );

  const options = useMemo<ApexOptions>(() => ({
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
    },
    colors: ["#465FFF", "#10B981"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "line",
      toolbar: {
        show: false,
      },
    },
    stroke: {
      curve: "straight",
      width: [2, 2],
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0,
      },
    },
    markers: {
      size: 0,
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 6,
      },
    },
    grid: {
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      enabled: true,
      x: {
        format: "dd MMM yyyy",
      },
    },
    xaxis: {
      type: "category",
      categories: chartLabels,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px",
          colors: ["#6B7280"],
        },
      },
      title: {
        text: "Jumlah Simlok",
        style: {
          fontSize: "13px",
          color: "#374151",
          fontWeight: '500'
        },
      },
    },
  }), [chartLabels]);

  return (
    <div className="max-w-full overflow-x-auto custom-scrollbar">
      <div id="chartEight" className="min-w-[1000px]">
        <ReactApexChart
          options={options}
          series={chartSeries}
          type="area"
          height={310}
        />
      </div>
    </div>
  );
});

LineChartOne.displayName = 'LineChartOne';

export default LineChartOne;
