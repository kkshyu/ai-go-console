import type { PresetOverlay } from "../index";

export const BOOKING_APPOINTMENT: PresetOverlay = {
  templateId: "booking",
  files: [
    {
      path: "src/lib/types.ts",
      content: `export interface Service {
  id: string;
  name: string;
  duration: number; // minutes
  price: number;
  description: string;
  category: string;
}

export interface TimeSlot {
  time: string; // HH:mm
  available: boolean;
}

export type BookingStatus = "confirmed" | "pending" | "cancelled";

export interface Booking {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  serviceId: string;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  visitCount: number;
  lastVisit: string;
  notes?: string;
}
`,
    },
    {
      path: "src/lib/mock-data.ts",
      content: `import type { Service, Booking, Customer } from "./types";

export const services: Service[] = [
  { id: "svc-1", name: "基礎剪髮", duration: 30, price: 500, description: "專業髮型師為您量身打造合適髮型，含洗髮吹整。", category: "剪髮" },
  { id: "svc-2", name: "染髮（短髮）", duration: 90, price: 1800, description: "使用高品質染劑，短髮染色含護髮處理。", category: "染髮" },
  { id: "svc-3", name: "染髮（長髮）", duration: 120, price: 2800, description: "使用高品質染劑，長髮染色含護髮處理。", category: "染髮" },
  { id: "svc-4", name: "燙髮造型", duration: 150, price: 3500, description: "冷燙/熱燙任選，含造型設計與護髮。", category: "燙髮" },
  { id: "svc-5", name: "深層護髮", duration: 60, price: 1200, description: "深層修護受損髮質，讓秀髮恢復柔順光澤。", category: "護髮" },
  { id: "svc-6", name: "頭皮養護", duration: 45, price: 800, description: "頭皮深層清潔與按摩，舒緩頭皮壓力促進健康生長。", category: "護髮" },
  { id: "svc-7", name: "新娘造型", duration: 180, price: 5800, description: "婚禮當日完整妝髮造型，含試妝一次。", category: "特殊造型" },
  { id: "svc-8", name: "兒童剪髮", duration: 20, price: 300, description: "親切溫柔的兒童專屬剪髮服務。", category: "剪髮" },
];

export const bookings: Booking[] = [
  { id: "bk-1", clientName: "王美玲", clientPhone: "0912-111-222", clientEmail: "wang@example.com", serviceId: "svc-1", serviceName: "基礎剪髮", date: "2024-03-26", startTime: "09:00", endTime: "09:30", status: "confirmed" },
  { id: "bk-2", clientName: "李淑芬", clientPhone: "0923-222-333", clientEmail: "li@example.com", serviceId: "svc-2", serviceName: "染髮（短髮）", date: "2024-03-26", startTime: "09:30", endTime: "11:00", status: "confirmed" },
  { id: "bk-3", clientName: "陳志明", clientPhone: "0934-333-444", clientEmail: "chen@example.com", serviceId: "svc-5", serviceName: "深層護髮", date: "2024-03-26", startTime: "11:00", endTime: "12:00", status: "pending" },
  { id: "bk-4", clientName: "黃雅琪", clientPhone: "0945-444-555", clientEmail: "huang@example.com", serviceId: "svc-4", serviceName: "燙髮造型", date: "2024-03-26", startTime: "13:00", endTime: "15:30", status: "confirmed" },
  { id: "bk-5", clientName: "林建宏", clientPhone: "0956-555-666", clientEmail: "lin.jh@example.com", serviceId: "svc-1", serviceName: "基礎剪髮", date: "2024-03-26", startTime: "14:00", endTime: "14:30", status: "confirmed" },
  { id: "bk-6", clientName: "張家豪", clientPhone: "0967-666-777", clientEmail: "zhang@example.com", serviceId: "svc-6", serviceName: "頭皮養護", date: "2024-03-26", startTime: "15:00", endTime: "15:45", status: "cancelled" },
  { id: "bk-7", clientName: "吳佳穎", clientPhone: "0978-777-888", clientEmail: "wu@example.com", serviceId: "svc-3", serviceName: "染髮（長髮）", date: "2024-03-27", startTime: "10:00", endTime: "12:00", status: "pending" },
  { id: "bk-8", clientName: "劉雅婷", clientPhone: "0989-888-999", clientEmail: "liu@example.com", serviceId: "svc-7", serviceName: "新娘造型", date: "2024-03-28", startTime: "09:00", endTime: "12:00", status: "confirmed" },
  { id: "bk-9", clientName: "蔡宗翰", clientPhone: "0910-999-000", clientEmail: "tsai@example.com", serviceId: "svc-1", serviceName: "基礎剪髮", date: "2024-03-27", startTime: "14:00", endTime: "14:30", status: "confirmed" },
  { id: "bk-10", clientName: "許文馨", clientPhone: "0921-000-111", clientEmail: "hsu@example.com", serviceId: "svc-5", serviceName: "深層護髮", date: "2024-03-27", startTime: "15:00", endTime: "16:00", status: "pending" },
  { id: "bk-11", clientName: "王美玲", clientPhone: "0912-111-222", clientEmail: "wang@example.com", serviceId: "svc-8", serviceName: "兒童剪髮", date: "2024-03-26", startTime: "16:00", endTime: "16:20", status: "confirmed", notes: "小朋友怕吵，請用安靜的器具" },
];

export const customers: Customer[] = [
  { id: "cli-1", name: "王美玲", phone: "0912-111-222", email: "wang@example.com", visitCount: 15, lastVisit: "2024-03-26", notes: "偏好短髮造型" },
  { id: "cli-2", name: "李淑芬", phone: "0923-222-333", email: "li@example.com", visitCount: 8, lastVisit: "2024-03-26" },
  { id: "cli-3", name: "陳志明", phone: "0934-333-444", email: "chen@example.com", visitCount: 5, lastVisit: "2024-03-26" },
  { id: "cli-4", name: "黃雅琪", phone: "0945-444-555", email: "huang@example.com", visitCount: 22, lastVisit: "2024-03-26", notes: "VIP客戶，每月固定燙染" },
  { id: "cli-5", name: "林建宏", phone: "0956-555-666", email: "lin.jh@example.com", visitCount: 3, lastVisit: "2024-03-26" },
  { id: "cli-6", name: "張家豪", phone: "0967-666-777", email: "zhang@example.com", visitCount: 10, lastVisit: "2024-03-20" },
  { id: "cli-7", name: "吳佳穎", phone: "0978-777-888", email: "wu@example.com", visitCount: 7, lastVisit: "2024-03-15", notes: "對化學藥劑過敏，需使用天然染劑" },
  { id: "cli-8", name: "劉雅婷", phone: "0989-888-999", email: "liu@example.com", visitCount: 2, lastVisit: "2024-03-10" },
];
`,
    },
    {
      path: "src/app/page.tsx",
      content: `"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { format, addDays, startOfWeek, isSameDay, parseISO } from "date-fns";
import { zhTW } from "date-fns/locale";
import { bookings } from "@/lib/mock-data";

const hours = Array.from({ length: 11 }, (_, i) => i + 9); // 09:00 ~ 19:00

const statusColors: Record<string, string> = {
  confirmed: "bg-blue-200 border-blue-400 text-blue-900",
  pending: "bg-yellow-200 border-yellow-400 text-yellow-900",
  cancelled: "bg-gray-200 border-gray-300 text-gray-500 line-through",
};

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date("2024-03-25"), { weekStartsOn: 1 }));
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const getBookingsForDay = (date: Date) =>
    bookings.filter((b) => isSameDay(parseISO(b.date), date) && b.status !== "cancelled");

  const getBookingPosition = (startTime: string, endTime: string) => {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const top = ((sh - 9) * 60 + sm) * (64 / 60);
    const height = ((eh - sh) * 60 + (em - sm)) * (64 / 60);
    return { top, height: Math.max(height, 20) };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">預約行事曆</h1>
          <nav className="flex gap-4 text-sm">
            <Link href="/bookings" className="text-gray-600 hover:text-gray-900">預約列表</Link>
            <Link href="/services" className="text-gray-600 hover:text-gray-900">服務項目</Link>
            <Link href="/customers" className="text-gray-600 hover:text-gray-900">客戶名冊</Link>
          </nav>
        </div>

        {/* 週切換 */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="px-4 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50"
          >
            &larr; 上一週
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            {format(weekDays[0], "yyyy/MM/dd", { locale: zhTW })} - {format(weekDays[6], "MM/dd", { locale: zhTW })}
          </h2>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="px-4 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50"
          >
            下一週 &rarr;
          </button>
        </div>

        {/* 週曆格 */}
        <div className="bg-white rounded-xl shadow-sm overflow-auto">
          <div className="min-w-[800px]">
            {/* 星期標題 */}
            <div className="grid grid-cols-8 border-b">
              <div className="p-3 text-xs text-gray-500 font-medium">時間</div>
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={\`p-3 text-center border-l \${
                    isSameDay(day, new Date("2024-03-26"))
                      ? "bg-blue-50"
                      : ""
                  }\`}
                >
                  <p className="text-xs text-gray-500">
                    {format(day, "EEE", { locale: zhTW })}
                  </p>
                  <p className={\`text-lg font-bold \${
                    isSameDay(day, new Date("2024-03-26"))
                      ? "text-blue-600"
                      : "text-gray-900"
                  }\`}>
                    {format(day, "d")}
                  </p>
                </div>
              ))}
            </div>

            {/* 時間格 */}
            <div className="grid grid-cols-8">
              {/* 時間軸 */}
              <div>
                {hours.map((h) => (
                  <div key={h} className="h-16 border-b px-3 py-1">
                    <span className="text-xs text-gray-500">
                      {String(h).padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* 每日欄位 */}
              {weekDays.map((day) => {
                const dayBookings = getBookingsForDay(day);
                return (
                  <div key={day.toISOString()} className="border-l relative">
                    {hours.map((h) => (
                      <div key={h} className="h-16 border-b border-dashed border-gray-100" />
                    ))}
                    {dayBookings.map((booking) => {
                      const pos = getBookingPosition(booking.startTime, booking.endTime);
                      return (
                        <div
                          key={booking.id}
                          className={\`absolute left-1 right-1 rounded border px-1.5 py-0.5 text-xs overflow-hidden \${statusColors[booking.status]}\`}
                          style={{ top: pos.top, height: pos.height }}
                          title={\`\${booking.clientName} - \${booking.serviceName} (\${booking.startTime}~\${booking.endTime})\`}
                        >
                          <p className="font-medium truncate">{booking.clientName}</p>
                          <p className="truncate opacity-80">{booking.serviceName}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 圖例 */}
        <div className="flex gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-200 border border-blue-400" />
            <span className="text-gray-600">已確認</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-200 border border-yellow-400" />
            <span className="text-gray-600">待確認</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-200 border border-gray-300" />
            <span className="text-gray-600">已取消</span>
          </div>
        </div>
      </div>
    </div>
  );
}
`,
    },
    {
      path: "src/app/bookings/page.tsx",
      content: `"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { bookings } from "@/lib/mock-data";
import type { BookingStatus } from "@/lib/types";

const statusConfig: Record<string, { label: string; color: string }> = {
  confirmed: { label: "已確認", color: "bg-green-100 text-green-800" },
  pending: { label: "待確認", color: "bg-yellow-100 text-yellow-800" },
  cancelled: { label: "已取消", color: "bg-red-100 text-red-800" },
};

const tabs: { key: string; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "confirmed", label: "已確認" },
  { key: "pending", label: "待確認" },
  { key: "cancelled", label: "已取消" },
];

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [data, setData] = useState(bookings);

  const filtered = useMemo(() => {
    if (activeTab === "all") return data;
    return data.filter((b) => b.status === activeTab);
  }, [activeTab, data]);

  const handleConfirm = (id: string) => {
    setData((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "confirmed" as BookingStatus } : b))
    );
  };

  const handleCancel = (id: string) => {
    setData((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "cancelled" as BookingStatus } : b))
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">預約列表</h1>
          <nav className="flex gap-4 text-sm">
            <Link href="/" className="text-gray-600 hover:text-gray-900">行事曆</Link>
            <Link href="/services" className="text-gray-600 hover:text-gray-900">服務項目</Link>
            <Link href="/customers" className="text-gray-600 hover:text-gray-900">客戶名冊</Link>
          </nav>
        </div>

        {/* 篩選 */}
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={\`px-4 py-2 rounded-full text-sm transition \${
                activeTab === tab.key
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-700 border hover:bg-gray-50"
              }\`}
            >
              {tab.label}
              <span className="ml-1 opacity-70">
                ({tab.key === "all" ? data.length : data.filter((b) => b.status === tab.key).length})
              </span>
            </button>
          ))}
        </div>

        {/* 預約表格 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">時間</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">客戶</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">服務</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">狀態</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((booking) => {
                const cfg = statusConfig[booking.status];
                return (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{booking.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {booking.startTime} - {booking.endTime}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{booking.clientName}</p>
                      <p className="text-xs text-gray-500">{booking.clientPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{booking.serviceName}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={\`inline-block px-2 py-1 rounded-full text-xs font-medium \${cfg.color}\`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {booking.status === "pending" && (
                          <button
                            onClick={() => handleConfirm(booking.id)}
                            className="text-xs text-green-600 hover:text-green-800 font-medium"
                          >
                            確認
                          </button>
                        )}
                        {booking.status !== "cancelled" && (
                          <button
                            onClick={() => handleCancel(booking.id)}
                            className="text-xs text-red-600 hover:text-red-800 font-medium"
                          >
                            取消
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">無符合條件的預約</div>
          )}
        </div>
      </div>
    </div>
  );
}
`,
    },
    {
      path: "src/app/services/page.tsx",
      content: `"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { services } from "@/lib/mock-data";

export default function ServicesPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = useMemo(() => {
    const cats = Array.from(new Set(services.map((s) => s.category)));
    return ["all", ...cats];
  }, []);

  const filtered = useMemo(() => {
    if (selectedCategory === "all") return services;
    return services.filter((s) => s.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">服務項目</h1>
          <nav className="flex gap-4 text-sm">
            <Link href="/" className="text-gray-600 hover:text-gray-900">行事曆</Link>
            <Link href="/bookings" className="text-gray-600 hover:text-gray-900">預約列表</Link>
            <Link href="/customers" className="text-gray-600 hover:text-gray-900">客戶名冊</Link>
          </nav>
        </div>

        {/* 分類篩選 */}
        <div className="flex gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={\`px-4 py-2 rounded-full text-sm transition \${
                selectedCategory === cat
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-700 border hover:bg-gray-50"
              }\`}
            >
              {cat === "all" ? "全部" : cat}
            </button>
          ))}
        </div>

        {/* 服務卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {service.category}
                </span>
                <span className="text-sm text-gray-500">
                  {service.duration} 分鐘
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{service.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{service.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-blue-600">
                  NT\${service.price.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
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

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">客戶名冊</h1>
          <nav className="flex gap-4 text-sm">
            <Link href="/" className="text-gray-600 hover:text-gray-900">行事曆</Link>
            <Link href="/bookings" className="text-gray-600 hover:text-gray-900">預約列表</Link>
            <Link href="/services" className="text-gray-600 hover:text-gray-900">服務項目</Link>
          </nav>
        </div>

        {/* 搜尋 */}
        <div className="mb-6">
          <input
            placeholder="搜尋客戶姓名、電話或信箱..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-4 py-2 text-sm w-full max-w-md"
          />
        </div>

        {/* 客戶表格 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">電話</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">信箱</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">到訪次數</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">最後到訪</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">備註</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-bold">
                        {customer.name[0]}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{customer.phone}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{customer.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                    {customer.visitCount} 次
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{customer.lastVisit}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {customer.notes || "-"}
                  </td>
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
      purpose: "儲存預約資料",
    },
    {
      category: "industry",
      suggestedTypes: ["built_in_beauty", "built_in_medical"],
      purpose: "產業資料",
      optional: true,
    },
  ],
};
