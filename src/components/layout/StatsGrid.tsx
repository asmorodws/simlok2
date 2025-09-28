"use client";

import React, { ReactNode } from "react";
import Card from "@/components/ui/Card";

interface StatItem {
  id: string;
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: string;
    type: "increase" | "decrease" | "neutral";
  };
  color?: "blue" | "green" | "red" | "yellow" | "purple" | "gray";
  onClick?: () => void;
  loading?: boolean;
}

interface StatsGridProps {
  stats: StatItem[];
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

const colorClasses = {
  blue: {
    background: "bg-blue-100",
    text: "text-blue-600",
    value: "text-blue-900"
  },
  green: {
    background: "bg-emerald-100",
    text: "text-emerald-600",
    value: "text-emerald-900"
  },
  red: {
    background: "bg-red-100",
    text: "text-red-600",
    value: "text-red-900"
  },
  yellow: {
    background: "bg-amber-100",
    text: "text-amber-600",
    value: "text-amber-900"
  },
  purple: {
    background: "bg-purple-100",
    text: "text-purple-600",
    value: "text-purple-900"
  },
  gray: {
    background: "bg-gray-100",
    text: "text-gray-600",
    value: "text-gray-900"
  }
};

const gridClasses = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
};

export default function StatsGrid({ 
  stats, 
  columns = 3,
  className = "" 
}: StatsGridProps) {
  return (
    <div className={`grid ${gridClasses[columns]} gap-6 ${className}`}>
      {stats.map((stat) => {
        const colors = colorClasses[stat.color || "gray"];
        
        return (
          <Card 
            key={stat.id}
            className={`p-6 transition-all duration-200 ${
              stat.onClick ? "cursor-pointer hover:shadow-md hover:scale-[1.02]" : ""
            }`}
            onClick={stat.onClick || undefined}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-2">
                  {stat.label}
                </p>
                <div className="flex items-center gap-3">
                  <p className={`text-3xl font-bold ${colors.value} ${
                    stat.loading ? "animate-pulse" : ""
                  }`}>
                    {stat.loading ? "..." : stat.value}
                  </p>
                  {stat.trend && (
                    <div className={`flex items-center text-sm font-medium ${
                      stat.trend.type === "increase" 
                        ? "text-emerald-600" 
                        : stat.trend.type === "decrease" 
                        ? "text-red-600" 
                        : "text-gray-500"
                    }`}>
                      {stat.trend.type === "increase" && "↗"}
                      {stat.trend.type === "decrease" && "↘"}
                      {stat.trend.type === "neutral" && "→"}
                      <span className="ml-1">{stat.trend.value}</span>
                    </div>
                  )}
                </div>
              </div>
              {stat.icon && (
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors.background}`}>
                  <div className={`w-6 h-6 ${colors.text}`}>
                    {stat.icon}
                  </div>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}