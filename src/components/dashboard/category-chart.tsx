"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CategoryRow } from "@/lib/data/dashboard";

interface CategoryChartProps {
  data: CategoryRow[];
}

export function CategoryChart({ data }: CategoryChartProps) {

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Calls by Category — This Month
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 90%)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <YAxis
              dataKey="category"
              type="category"
              width={155}
              tick={{ fontSize: 10, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              wrapperStyle={{ zIndex: 50 }}
              contentStyle={{
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                color: "#111827",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              cursor={{ fill: "rgba(35, 62, 127, 0.08)" }}
            />
            <Bar dataKey="count" fill="#233E7F" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
