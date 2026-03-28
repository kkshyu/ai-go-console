import type { PresetOverlay } from "../index";

/* ===== src/lib/types.ts ===== */
const TYPES_FILE = `export interface KPI {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
}

export interface TimeSeriesData {
  month: string;
  revenue: number;
  orders: number;
  customers: number;
}

export interface SalesData {
  category: string;
  revenue: number;
  percentage: number;
  color: string;
}

export interface ChannelData {
  channel: string;
  online: number;
  store: number;
  wholesale: number;
}

export interface CustomerData {
  id: string;
  name: string;
  totalSpend: number;
  orders: number;
  lastOrder: string;
  segment: string;
}

export interface ProductData {
  rank: number;
  name: string;
  category: string;
  revenue: number;
  units: number;
}

export interface ReportConfig {
  startDate: string;
  endDate: string;
  metrics: string[];
}
`;

/* ===== src/lib/mock-data.ts ===== */
const MOCK_DATA_FILE = `import type { TimeSeriesData, SalesData, ChannelData, CustomerData, ProductData } from "./types";

export const monthlyData: TimeSeriesData[] = [
  { month: "2024-01", revenue: 2850000, orders: 342, customers: 215 },
  { month: "2024-02", revenue: 3120000, orders: 389, customers: 248 },
  { month: "2024-03", revenue: 2960000, orders: 356, customers: 230 },
  { month: "2024-04", revenue: 3450000, orders: 412, customers: 275 },
  { month: "2024-05", revenue: 3680000, orders: 445, customers: 298 },
  { month: "2024-06", revenue: 3210000, orders: 392, customers: 260 },
  { month: "2024-07", revenue: 3890000, orders: 468, customers: 312 },
  { month: "2024-08", revenue: 4120000, orders: 501, customers: 335 },
  { month: "2024-09", revenue: 3750000, orders: 456, customers: 305 },
  { month: "2024-10", revenue: 4350000, orders: 523, customers: 348 },
  { month: "2024-11", revenue: 5120000, orders: 618, customers: 412 },
  { month: "2024-12", revenue: 5680000, orders: 685, customers: 456 },
];

export const salesByCategory: SalesData[] = [
  { category: "電子產品", revenue: 15800000, percentage: 35.2, color: "#3b82f6" },
  { category: "服飾配件", revenue: 9200000, percentage: 20.5, color: "#10b981" },
  { category: "食品飲料", revenue: 7500000, percentage: 16.7, color: "#f59e0b" },
  { category: "居家生活", revenue: 6300000, percentage: 14.0, color: "#8b5cf6" },
  { category: "美妝保養", revenue: 4100000, percentage: 9.1, color: "#ef4444" },
  { category: "其他", revenue: 2000000, percentage: 4.5, color: "#6b7280" },
];

export const channelData: ChannelData[] = [
  { channel: "1月", online: 1800000, store: 750000, wholesale: 300000 },
  { channel: "2月", online: 1950000, store: 820000, wholesale: 350000 },
  { channel: "3月", online: 1850000, store: 780000, wholesale: 330000 },
  { channel: "4月", online: 2200000, store: 850000, wholesale: 400000 },
  { channel: "5月", online: 2350000, store: 920000, wholesale: 410000 },
  { channel: "6月", online: 2050000, store: 810000, wholesale: 350000 },
  { channel: "7月", online: 2500000, store: 950000, wholesale: 440000 },
  { channel: "8月", online: 2650000, store: 1020000, wholesale: 450000 },
  { channel: "9月", online: 2400000, store: 930000, wholesale: 420000 },
  { channel: "10月", online: 2800000, store: 1050000, wholesale: 500000 },
  { channel: "11月", online: 3300000, store: 1250000, wholesale: 570000 },
  { channel: "12月", online: 3650000, store: 1380000, wholesale: 650000 },
];

export const topProducts: ProductData[] = [
  { rank: 1, name: "無線藍牙耳機 Pro", category: "電子產品", revenue: 2850000, units: 3800 },
  { rank: 2, name: "智慧手錶 S5", category: "電子產品", revenue: 2340000, units: 1560 },
  { rank: 3, name: "機能運動外套", category: "服飾配件", revenue: 1890000, units: 4200 },
  { rank: 4, name: "精品咖啡禮盒", category: "食品飲料", revenue: 1560000, units: 5200 },
  { rank: 5, name: "玻尿酸精華液", category: "美妝保養", revenue: 1350000, units: 2700 },
  { rank: 6, name: "USB-C 快充行動電源", category: "電子產品", revenue: 1280000, units: 6400 },
  { rank: 7, name: "北歐風檯燈", category: "居家生活", revenue: 1120000, units: 2800 },
  { rank: 8, name: "有機茶葉組合", category: "食品飲料", revenue: 980000, units: 4900 },
  { rank: 9, name: "皮革斜背包", category: "服飾配件", revenue: 920000, units: 1840 },
  { rank: 10, name: "智慧空氣清淨機", category: "居家生活", revenue: 890000, units: 890 },
];

export const topCustomers: CustomerData[] = [
  { id: "C-001", name: "台灣科技有限公司", totalSpend: 1250000, orders: 45, lastOrder: "2024-12-18", segment: "企業客戶" },
  { id: "C-002", name: "陳先生", totalSpend: 380000, orders: 28, lastOrder: "2024-12-20", segment: "VIP" },
  { id: "C-003", name: "綠色生活股份有限公司", totalSpend: 350000, orders: 15, lastOrder: "2024-12-15", segment: "企業客戶" },
  { id: "C-004", name: "林小姐", totalSpend: 285000, orders: 42, lastOrder: "2024-12-22", segment: "VIP" },
  { id: "C-005", name: "王先生", totalSpend: 245000, orders: 33, lastOrder: "2024-12-19", segment: "VIP" },
  { id: "C-006", name: "數位行銷工作室", totalSpend: 220000, orders: 12, lastOrder: "2024-12-10", segment: "企業客戶" },
  { id: "C-007", name: "張小姐", totalSpend: 198000, orders: 25, lastOrder: "2024-12-21", segment: "一般會員" },
  { id: "C-008", name: "李先生", totalSpend: 175000, orders: 19, lastOrder: "2024-12-17", segment: "一般會員" },
];

export const customerSegments = [
  { name: "新客戶", value: 456, color: "#3b82f6" },
  { name: "回購客戶", value: 1230, color: "#10b981" },
];

export const monthlyComparison = [
  { metric: "營業額", current: "NT$ 5,680,000", previous: "NT$ 5,120,000", change: 10.9 },
  { metric: "訂單數", current: "685", previous: "618", change: 10.8 },
  { metric: "客戶數", current: "456", previous: "412", change: 10.7 },
  { metric: "客單價", current: "NT$ 8,292", previous: "NT$ 8,285", change: 0.1 },
  { metric: "退貨率", current: "2.1%", previous: "2.8%", change: -25.0 },
  { metric: "轉換率", current: "3.8%", previous: "3.5%", change: 8.6 },
];

export const availableMetrics = [
  "營業額", "訂單數", "客戶數", "客單價", "轉換率", "退貨率", "毛利率", "新客占比",
];

export function formatNTD(amount: number): string {
  return \`NT$ \${amount.toLocaleString()}\`;
}
`;

/* ===== src/app/page.tsx — Main KPI Dashboard ===== */
const PAGE_DASHBOARD = `"use client";
import { useState, useMemo } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { monthlyData, topProducts, formatNTD } from "@/lib/mock-data";

type DateRange = "week" | "month" | "quarter" | "year";

const rangeLabels: Record<DateRange, string> = {
  week: "本週",
  month: "本月",
  quarter: "本季",
  year: "本年度",
};

export default function Home() {
  const [range, setRange] = useState<DateRange>("year");

  const filteredData = useMemo(() => {
    switch (range) {
      case "week": return monthlyData.slice(-1);
      case "month": return monthlyData.slice(-1);
      case "quarter": return monthlyData.slice(-3);
      case "year": return monthlyData;
    }
  }, [range]);

  const totals = useMemo(() => {
    const rev = filteredData.reduce((s, d) => s + d.revenue, 0);
    const ord = filteredData.reduce((s, d) => s + d.orders, 0);
    const cust = filteredData.reduce((s, d) => s + d.customers, 0);
    const avgOrder = ord > 0 ? Math.round(rev / ord) : 0;
    const conversionRate = 3.8;
    return { revenue: rev, orders: ord, customers: cust, avgOrder, conversionRate };
  }, [filteredData]);

  const chartData = filteredData.map((d) => ({
    ...d,
    month: d.month.slice(5) + "月",
    revenueM: Math.round(d.revenue / 10000),
  }));

  const topFive = topProducts.slice(0, 5).map((p) => ({
    name: p.name.length > 8 ? p.name.slice(0, 8) + "..." : p.name,
    revenue: Math.round(p.revenue / 10000),
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">數據分析儀表板</h1>
          <div className="flex gap-2">
            {(Object.keys(rangeLabels) as DateRange[]).map((r) => (
              <button key={r} onClick={() => setRange(r)} className={\`px-3 py-1.5 rounded-lg text-sm \${range === r ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100 shadow-sm"}\`}>
                {rangeLabels[r]}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">營業額</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{formatNTD(totals.revenue)}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">訂單數</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{totals.orders.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">客戶數</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{totals.customers.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">轉換率</p>
            <p className="text-2xl font-bold text-orange-500 mt-1">{totals.conversionRate}%</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">平均客單價</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatNTD(totals.avgOrder)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">營收趨勢（萬元）</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => [\`\${value} 萬\`, "營收"]} />
                <Line type="monotone" dataKey="revenueM" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">熱銷商品 Top 5（萬元）</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topFive} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip formatter={(value: number) => [\`\${value} 萬\`, "營收"]} />
                <Bar dataKey="revenue" fill="#10b981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

/* ===== src/app/sales/page.tsx ===== */
const PAGE_SALES = `"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { salesByCategory, channelData, topProducts, monthlyData, formatNTD } from "@/lib/mock-data";

export default function SalesPage() {
  const currentMonth = monthlyData[monthlyData.length - 1];
  const prevMonth = monthlyData[monthlyData.length - 2];
  const growthRate = prevMonth ? ((currentMonth.revenue - prevMonth.revenue) / prevMonth.revenue * 100).toFixed(1) : "N/A";

  const channelChartData = channelData.map((d) => ({
    ...d,
    online: Math.round(d.online / 10000),
    store: Math.round(d.store / 10000),
    wholesale: Math.round(d.wholesale / 10000),
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">銷售分析</h1>

        {/* Growth Card */}
        <div className="bg-white rounded-xl shadow p-5 mb-6">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-gray-500">本月營收 vs 上月</p>
              <p className="text-2xl font-bold text-gray-900">{formatNTD(currentMonth.revenue)}</p>
            </div>
            <div className={\`px-3 py-1 rounded-full text-sm font-medium \${Number(growthRate) >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}\`}>
              {Number(growthRate) >= 0 ? "+" : ""}{growthRate}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue by Category Pie */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">各品類營收佔比</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={salesByCategory} cx="50%" cy="50%" outerRadius={110} dataKey="revenue" label={({ category, percentage }) => \`\${category} \${percentage}%\`}>
                  {salesByCategory.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value: number) => [formatNTD(value), "營收"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue by Channel Stacked Bar */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">各通路營收（萬元）</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={channelChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="channel" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="online" name="線上商店" stackId="a" fill="#3b82f6" />
                <Bar dataKey="store" name="實體門市" stackId="a" fill="#10b981" />
                <Bar dataKey="wholesale" name="批發通路" stackId="a" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 10 Products */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">熱銷商品 Top 10</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">排名</th>
                  <th className="px-4 py-3 font-medium">商品名稱</th>
                  <th className="px-4 py-3 font-medium">品類</th>
                  <th className="px-4 py-3 font-medium text-right">營收</th>
                  <th className="px-4 py-3 font-medium text-right">銷量</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p) => (
                  <tr key={p.rank} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={\`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold \${p.rank <= 3 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600"}\`}>{p.rank}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-gray-600">{p.category}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{formatNTD(p.revenue)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{p.units.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

/* ===== src/app/customers/page.tsx ===== */
const PAGE_CUSTOMERS = `"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { monthlyData, topCustomers, customerSegments, formatNTD } from "@/lib/mock-data";

const ltv = [
  { range: "NT$0-5萬", count: 450, color: "#e5e7eb" },
  { range: "NT$5-10萬", count: 320, color: "#93c5fd" },
  { range: "NT$10-20萬", count: 180, color: "#3b82f6" },
  { range: "NT$20-50萬", count: 85, color: "#1d4ed8" },
  { range: "NT$50萬+", count: 15, color: "#1e3a5f" },
];

export default function CustomersPage() {
  const customerTrend = monthlyData.map((d) => ({
    month: d.month.slice(5) + "月",
    customers: d.customers,
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">客戶分析</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* New vs Returning */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">新客 vs 回購客戶</h2>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={customerSegments} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => \`\${name} \${value}\`}>
                  {customerSegments.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2">
              {customerSegments.map((s) => (
                <div key={s.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-sm text-gray-600">{s.name}：{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Acquisition Trend */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">客戶成長趨勢</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={customerTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="customers" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* LTV Distribution */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">客戶終身價值分佈</h2>
          <div className="flex items-end gap-2 h-40">
            {ltv.map((l) => (
              <div key={l.range} className="flex-1 flex flex-col items-center">
                <span className="text-xs text-gray-500 mb-1">{l.count}</span>
                <div className="w-full rounded-t" style={{ height: \`\${(l.count / 450) * 100}%\`, backgroundColor: l.color }} />
                <span className="text-xs text-gray-500 mt-2 text-center">{l.range}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">重要客戶</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">客戶</th>
                  <th className="px-4 py-3 font-medium">客群</th>
                  <th className="px-4 py-3 font-medium text-right">累計消費</th>
                  <th className="px-4 py-3 font-medium text-right">訂單數</th>
                  <th className="px-4 py-3 font-medium">最近消費</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3">
                      <span className={\`px-2 py-0.5 rounded-full text-xs \${c.segment === "企業客戶" ? "bg-blue-100 text-blue-700" : c.segment === "VIP" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-700"}\`}>{c.segment}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">{formatNTD(c.totalSpend)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{c.orders}</td>
                    <td className="px-4 py-3 text-gray-600">{c.lastOrder}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

/* ===== src/app/reports/page.tsx ===== */
const PAGE_REPORTS = `"use client";
import { useState } from "react";
import { monthlyComparison, monthlyData, availableMetrics, formatNTD } from "@/lib/mock-data";

export default function ReportsPage() {
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(["營業額", "訂單數", "客戶數"]);

  const toggleMetric = (metric: string) => {
    setSelectedMetrics((prev) => prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]);
  };

  const reportData = monthlyData.map((d) => ({
    month: d.month,
    營業額: formatNTD(d.revenue),
    訂單數: d.orders.toLocaleString(),
    客戶數: d.customers.toLocaleString(),
    客單價: formatNTD(Math.round(d.revenue / d.orders)),
    轉換率: "3.8%",
    退貨率: "2.1%",
    毛利率: "42.5%",
    新客占比: \`\${Math.round((d.customers * 0.27))}人 (27%)\`,
  }));

  const filteredReport = reportData.filter((d) => d.month >= startDate.slice(0, 7) && d.month <= endDate.slice(0, 7));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">報表產出</h1>

        {/* Config */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">報表設定</h2>

          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">起始日期</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border rounded-lg px-4 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">結束日期</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border rounded-lg px-4 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">選擇指標</label>
            <div className="flex flex-wrap gap-2">
              {availableMetrics.map((m) => (
                <button key={m} onClick={() => toggleMetric(m)} className={\`px-3 py-1.5 rounded-lg text-sm border \${selectedMetrics.includes(m) ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}\`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Generated Report */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">產出報表</h2>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">下載 CSV</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">月份</th>
                  {selectedMetrics.map((m) => <th key={m} className="px-4 py-3 font-medium text-right">{m}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredReport.map((row) => (
                  <tr key={row.month} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{row.month}</td>
                    {selectedMetrics.map((m) => (
                      <td key={m} className="px-4 py-3 text-right text-gray-700">{(row as Record<string, string>)[m] || "-"}</td>
                    ))}
                  </tr>
                ))}
                {filteredReport.length === 0 && (
                  <tr><td colSpan={selectedMetrics.length + 1} className="px-4 py-8 text-center text-gray-400">選定範圍內無資料</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Comparison */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">月度對比（12月 vs 11月）</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">指標</th>
                  <th className="px-4 py-3 font-medium text-right">本月</th>
                  <th className="px-4 py-3 font-medium text-right">上月</th>
                  <th className="px-4 py-3 font-medium text-right">變化</th>
                </tr>
              </thead>
              <tbody>
                {monthlyComparison.map((row) => (
                  <tr key={row.metric} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.metric}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{row.current}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{row.previous}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={\`px-2 py-0.5 rounded-full text-xs font-medium \${row.change >= 0 ? (row.metric === "退貨率" ? "bg-green-100 text-green-700" : "bg-green-100 text-green-700") : (row.metric === "退貨率" ? "bg-red-100 text-red-700" : "bg-red-100 text-red-700")}\`}>
                        {row.change >= 0 ? "+" : ""}{row.change}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

export const DASHBOARD_ANALYTICS: PresetOverlay = {
  templateId: "dashboard",
  files: [
    { path: "src/lib/types.ts", content: TYPES_FILE },
    { path: "src/lib/mock-data.ts", content: MOCK_DATA_FILE },
    { path: "src/app/page.tsx", content: PAGE_DASHBOARD },
    { path: "src/app/sales/page.tsx", content: PAGE_SALES },
    { path: "src/app/customers/page.tsx", content: PAGE_CUSTOMERS },
    { path: "src/app/reports/page.tsx", content: PAGE_REPORTS },
  ],
  requiredServices: [
    { category: "database", suggestedTypes: ["built_in_pg", "postgresql"], purpose: "儲存分析資料" },
    { category: "ai_model", suggestedTypes: ["openai", "claude"], purpose: "AI 數據分析", optional: true },
  ],
};
