import type { PresetOverlay } from "../index";

export const ECOMMERCE_ORDER_MGMT: PresetOverlay = {
  templateId: "ecommerce",
  npmPackages: ["recharts"],
  files: [
    {
      path: "src/lib/types.ts",
      content: `export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled";

export interface OrderItem {
  id: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  shippingAddress: string;
  trackingNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
}

export interface ShipmentTrack {
  id: string;
  orderId: string;
  status: string;
  location: string;
  timestamp: string;
}
`,
    },
    {
      path: "src/lib/mock-data.ts",
      content: `import type { Order, Customer } from "./types";

export const customers: Customer[] = [
  { id: "cust-1", name: "王小明", email: "wang.ming@example.com", phone: "0912-345-678", totalOrders: 8, totalSpent: 15680, lastOrderDate: "2024-03-25" },
  { id: "cust-2", name: "李美玲", email: "li.meiling@example.com", phone: "0923-456-789", totalOrders: 12, totalSpent: 28900, lastOrderDate: "2024-03-24" },
  { id: "cust-3", name: "張志偉", email: "zhang.wei@example.com", phone: "0934-567-890", totalOrders: 3, totalSpent: 4560, lastOrderDate: "2024-03-20" },
  { id: "cust-4", name: "陳雅婷", email: "chen.yating@example.com", phone: "0945-678-901", totalOrders: 15, totalSpent: 42300, lastOrderDate: "2024-03-26" },
  { id: "cust-5", name: "林建宏", email: "lin.jianhong@example.com", phone: "0956-789-012", totalOrders: 5, totalSpent: 8790, lastOrderDate: "2024-03-18" },
  { id: "cust-6", name: "黃淑芬", email: "huang.shufen@example.com", phone: "0967-890-123", totalOrders: 7, totalSpent: 19500, lastOrderDate: "2024-03-22" },
  { id: "cust-7", name: "劉俊傑", email: "liu.junjie@example.com", phone: "0978-901-234", totalOrders: 2, totalSpent: 3200, lastOrderDate: "2024-03-15" },
  { id: "cust-8", name: "吳佳穎", email: "wu.jiaying@example.com", phone: "0989-012-345", totalOrders: 9, totalSpent: 21780, lastOrderDate: "2024-03-26" },
];

export const orders: Order[] = [
  {
    id: "ord-1", orderNumber: "ORD-20240325001", customerName: "王小明", customerEmail: "wang.ming@example.com", customerPhone: "0912-345-678",
    items: [
      { id: "item-1", productName: "經典圓領純棉T恤", price: 590, quantity: 2, subtotal: 1180 },
      { id: "item-2", productName: "棉質漁夫帽", price: 490, quantity: 1, subtotal: 490 },
    ],
    totalAmount: 1670, status: "completed", shippingAddress: "台北市信義區松仁路100號", trackingNumber: "TW123456789", createdAt: "2024-03-25T10:30:00", updatedAt: "2024-03-26T14:00:00",
  },
  {
    id: "ord-2", orderNumber: "ORD-20240325002", customerName: "李美玲", customerEmail: "li.meiling@example.com", customerPhone: "0923-456-789",
    items: [
      { id: "item-3", productName: "法式條紋亞麻襯衫", price: 1280, quantity: 1, subtotal: 1280 },
    ],
    totalAmount: 1280, status: "shipped", shippingAddress: "台中市西區民生路50號", trackingNumber: "TW987654321", createdAt: "2024-03-25T11:00:00", updatedAt: "2024-03-26T09:00:00",
  },
  {
    id: "ord-3", orderNumber: "ORD-20240325003", customerName: "張志偉", customerEmail: "zhang.wei@example.com", customerPhone: "0934-567-890",
    items: [
      { id: "item-4", productName: "高腰修身直筒牛仔褲", price: 1680, quantity: 1, subtotal: 1680 },
      { id: "item-5", productName: "透氣網布慢跑鞋", price: 1980, quantity: 1, subtotal: 1980 },
    ],
    totalAmount: 3660, status: "processing", shippingAddress: "高雄市前鎮區中山二路200號", createdAt: "2024-03-25T13:45:00", updatedAt: "2024-03-25T14:00:00",
  },
  {
    id: "ord-4", orderNumber: "ORD-20240325004", customerName: "陳雅婷", customerEmail: "chen.yating@example.com", customerPhone: "0945-678-901",
    items: [
      { id: "item-6", productName: "羊毛混紡經典大衣", price: 4980, quantity: 1, subtotal: 4980 },
    ],
    totalAmount: 4980, status: "pending", shippingAddress: "新北市板橋區文化路88號", createdAt: "2024-03-26T08:20:00", updatedAt: "2024-03-26T08:20:00",
  },
  {
    id: "ord-5", orderNumber: "ORD-20240326001", customerName: "林建宏", customerEmail: "lin.jianhong@example.com", customerPhone: "0956-789-012",
    items: [
      { id: "item-7", productName: "輕量防風連帽外套", price: 2380, quantity: 1, subtotal: 2380 },
      { id: "item-8", productName: "帆布休閒懶人鞋", price: 790, quantity: 2, subtotal: 1580 },
    ],
    totalAmount: 3960, status: "pending", shippingAddress: "桃園市中壢區中正路300號", createdAt: "2024-03-26T09:15:00", updatedAt: "2024-03-26T09:15:00",
  },
  {
    id: "ord-6", orderNumber: "ORD-20240326002", customerName: "黃淑芬", customerEmail: "huang.shufen@example.com", customerPhone: "0967-890-123",
    items: [
      { id: "item-9", productName: "簡約皮革托特包", price: 2680, quantity: 1, subtotal: 2680 },
    ],
    totalAmount: 2680, status: "processing", shippingAddress: "台南市東區大學路55號", createdAt: "2024-03-26T10:00:00", updatedAt: "2024-03-26T10:30:00",
  },
  {
    id: "ord-7", orderNumber: "ORD-20240326003", customerName: "劉俊傑", customerEmail: "liu.junjie@example.com", customerPhone: "0978-901-234",
    items: [
      { id: "item-10", productName: "寬鬆休閒棉麻短褲", price: 890, quantity: 1, subtotal: 890 },
      { id: "item-11", productName: "經典圓領純棉T恤", price: 590, quantity: 3, subtotal: 1770 },
    ],
    totalAmount: 2660, status: "cancelled", shippingAddress: "新竹市東區光復路120號", createdAt: "2024-03-26T10:45:00", updatedAt: "2024-03-26T15:00:00",
  },
  {
    id: "ord-8", orderNumber: "ORD-20240326004", customerName: "吳佳穎", customerEmail: "wu.jiaying@example.com", customerPhone: "0989-012-345",
    items: [
      { id: "item-12", productName: "羊毛格紋圍巾", price: 1280, quantity: 1, subtotal: 1280 },
      { id: "item-13", productName: "印花絲質方巾", price: 680, quantity: 2, subtotal: 1360 },
    ],
    totalAmount: 2640, status: "shipped", shippingAddress: "台北市大安區忠孝東路四段100號", trackingNumber: "TW112233445", createdAt: "2024-03-26T11:30:00", updatedAt: "2024-03-26T16:00:00",
  },
  {
    id: "ord-9", orderNumber: "ORD-20240326005", customerName: "王小明", customerEmail: "wang.ming@example.com", customerPhone: "0912-345-678",
    items: [
      { id: "item-14", productName: "透氣網布慢跑鞋", price: 1980, quantity: 1, subtotal: 1980 },
    ],
    totalAmount: 1980, status: "pending", shippingAddress: "台北市信義區松仁路100號", createdAt: "2024-03-26T14:00:00", updatedAt: "2024-03-26T14:00:00",
  },
  {
    id: "ord-10", orderNumber: "ORD-20240326006", customerName: "李美玲", customerEmail: "li.meiling@example.com", customerPhone: "0923-456-789",
    items: [
      { id: "item-15", productName: "法式條紋亞麻襯衫", price: 1280, quantity: 2, subtotal: 2560 },
      { id: "item-16", productName: "棉質漁夫帽", price: 490, quantity: 1, subtotal: 490 },
    ],
    totalAmount: 3050, status: "processing", shippingAddress: "台中市西區民生路50號", createdAt: "2024-03-26T15:20:00", updatedAt: "2024-03-26T15:45:00",
  },
  {
    id: "ord-11", orderNumber: "ORD-20240326007", customerName: "陳雅婷", customerEmail: "chen.yating@example.com", customerPhone: "0945-678-901",
    items: [
      { id: "item-17", productName: "高腰修身直筒牛仔褲", price: 1680, quantity: 1, subtotal: 1680 },
    ],
    totalAmount: 1680, status: "completed", shippingAddress: "新北市板橋區文化路88號", trackingNumber: "TW998877665", createdAt: "2024-03-23T09:00:00", updatedAt: "2024-03-25T18:00:00",
  },
  {
    id: "ord-12", orderNumber: "ORD-20240324001", customerName: "黃淑芬", customerEmail: "huang.shufen@example.com", customerPhone: "0967-890-123",
    items: [
      { id: "item-18", productName: "輕量防風連帽外套", price: 2380, quantity: 1, subtotal: 2380 },
    ],
    totalAmount: 2380, status: "completed", shippingAddress: "台南市東區大學路55號", trackingNumber: "TW556677889", createdAt: "2024-03-24T11:00:00", updatedAt: "2024-03-26T10:00:00",
  },
  {
    id: "ord-13", orderNumber: "ORD-20240326008", customerName: "吳佳穎", customerEmail: "wu.jiaying@example.com", customerPhone: "0989-012-345",
    items: [
      { id: "item-19", productName: "簡約皮革托特包", price: 2680, quantity: 1, subtotal: 2680 },
      { id: "item-20", productName: "經典圓領純棉T恤", price: 590, quantity: 2, subtotal: 1180 },
    ],
    totalAmount: 3860, status: "pending", shippingAddress: "台北市大安區忠孝東路四段100號", createdAt: "2024-03-26T16:30:00", updatedAt: "2024-03-26T16:30:00",
  },
  {
    id: "ord-14", orderNumber: "ORD-20240324002", customerName: "張志偉", customerEmail: "zhang.wei@example.com", customerPhone: "0934-567-890",
    items: [
      { id: "item-21", productName: "帆布休閒懶人鞋", price: 790, quantity: 1, subtotal: 790 },
    ],
    totalAmount: 790, status: "cancelled", shippingAddress: "高雄市前鎮區中山二路200號", createdAt: "2024-03-24T14:00:00", updatedAt: "2024-03-24T20:00:00",
  },
  {
    id: "ord-15", orderNumber: "ORD-20240326009", customerName: "林建宏", customerEmail: "lin.jianhong@example.com", customerPhone: "0956-789-012",
    items: [
      { id: "item-22", productName: "羊毛混紡經典大衣", price: 4980, quantity: 1, subtotal: 4980 },
    ],
    totalAmount: 4980, status: "pending", shippingAddress: "桃園市中壢區中正路300號", createdAt: "2024-03-26T17:00:00", updatedAt: "2024-03-26T17:00:00",
  },
];
`,
    },
    {
      path: "src/app/page.tsx",
      content: `"use client";
import { useMemo } from "react";
import Link from "next/link";
import { orders } from "@/lib/mock-data";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const statusConfig: Record<string, { label: string; color: string; chartColor: string }> = {
  pending: { label: "待處理", color: "bg-yellow-100 text-yellow-800", chartColor: "#F59E0B" },
  processing: { label: "處理中", color: "bg-blue-100 text-blue-800", chartColor: "#3B82F6" },
  shipped: { label: "已出貨", color: "bg-indigo-100 text-indigo-800", chartColor: "#6366F1" },
  completed: { label: "已完成", color: "bg-green-100 text-green-800", chartColor: "#10B981" },
  cancelled: { label: "已取消", color: "bg-red-100 text-red-800", chartColor: "#EF4444" },
};

export default function DashboardPage() {
  const todayStr = "2024-03-26";

  const stats = useMemo(() => {
    const todayOrders = orders.filter((o) => o.createdAt.startsWith(todayStr));
    const todayRevenue = todayOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + o.totalAmount, 0);
    const pendingShipments = orders.filter(
      (o) => o.status === "pending" || o.status === "processing"
    ).length;

    const distribution = Object.entries(statusConfig).map(([key, cfg]) => ({
      name: cfg.label,
      value: orders.filter((o) => o.status === key).length,
      color: cfg.chartColor,
    }));

    return { todayCount: todayOrders.length, todayRevenue, pendingShipments, distribution };
  }, []);

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">訂單管理後台</h1>
          <nav className="flex gap-4 text-sm">
            <Link href="/orders" className="text-gray-600 hover:text-gray-900">訂單列表</Link>
            <Link href="/customers" className="text-gray-600 hover:text-gray-900">客戶管理</Link>
          </nav>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500 mb-1">今日訂單數</p>
            <p className="text-3xl font-bold text-gray-900">{stats.todayCount}</p>
            <p className="text-xs text-gray-400 mt-1">{todayStr}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500 mb-1">今日營收</p>
            <p className="text-3xl font-bold text-green-600">
              NT\${stats.todayRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">不含已取消訂單</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500 mb-1">待出貨</p>
            <p className="text-3xl font-bold text-orange-600">{stats.pendingShipments}</p>
            <p className="text-xs text-gray-400 mt-1">待處理 + 處理中</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 訂單狀態分布圖 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">訂單狀態分布</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stats.distribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [\`\${value} 筆\`, "數量"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 最近訂單 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">最近訂單</h2>
              <Link href="/orders" className="text-sm text-blue-600 hover:text-blue-800">
                查看全部 &rarr;
              </Link>
            </div>
            <div className="space-y-3">
              {recentOrders.map((order) => {
                const cfg = statusConfig[order.status];
                return (
                  <Link
                    key={order.id}
                    href={\`/orders/\${order.id}\`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                      <p className="text-xs text-gray-500">{order.customerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        NT\${order.totalAmount.toLocaleString()}
                      </p>
                      <span className={\`inline-block px-2 py-0.5 rounded-full text-xs font-medium \${cfg.color}\`}>
                        {cfg.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`,
    },
    {
      path: "src/app/orders/page.tsx",
      content: `"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { orders } from "@/lib/mock-data";
import type { OrderStatus } from "@/lib/types";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "待處理", color: "bg-yellow-100 text-yellow-800" },
  processing: { label: "處理中", color: "bg-blue-100 text-blue-800" },
  shipped: { label: "已出貨", color: "bg-indigo-100 text-indigo-800" },
  completed: { label: "已完成", color: "bg-green-100 text-green-800" },
  cancelled: { label: "已取消", color: "bg-red-100 text-red-800" },
};

const tabs: { key: string; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待處理" },
  { key: "processing", label: "處理中" },
  { key: "shipped", label: "已出貨" },
  { key: "completed", label: "已完成" },
  { key: "cancelled", label: "已取消" },
];

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = orders;
    if (activeTab !== "all") {
      result = result.filter((o) => o.status === activeTab);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [activeTab, search]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">訂單列表</h1>
          <nav className="flex gap-4 text-sm">
            <Link href="/" className="text-gray-600 hover:text-gray-900">儀表板</Link>
            <Link href="/customers" className="text-gray-600 hover:text-gray-900">客戶管理</Link>
          </nav>
        </div>

        {/* 篩選列 */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex gap-2 flex-wrap">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={\`px-3 py-1.5 rounded-full text-sm transition \${
                    activeTab === tab.key
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }\`}
                >
                  {tab.label}
                  {tab.key !== "all" && (
                    <span className="ml-1 opacity-70">
                      ({orders.filter((o) => o.status === tab.key).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
            <input
              placeholder="搜尋訂單編號或客戶名稱..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded-lg px-4 py-2 text-sm flex-1 w-full md:max-w-xs ml-auto"
            />
          </div>
        </div>

        {/* 訂單表格 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">訂單編號</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">客戶</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">金額</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">狀態</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((order) => {
                const cfg = statusConfig[order.status];
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">
                      <Link href={\`/orders/\${order.id}\`}>{order.orderNumber}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{order.customerName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString("zh-TW")}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                      NT\${order.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={\`inline-block px-2 py-1 rounded-full text-xs font-medium \${cfg.color}\`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={\`/orders/\${order.id}\`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        查看
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">無符合條件的訂單</div>
          )}
        </div>
      </div>
    </div>
  );
}
`,
    },
    {
      path: "src/app/orders/[id]/page.tsx",
      content: `"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { orders } from "@/lib/mock-data";
import type { OrderStatus } from "@/lib/types";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "待處理", color: "bg-yellow-100 text-yellow-800" },
  processing: { label: "處理中", color: "bg-blue-100 text-blue-800" },
  shipped: { label: "已出貨", color: "bg-indigo-100 text-indigo-800" },
  completed: { label: "已完成", color: "bg-green-100 text-green-800" },
  cancelled: { label: "已取消", color: "bg-red-100 text-red-800" },
};

const statusFlow: OrderStatus[] = ["pending", "processing", "shipped", "completed"];

export default function OrderDetailPage() {
  const params = useParams();
  const order = orders.find((o) => o.id === params.id);
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>(order?.status || "pending");

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">找不到訂單</h1>
          <Link href="/orders" className="text-blue-600 hover:text-blue-800">返回訂單列表</Link>
        </div>
      </div>
    );
  }

  const handleShip = () => setCurrentStatus("shipped");
  const handleCancel = () => setCurrentStatus("cancelled");

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/orders" className="text-sm text-gray-500 hover:text-gray-700 mb-1 block">
              &larr; 返回訂單列表
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
          </div>
          <span className={\`px-3 py-1 rounded-full text-sm font-medium \${statusConfig[currentStatus].color}\`}>
            {statusConfig[currentStatus].label}
          </span>
        </div>

        {/* 狀態時間線 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">訂單狀態</h2>
          <div className="flex items-center gap-2">
            {statusFlow.map((s, i) => {
              const idx = statusFlow.indexOf(currentStatus);
              const isCancelled = currentStatus === "cancelled";
              const isActive = !isCancelled && i <= idx;
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={\`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium \${
                        isActive
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 text-gray-500"
                      }\`}
                    >
                      {isActive ? "\u2713" : i + 1}
                    </div>
                    <p className={\`text-xs mt-1 \${isActive ? "text-green-700 font-medium" : "text-gray-400"}\`}>
                      {statusConfig[s].label}
                    </p>
                  </div>
                  {i < statusFlow.length - 1 && (
                    <div className={\`h-0.5 flex-1 \${isActive && i < idx ? "bg-green-600" : "bg-gray-200"}\`} />
                  )}
                </div>
              );
            })}
          </div>
          {currentStatus === "cancelled" && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg text-sm text-red-700">
              此訂單已取消
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 客戶資訊 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">客戶資訊</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">姓名</span>
                <span className="text-gray-900">{order.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">電子郵件</span>
                <span className="text-gray-900">{order.customerEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">電話</span>
                <span className="text-gray-900">{order.customerPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">寄送地址</span>
                <span className="text-gray-900">{order.shippingAddress}</span>
              </div>
              {order.trackingNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-500">物流編號</span>
                  <span className="text-gray-900 font-mono">{order.trackingNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* 訂單時間 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">訂單資訊</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">建立時間</span>
                <span className="text-gray-900">
                  {new Date(order.createdAt).toLocaleString("zh-TW")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">最後更新</span>
                <span className="text-gray-900">
                  {new Date(order.updatedAt).toLocaleString("zh-TW")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">商品數量</span>
                <span className="text-gray-900">
                  {order.items.reduce((s, i) => s + i.quantity, 0)} 件
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 商品明細 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">訂購商品</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2">商品</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">單價</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">數量</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">小計</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 text-sm text-gray-900">{item.productName}</td>
                  <td className="py-3 text-sm text-gray-600 text-right">
                    NT\${item.price.toLocaleString()}
                  </td>
                  <td className="py-3 text-sm text-gray-600 text-right">{item.quantity}</td>
                  <td className="py-3 text-sm text-gray-900 text-right font-medium">
                    NT\${item.subtotal.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t">
                <td colSpan={3} className="pt-3 text-sm font-bold text-gray-900 text-right">
                  合計
                </td>
                <td className="pt-3 text-lg font-bold text-red-600 text-right">
                  NT\${order.totalAmount.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 操作按鈕 */}
        {currentStatus !== "completed" && currentStatus !== "cancelled" && (
          <div className="flex gap-3">
            {(currentStatus === "pending" || currentStatus === "processing") && (
              <button
                onClick={handleShip}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition"
              >
                標記出貨
              </button>
            )}
            {currentStatus !== "shipped" && (
              <button
                onClick={handleCancel}
                className="px-6 py-3 border border-red-300 text-red-600 rounded-xl font-medium hover:bg-red-50 transition"
              >
                取消訂單
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
`,
    },
    {
      path: "src/app/customers/page.tsx",
      content: `"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { customers } from "@/lib/mock-data";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("totalSpent");

  const filtered = useMemo(() => {
    let result = customers;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
      );
    }
    if (sortBy === "totalSpent") result = [...result].sort((a, b) => b.totalSpent - a.totalSpent);
    if (sortBy === "totalOrders") result = [...result].sort((a, b) => b.totalOrders - a.totalOrders);
    if (sortBy === "lastOrder") result = [...result].sort((a, b) => b.lastOrderDate.localeCompare(a.lastOrderDate));
    return result;
  }, [search, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">客戶管理</h1>
          <nav className="flex gap-4 text-sm">
            <Link href="/" className="text-gray-600 hover:text-gray-900">儀表板</Link>
            <Link href="/orders" className="text-gray-600 hover:text-gray-900">訂單列表</Link>
          </nav>
        </div>

        {/* 統計 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500">客戶總數</p>
            <p className="text-3xl font-bold text-gray-900">{customers.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500">總訂單數</p>
            <p className="text-3xl font-bold text-blue-600">
              {customers.reduce((s, c) => s + c.totalOrders, 0)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500">總消費金額</p>
            <p className="text-3xl font-bold text-green-600">
              NT\${customers.reduce((s, c) => s + c.totalSpent, 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* 搜尋與排序 */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <input
              placeholder="搜尋客戶名稱或信箱..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded-lg px-4 py-2 text-sm flex-1 w-full md:max-w-xs"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm ml-auto"
            >
              <option value="totalSpent">依消費金額排序</option>
              <option value="totalOrders">依訂單數排序</option>
              <option value="lastOrder">依最後下單日排序</option>
            </select>
          </div>
        </div>

        {/* 客戶表格 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">客戶</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">信箱</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">訂單數</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">總消費</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">最後下單</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">
                        {customer.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                        <p className="text-xs text-gray-500">{customer.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{customer.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                    {customer.totalOrders}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                    NT\${customer.totalSpent.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{customer.lastOrderDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
`,
    },
  ],
  requiredServices: [
    {
      category: "database",
      suggestedTypes: ["built_in_pg", "postgresql"],
      purpose: "儲存訂單資料",
    },
    {
      category: "email",
      suggestedTypes: ["sendgrid", "ses"],
      purpose: "寄送出貨通知",
      optional: true,
    },
  ],
};
