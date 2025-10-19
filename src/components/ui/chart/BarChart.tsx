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

interface BarChartProps {
  labels?: string[];
  series?: Array<{
    name: string;
    data: number[];
  }>;
}

const BarChartOne = React.memo<BarChartProps>(({ labels, series: propSeries }) => {
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
        name: "Jumlah User",
        data: [12, 14, 11, 15, 18, 20, 22, 19, 24, 28, 30, 27],
      },
    ], [propSeries]
  );

  const options = useMemo<ApexOptions>(() => ({
    colors: ["#465fff"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 310,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "39%",
        borderRadius: 5,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 4,
      colors: ["transparent"],
    },
    xaxis: {
      categories: chartLabels,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit",
    },
    yaxis: {
      title: {
        text: 'Jumlah User',
        style: {
          fontSize: '13px',
          fontWeight: '500'
        }
      },
    },
    grid: {
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      x: {
        show: false,
      },
      y: {
        formatter: (val: number) => `${val}`,
      },
    },
  }), [chartLabels]);

  return (
    <div className="max-w-full overflow-x-auto custom-scrollbar">
      <div id="chartOne" className="min-w-[1000px]">
        <ReactApexChart
          options={options}
          series={chartSeries}
          type="bar"
          height={310}
        />
      </div>
    </div>
  );
});

BarChartOne.displayName = 'BarChartOne';

export default BarChartOne;
