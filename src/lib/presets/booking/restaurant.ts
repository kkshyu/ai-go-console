import type { PresetOverlay } from "../index";

export const BOOKING_RESTAURANT: PresetOverlay = {
  templateId: "booking",
  files: [
    {
      path: "src/lib/types.ts",
      content: `export type TableZone = "indoor" | "outdoor" | "private";

export interface Table {
  id: string;
  name: string;
  seats: number;
  zone: TableZone;
  status: "available" | "occupied" | "reserved";
}

export type ReservationStatus = "confirmed" | "seated" | "completed" | "cancelled" | "no-show";

export interface Reservation {
  id: string;
  guestName: string;
  guestPhone: string;
  partySize: number;
  date: string;
  time: string;
  tableId?: string;
  status: ReservationStatus;
  notes?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  categoryId: string;
  available: boolean;
}
`,
    },
    {
      path: "src/lib/mock-data.ts",
      content: `import type { Table, Reservation, MenuCategory, MenuItem } from "./types";

export const tables: Table[] = [
  { id: "t-1", name: "A1", seats: 2, zone: "indoor", status: "available" },
  { id: "t-2", name: "A2", seats: 2, zone: "indoor", status: "reserved" },
  { id: "t-3", name: "A3", seats: 4, zone: "indoor", status: "occupied" },
  { id: "t-4", name: "B1", seats: 4, zone: "indoor", status: "available" },
  { id: "t-5", name: "B2", seats: 6, zone: "indoor", status: "reserved" },
  { id: "t-6", name: "C1", seats: 4, zone: "outdoor", status: "available" },
  { id: "t-7", name: "C2", seats: 4, zone: "outdoor", status: "occupied" },
  { id: "t-8", name: "V1", seats: 8, zone: "private", status: "reserved" },
  { id: "t-9", name: "V2", seats: 10, zone: "private", status: "available" },
  { id: "t-10", name: "A4", seats: 2, zone: "indoor", status: "available" },
];

export const reservations: Reservation[] = [
  { id: "res-1", guestName: "王先生", guestPhone: "0912-111-222", partySize: 2, date: "2024-03-26", time: "11:30", tableId: "t-2", status: "confirmed" },
  { id: "res-2", guestName: "李小姐", guestPhone: "0923-222-333", partySize: 4, date: "2024-03-26", time: "12:00", tableId: "t-3", status: "seated" },
  { id: "res-3", guestName: "張先生", guestPhone: "0934-333-444", partySize: 6, date: "2024-03-26", time: "12:00", tableId: "t-5", status: "confirmed" },
  { id: "res-4", guestName: "陳太太", guestPhone: "0945-444-555", partySize: 8, date: "2024-03-26", time: "12:30", tableId: "t-8", status: "reserved" },
  { id: "res-5", guestName: "林先生", guestPhone: "0956-555-666", partySize: 2, date: "2024-03-26", time: "18:00", status: "confirmed", notes: "慶祝結婚紀念日" },
  { id: "res-6", guestName: "黃小姐", guestPhone: "0967-666-777", partySize: 4, date: "2024-03-26", time: "18:30", tableId: "t-7", status: "seated" },
  { id: "res-7", guestName: "劉先生", guestPhone: "0978-777-888", partySize: 3, date: "2024-03-26", time: "19:00", status: "confirmed", notes: "素食需求" },
  { id: "res-8", guestName: "吳太太", guestPhone: "0989-888-999", partySize: 2, date: "2024-03-26", time: "19:30", status: "cancelled" },
  { id: "res-9", guestName: "蔡先生", guestPhone: "0910-999-000", partySize: 5, date: "2024-03-26", time: "12:00", status: "no-show" },
  { id: "res-10", guestName: "許小姐", guestPhone: "0921-000-111", partySize: 4, date: "2024-03-26", time: "11:30", tableId: "t-6", status: "completed" },
  { id: "res-11", guestName: "鄭先生", guestPhone: "0932-111-222", partySize: 10, date: "2024-03-26", time: "18:00", tableId: "t-9", status: "confirmed", notes: "商務聚餐，需投影設備" },
  { id: "res-12", guestName: "周小姐", guestPhone: "0943-222-333", partySize: 2, date: "2024-03-26", time: "20:00", status: "confirmed" },
];

export const menuCategories: MenuCategory[] = [
  { id: "mcat-1", name: "前菜", sortOrder: 1 },
  { id: "mcat-2", name: "湯品", sortOrder: 2 },
  { id: "mcat-3", name: "主菜", sortOrder: 3 },
  { id: "mcat-4", name: "麵飯", sortOrder: 4 },
  { id: "mcat-5", name: "飲品", sortOrder: 5 },
];

export const menuItems: MenuItem[] = [
  { id: "mi-1", name: "涼拌海鮮沙拉", price: 280, description: "新鮮綜合海鮮搭配特製和風醬汁", categoryId: "mcat-1", available: true },
  { id: "mi-2", name: "松露薯條", price: 220, description: "酥脆薯條淋上黑松露油與帕瑪森起司", categoryId: "mcat-1", available: true },
  { id: "mi-3", name: "胡麻豆腐", price: 160, description: "日式胡麻醬佐嫩豆腐，清爽開胃", categoryId: "mcat-1", available: true },
  { id: "mi-4", name: "凱薩沙拉", price: 200, description: "羅美生菜、麵包丁與經典凱薩醬", categoryId: "mcat-1", available: true },
  { id: "mi-5", name: "法式洋蔥湯", price: 180, description: "慢燉洋蔥配焗烤起司麵包", categoryId: "mcat-2", available: true },
  { id: "mi-6", name: "南瓜濃湯", price: 160, description: "綿密南瓜搭配鮮奶油與肉桂粉", categoryId: "mcat-2", available: true },
  { id: "mi-7", name: "蛤蜊巧達湯", price: 200, description: "鮮甜蛤蜊搭配馬鈴薯與培根", categoryId: "mcat-2", available: false },
  { id: "mi-8", name: "爐烤肋眼牛排", price: 980, description: "嚴選美國 Prime 肋眼，搭配時蔬與薯泥", categoryId: "mcat-3", available: true },
  { id: "mi-9", name: "香煎鱸魚排", price: 680, description: "新鮮鱸魚香煎至金黃，佐檸檬奶油醬", categoryId: "mcat-3", available: true },
  { id: "mi-10", name: "紅酒燉牛頰", price: 780, description: "牛頰肉慢燉至軟嫩，紅酒醬汁濃郁入味", categoryId: "mcat-3", available: true },
  { id: "mi-11", name: "蒜香白酒蛤蜊義大利麵", price: 380, description: "蒜香白酒醬汁與新鮮蛤蜊", categoryId: "mcat-4", available: true },
  { id: "mi-12", name: "松露野菇燉飯", price: 420, description: "綜合野菇搭配松露油，米心彈牙", categoryId: "mcat-4", available: true },
  { id: "mi-13", name: "龍蝦義大利麵", price: 580, description: "半隻波士頓龍蝦搭配番茄醬汁", categoryId: "mcat-4", available: true },
  { id: "mi-14", name: "明太子奶油烏龍麵", price: 320, description: "Q彈烏龍麵拌入明太子奶油醬", categoryId: "mcat-4", available: true },
  { id: "mi-15", name: "手沖精品咖啡", price: 180, description: "每日精選莊園豆，手沖現萃", categoryId: "mcat-5", available: true },
  { id: "mi-16", name: "玫瑰荔枝氣泡飲", price: 160, description: "玫瑰花瓣搭配荔枝果肉與氣泡水", categoryId: "mcat-5", available: true },
  { id: "mi-17", name: "伯爵紅茶拿鐵", price: 150, description: "伯爵茶搭配鮮奶，溫潤順口", categoryId: "mcat-5", available: true },
  { id: "mi-18", name: "季節鮮榨果汁", price: 140, description: "當季新鮮水果現榨", categoryId: "mcat-5", available: true },
  { id: "mi-19", name: "酥烤春雞", price: 580, description: "半隻春雞香料醃漬烤至酥脆，配蜂蜜芥末醬", categoryId: "mcat-3", available: true },
  { id: "mi-20", name: "培根蘑菇披薩", price: 360, description: "薄脆餅皮搭配煙燻培根與綜合蘑菇", categoryId: "mcat-4", available: true },
];
`,
    },
    {
      path: "src/app/page.tsx",
      content: `"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { tables, reservations } from "@/lib/mock-data";
import type { ReservationStatus } from "@/lib/types";

const timeSlots = [
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00",
  "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
];

const statusColors: Record<ReservationStatus, { bg: string; label: string }> = {
  confirmed: { bg: "bg-blue-200 text-blue-900", label: "已確認" },
  seated: { bg: "bg-green-200 text-green-900", label: "已入座" },
  completed: { bg: "bg-gray-200 text-gray-700", label: "已完成" },
  cancelled: { bg: "bg-red-200 text-red-900", label: "已取消" },
  "no-show": { bg: "bg-orange-200 text-orange-900", label: "未到" },
};

const zoneLabels: Record<string, string> = {
  indoor: "室內區",
  outdoor: "戶外區",
  private: "包廂",
};

export default function TodayTimelinePage() {
  const [selectedDate] = useState("2024-03-26");

  const todayReservations = useMemo(
    () => reservations.filter((r) => r.date === selectedDate && r.status !== "cancelled"),
    [selectedDate]
  );

  const getReservationForSlot = (tableId: string, time: string) =>
    todayReservations.find((r) => r.tableId === tableId && r.time === time);

  const zones = useMemo(() => {
    const grouped: Record<string, typeof tables> = {};
    tables.forEach((t) => {
      if (!grouped[t.zone]) grouped[t.zone] = [];
      grouped[t.zone].push(t);
    });
    return grouped;
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">今日座位總覽</h1>
            <p className="text-sm text-gray-500 mt-1">{selectedDate}</p>
          </div>
          <nav className="flex gap-4 text-sm">
            <Link href="/reservations" className="text-gray-600 hover:text-gray-900">訂位管理</Link>
            <Link href="/tables" className="text-gray-600 hover:text-gray-900">桌位設定</Link>
            <Link href="/menu" className="text-gray-600 hover:text-gray-900">菜單</Link>
          </nav>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">今日訂位</p>
            <p className="text-2xl font-bold text-gray-900">
              {todayReservations.length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">已入座</p>
            <p className="text-2xl font-bold text-green-600">
              {todayReservations.filter((r) => r.status === "seated").length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">待入座</p>
            <p className="text-2xl font-bold text-blue-600">
              {todayReservations.filter((r) => r.status === "confirmed").length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">總用餐人數</p>
            <p className="text-2xl font-bold text-gray-900">
              {todayReservations.reduce((s, r) => s + r.partySize, 0)}
            </p>
          </div>
        </div>

        {/* 時間軸表格 */}
        <div className="bg-white rounded-xl shadow-sm overflow-auto">
          <div className="min-w-[900px]">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10 w-24">
                    桌位
                  </th>
                  {timeSlots.map((slot) => (
                    <th
                      key={slot}
                      className="px-2 py-3 text-center text-xs font-medium text-gray-500 min-w-[80px]"
                    >
                      {slot}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(zones).map(([zone, zoneTables]) => (
                  <>
                    <tr key={zone}>
                      <td
                        colSpan={timeSlots.length + 1}
                        className="px-3 py-2 bg-gray-100 text-xs font-bold text-gray-700 uppercase"
                      >
                        {zoneLabels[zone] || zone}
                      </td>
                    </tr>
                    {zoneTables.map((table) => (
                      <tr key={table.id} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 sticky left-0 bg-white z-10">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-900">{table.name}</span>
                            <span className="text-xs text-gray-500">{table.seats}人</span>
                          </div>
                        </td>
                        {timeSlots.map((slot) => {
                          const res = getReservationForSlot(table.id, slot);
                          if (res) {
                            const cfg = statusColors[res.status];
                            return (
                              <td key={slot} className="px-1 py-1">
                                <div
                                  className={\`rounded px-1.5 py-1 text-xs \${cfg.bg}\`}
                                  title={\`\${res.guestName} \${res.partySize}人 \${res.notes || ""}\`}
                                >
                                  <p className="font-medium truncate">{res.guestName}</p>
                                  <p className="opacity-80">{res.partySize}人</p>
                                </div>
                              </td>
                            );
                          }
                          return (
                            <td key={slot} className="px-1 py-1">
                              <div className="h-10 rounded border border-dashed border-gray-200" />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 圖例 */}
        <div className="flex gap-4 mt-4 text-sm flex-wrap">
          {Object.entries(statusColors).map(([key, val]) => (
            <div key={key} className="flex items-center gap-2">
              <div className={\`w-4 h-4 rounded \${val.bg.split(" ")[0]}\`} />
              <span className="text-gray-600">{val.label}</span>
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
      path: "src/app/reservations/page.tsx",
      content: `"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { reservations, tables } from "@/lib/mock-data";
import type { ReservationStatus } from "@/lib/types";

const statusConfig: Record<ReservationStatus, { label: string; color: string }> = {
  confirmed: { label: "已確認", color: "bg-blue-100 text-blue-800" },
  seated: { label: "已入座", color: "bg-green-100 text-green-800" },
  completed: { label: "已完成", color: "bg-gray-100 text-gray-800" },
  cancelled: { label: "已取消", color: "bg-red-100 text-red-800" },
  "no-show": { label: "未到", color: "bg-orange-100 text-orange-800" },
};

const filterTabs: { key: string; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "confirmed", label: "已確認" },
  { key: "seated", label: "已入座" },
  { key: "completed", label: "已完成" },
  { key: "cancelled", label: "已取消" },
  { key: "no-show", label: "未到" },
];

export default function ReservationsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [dateFilter, setDateFilter] = useState("2024-03-26");

  const filtered = useMemo(() => {
    let result = reservations;
    if (dateFilter) {
      result = result.filter((r) => r.date === dateFilter);
    }
    if (activeTab !== "all") {
      result = result.filter((r) => r.status === activeTab);
    }
    return result.sort((a, b) => a.time.localeCompare(b.time));
  }, [activeTab, dateFilter]);

  const getTableName = (tableId?: string) => {
    if (!tableId) return "未指定";
    const table = tables.find((t) => t.id === tableId);
    return table ? table.name : "未指定";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">訂位管理</h1>
          <nav className="flex gap-4 text-sm">
            <Link href="/" className="text-gray-600 hover:text-gray-900">今日總覽</Link>
            <Link href="/tables" className="text-gray-600 hover:text-gray-900">桌位設定</Link>
            <Link href="/menu" className="text-gray-600 hover:text-gray-900">菜單</Link>
          </nav>
        </div>

        {/* 篩選工具列 */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex gap-2 flex-wrap">
              {filterTabs.map((tab) => (
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
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 訂位表格 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">時間</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">人數</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">貴賓</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">電話</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">桌位</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">狀態</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">備註</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((res) => {
                const cfg = statusConfig[res.status];
                return (
                  <tr key={res.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{res.time}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{res.partySize}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{res.guestName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{res.guestPhone}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{getTableName(res.tableId)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={\`inline-block px-2 py-1 rounded-full text-xs font-medium \${cfg.color}\`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">
                      {res.notes || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">無符合條件的訂位</div>
          )}
        </div>
      </div>
    </div>
  );
}
`,
    },
    {
      path: "src/app/tables/page.tsx",
      content: `"use client";
import { useState } from "react";
import Link from "next/link";
import { tables } from "@/lib/mock-data";
import type { TableZone } from "@/lib/types";

const zoneLabels: Record<TableZone, string> = {
  indoor: "室內區",
  outdoor: "戶外區",
  private: "包廂",
};

const zoneColors: Record<TableZone, string> = {
  indoor: "bg-blue-50 border-blue-200",
  outdoor: "bg-green-50 border-green-200",
  private: "bg-purple-50 border-purple-200",
};

const statusConfig: Record<string, { label: string; color: string }> = {
  available: { label: "空桌", color: "bg-green-100 text-green-800" },
  occupied: { label: "使用中", color: "bg-red-100 text-red-800" },
  reserved: { label: "已預約", color: "bg-blue-100 text-blue-800" },
};

export default function TablesPage() {
  const [selectedZone, setSelectedZone] = useState<string>("all");

  const zones: TableZone[] = ["indoor", "outdoor", "private"];

  const filtered = selectedZone === "all"
    ? tables
    : tables.filter((t) => t.zone === selectedZone);

  const grouped: Record<string, typeof tables> = {};
  filtered.forEach((t) => {
    if (!grouped[t.zone]) grouped[t.zone] = [];
    grouped[t.zone].push(t);
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">桌位設定</h1>
          <nav className="flex gap-4 text-sm">
            <Link href="/" className="text-gray-600 hover:text-gray-900">今日總覽</Link>
            <Link href="/reservations" className="text-gray-600 hover:text-gray-900">訂位管理</Link>
            <Link href="/menu" className="text-gray-600 hover:text-gray-900">菜單</Link>
          </nav>
        </div>

        {/* 統計 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">桌位總數</p>
            <p className="text-2xl font-bold text-gray-900">{tables.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">空桌</p>
            <p className="text-2xl font-bold text-green-600">
              {tables.filter((t) => t.status === "available").length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">使用中</p>
            <p className="text-2xl font-bold text-red-600">
              {tables.filter((t) => t.status === "occupied").length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">總座位數</p>
            <p className="text-2xl font-bold text-gray-900">
              {tables.reduce((s, t) => s + t.seats, 0)}
            </p>
          </div>
        </div>

        {/* 區域篩選 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSelectedZone("all")}
            className={\`px-4 py-2 rounded-full text-sm transition \${
              selectedZone === "all"
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-700 border hover:bg-gray-50"
            }\`}
          >
            全部區域
          </button>
          {zones.map((zone) => (
            <button
              key={zone}
              onClick={() => setSelectedZone(zone)}
              className={\`px-4 py-2 rounded-full text-sm transition \${
                selectedZone === zone
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-700 border hover:bg-gray-50"
              }\`}
            >
              {zoneLabels[zone]}
            </button>
          ))}
        </div>

        {/* 桌位卡片 */}
        {Object.entries(grouped).map(([zone, zoneTables]) => (
          <div key={zone} className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {zoneLabels[zone as TableZone]}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {zoneTables.map((table) => {
                const cfg = statusConfig[table.status];
                return (
                  <div
                    key={table.id}
                    className={\`rounded-xl border-2 p-5 \${zoneColors[table.zone as TableZone]}\`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-bold text-gray-900">{table.name}</h3>
                      <span className={\`px-2 py-1 rounded-full text-xs font-medium \${cfg.color}\`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">座位數</span>
                        <span className="text-gray-900 font-medium">{table.seats} 人</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">區域</span>
                        <span className="text-gray-900">{zoneLabels[table.zone]}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
`,
    },
    {
      path: "src/app/menu/page.tsx",
      content: `"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { menuCategories, menuItems } from "@/lib/mock-data";

export default function MenuPage() {
  const sortedCategories = useMemo(
    () => [...menuCategories].sort((a, b) => a.sortOrder - b.sortOrder),
    []
  );
  const [activeCategory, setActiveCategory] = useState(sortedCategories[0]?.id || "");

  const filteredItems = useMemo(
    () => menuItems.filter((item) => item.categoryId === activeCategory),
    [activeCategory]
  );

  const activeCategoryName = sortedCategories.find((c) => c.id === activeCategory)?.name || "";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">菜單</h1>
          <nav className="flex gap-4 text-sm">
            <Link href="/" className="text-gray-600 hover:text-gray-900">今日總覽</Link>
            <Link href="/reservations" className="text-gray-600 hover:text-gray-900">訂位管理</Link>
            <Link href="/tables" className="text-gray-600 hover:text-gray-900">桌位設定</Link>
          </nav>
        </div>

        {/* 分類頁籤 */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {sortedCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={\`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition \${
                activeCategory === cat.id
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-700 border hover:bg-gray-50"
              }\`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* 分類標題 */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">{activeCategoryName}</h2>

        {/* 菜單項目卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={\`bg-white rounded-xl shadow-sm p-6 transition \${
                !item.available ? "opacity-50" : "hover:shadow-md"
              }\`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                {!item.available && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                    暫無供應
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-4">{item.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-red-600">
                  NT\${item.price.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12 text-gray-500">此分類尚無菜品</div>
        )}
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
      suggestedTypes: ["built_in_supabase", "postgresql"],
      purpose: "儲存訂位資料",
    },
    {
      category: "industry",
      suggestedTypes: ["built_in_restaurant"],
      purpose: "餐廳資料管理",
      optional: true,
    },
  ],
};
