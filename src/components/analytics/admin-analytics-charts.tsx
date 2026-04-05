"use client";

import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface ChartData {
  date: string;
  revenue: number;
  orders: number;
}

interface Props {
  chartData: ChartData[];
}

export function AdminAnalyticsCharts({ chartData }: Props) {
  const formattedData = chartData.map((d) => ({
    ...d,
    revenueFormatted: d.revenue / 100,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-5">
        <h2 className="font-bold text-brand-navy mb-4">Revenue (30 days)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `RM${v}`}
            />
            <Tooltip
              formatter={(v: number) => [formatCurrency(v * 100), "Revenue"]}
              labelFormatter={(l) => `Date: ${l}`}
            />
            <Line type="monotone" dataKey="revenueFormatted" stroke="#4CAF50" strokeWidth={2} dot={false} name="Revenue" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold text-brand-navy mb-4">Orders (30 days)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip formatter={(v: number) => [v, "Orders"]} />
            <Bar dataKey="orders" fill="#1B2B4B" radius={[3, 3, 0, 0]} name="Orders" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
