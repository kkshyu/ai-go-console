import type { PresetOverlay } from "../index";

const TYPES_FILE = `export interface Property {
  id: number;
  address: string;
  district: string;
  type: "公寓" | "大樓" | "透天" | "店面";
  sizePing: number;
  floors: string;
  rentPrice: number | null;
  salePrice: number | null;
  status: "available" | "reserved" | "sold" | "rented";
  ownerId: number;
  description: string;
  listedDate: string;
}

export interface Owner {
  id: number;
  name: string;
  phone: string;
  email: string;
  commissionRate: number;
  propertyIds: number[];
  contactHistory: ContactRecord[];
}

export interface ContactRecord {
  date: string;
  note: string;
  type: "電話" | "現場" | "LINE";
}

export interface Transaction {
  id: number;
  date: string;
  propertyId: number;
  propertyAddress: string;
  type: "sale" | "rent";
  amount: number;
  commission: number;
  agent: string;
}

export interface Commission {
  agent: string;
  totalAmount: number;
  transactionCount: number;
}

export type District = "中正區" | "大安區" | "信義區" | "中山區" | "松山區" | "內湖區" | "板橋區" | "新店區" | "中和區" | "永和區";
`;

const MOCK_DATA_FILE = `import { Property, Owner, Transaction } from "./types";

export const properties: Property[] = [
  { id: 1, address: "台北市信義區松仁路88號12樓", district: "信義區", type: "大樓", sizePing: 45.6, floors: "12F/28F", rentPrice: null, salePrice: 38800000, status: "available", ownerId: 1, description: "近象山捷運站，三房兩廳，景觀戶", listedDate: "2024-10-15" },
  { id: 2, address: "台北市大安區復興南路一段200號5樓", district: "大安區", type: "大樓", sizePing: 32.1, floors: "5F/14F", rentPrice: 35000, salePrice: null, status: "rented", ownerId: 2, description: "近復興SOGO，兩房一廳，裝潢佳", listedDate: "2024-09-01" },
  { id: 3, address: "台北市中山區南京東路二段15號3樓", district: "中山區", type: "公寓", sizePing: 28.5, floors: "3F/5F", rentPrice: 22000, salePrice: null, status: "available", ownerId: 3, description: "近松江南京站，交通便利，採光佳", listedDate: "2024-11-05" },
  { id: 4, address: "新北市板橋區文化路一段100號18樓", district: "板橋區", type: "大樓", sizePing: 38.2, floors: "18F/25F", rentPrice: null, salePrice: 22500000, status: "available", ownerId: 4, description: "板橋車站旁，新成屋，三房兩廳", listedDate: "2024-11-20" },
  { id: 5, address: "台北市松山區八德路四段520號1樓", district: "松山區", type: "店面", sizePing: 25.0, floors: "1F/1F", rentPrice: 85000, salePrice: null, status: "available", ownerId: 5, description: "臨大馬路，人潮多，適合餐飲業", listedDate: "2024-10-01" },
  { id: 6, address: "台北市內湖區成功路四段168號7樓", district: "內湖區", type: "大樓", sizePing: 52.3, floors: "7F/15F", rentPrice: null, salePrice: 31200000, status: "reserved", ownerId: 1, description: "內湖科技園區旁，四房格局，社區管理佳", listedDate: "2024-08-15" },
  { id: 7, address: "新北市新店區中正路250號", district: "新店區", type: "透天", sizePing: 75.0, floors: "1-4F", rentPrice: null, salePrice: 48000000, status: "available", ownerId: 2, description: "獨棟透天，前後院，近碧潭風景區", listedDate: "2024-12-01" },
  { id: 8, address: "新北市中和區中和路300號10樓", district: "中和區", type: "大樓", sizePing: 30.8, floors: "10F/20F", rentPrice: 18000, salePrice: null, status: "available", ownerId: 3, description: "近環狀線站，兩房一廳，管理費低", listedDate: "2024-11-15" },
  { id: 9, address: "台北市大安區仁愛路四段88號15樓", district: "大安區", type: "大樓", sizePing: 68.5, floors: "15F/22F", rentPrice: null, salePrice: 72000000, status: "sold", ownerId: 4, description: "仁愛豪宅，四房雙衛，管家服務", listedDate: "2024-06-01" },
  { id: 10, address: "新北市永和區中正路500號2樓", district: "永和區", type: "公寓", sizePing: 22.0, floors: "2F/5F", rentPrice: 15000, salePrice: null, status: "rented", ownerId: 5, description: "頂溪捷運站旁，套房格局，適合上班族", listedDate: "2024-09-20" },
  { id: 11, address: "台北市中正區重慶南路一段50號6樓", district: "中正區", type: "大樓", sizePing: 35.0, floors: "6F/12F", rentPrice: null, salePrice: 28500000, status: "available", ownerId: 1, description: "台北車站商圈，兩房兩廳，屋況佳", listedDate: "2024-12-10" },
];

export const owners: Owner[] = [
  {
    id: 1, name: "王建民", phone: "0912-111-222", email: "wang@example.com", commissionRate: 4,
    propertyIds: [1, 6, 11],
    contactHistory: [
      { date: "2024-12-15", note: "討論信義區物件降價策略", type: "電話" },
      { date: "2024-12-01", note: "內湖物件有人出價斡旋", type: "LINE" },
    ],
  },
  {
    id: 2, name: "陳美玲", phone: "0923-333-444", email: "chen.ml@example.com", commissionRate: 3.5,
    propertyIds: [2, 7],
    contactHistory: [
      { date: "2024-12-10", note: "新店透天確認開價", type: "現場" },
    ],
  },
  {
    id: 3, name: "林志偉", phone: "0934-555-666", email: "lin.cw@example.com", commissionRate: 4,
    propertyIds: [3, 8],
    contactHistory: [
      { date: "2024-12-12", note: "中和物件租金調整", type: "電話" },
      { date: "2024-11-25", note: "中山區公寓拍照", type: "現場" },
    ],
  },
  {
    id: 4, name: "張淑芬", phone: "0945-777-888", email: "chang.sf@example.com", commissionRate: 3,
    propertyIds: [4, 9],
    contactHistory: [
      { date: "2024-12-08", note: "大安仁愛豪宅已成交簽約", type: "現場" },
    ],
  },
  {
    id: 5, name: "黃國豪", phone: "0956-999-000", email: "huang.kh@example.com", commissionRate: 4.5,
    propertyIds: [5, 10],
    contactHistory: [
      { date: "2024-12-05", note: "松山店面有租客來看", type: "LINE" },
      { date: "2024-11-28", note: "永和套房續約事宜", type: "電話" },
    ],
  },
];

export const transactions: Transaction[] = [
  { id: 1, date: "2024-12-08", propertyId: 9, propertyAddress: "台北市大安區仁愛路四段88號15樓", type: "sale", amount: 72000000, commission: 2160000, agent: "李業務" },
  { id: 2, date: "2024-11-15", propertyId: 2, propertyAddress: "台北市大安區復興南路一段200號5樓", type: "rent", amount: 35000, commission: 35000, agent: "李業務" },
  { id: 3, date: "2024-10-20", propertyId: 10, propertyAddress: "新北市永和區中正路500號2樓", type: "rent", amount: 15000, commission: 15000, agent: "張經理" },
  { id: 4, date: "2024-09-05", propertyId: 6, propertyAddress: "台北市內湖區成功路四段168號7樓", type: "sale", amount: 29800000, commission: 1192000, agent: "張經理" },
  { id: 5, date: "2024-08-18", propertyId: 3, propertyAddress: "台北市中山區南京東路二段15號3樓", type: "rent", amount: 22000, commission: 22000, agent: "李業務" },
];
`;

const DASHBOARD_PAGE = `"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const stats = {
  totalProperties: 11,
  availableCount: 6,
  newThisMonth: 2,
  totalSalesAmount: 101800000,
};

const typeDistribution = [
  { name: "大樓", value: 6 },
  { name: "公寓", value: 2 },
  { name: "透天", value: 1 },
  { name: "店面", value: 1 },
];

const COLORS = ["#3b82f6", "#f97316", "#10b981", "#8b5cf6"];

const monthlySales = [
  { month: "8月", amount: 29800000 },
  { month: "9月", amount: 22000 },
  { month: "10月", amount: 15000 },
  { month: "11月", amount: 35000 },
  { month: "12月", amount: 72000000 },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">不動產管理系統</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">物件總數</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalProperties}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">待租售數</p>
            <p className="text-3xl font-bold text-blue-600">{stats.availableCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">本月新增</p>
            <p className="text-3xl font-bold text-green-600">{stats.newThisMonth}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">累計成交金額</p>
            <p className="text-2xl font-bold text-purple-600">NT$ {(stats.totalSalesAmount / 10000).toLocaleString()} 萬</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">物件類型分佈</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={typeDistribution} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => \`\${name} \${value}\`}>
                  {typeDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">月成交金額趨勢</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => \`\${(v / 10000).toLocaleString()}萬\`} />
                <Tooltip formatter={(v: number) => \`NT$ \${v.toLocaleString()}\`} />
                <Bar dataKey="amount" name="成交金額" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

const PROPERTIES_PAGE = `"use client";
import { useState } from "react";

const statusLabels: Record<string, string> = { available: "待租售", reserved: "斡旋中", sold: "已售出", rented: "已出租" };
const statusColors: Record<string, string> = { available: "bg-green-100 text-green-800", reserved: "bg-yellow-100 text-yellow-800", sold: "bg-gray-100 text-gray-500", rented: "bg-blue-100 text-blue-800" };

const properties = [
  { id: 1, address: "台北市信義區松仁路88號12樓", district: "信義區", type: "大樓", sizePing: 45.6, floors: "12F/28F", price: "售 3,880萬", status: "available" },
  { id: 2, address: "台北市大安區復興南路一段200號5樓", district: "大安區", type: "大樓", sizePing: 32.1, floors: "5F/14F", price: "租 35,000/月", status: "rented" },
  { id: 3, address: "台北市中山區南京東路二段15號3樓", district: "中山區", type: "公寓", sizePing: 28.5, floors: "3F/5F", price: "租 22,000/月", status: "available" },
  { id: 4, address: "新北市板橋區文化路一段100號18樓", district: "板橋區", type: "大樓", sizePing: 38.2, floors: "18F/25F", price: "售 2,250萬", status: "available" },
  { id: 5, address: "台北市松山區八德路四段520號1樓", district: "松山區", type: "店面", sizePing: 25.0, floors: "1F/1F", price: "租 85,000/月", status: "available" },
  { id: 6, address: "台北市內湖區成功路四段168號7樓", district: "內湖區", type: "大樓", sizePing: 52.3, floors: "7F/15F", price: "售 3,120萬", status: "reserved" },
  { id: 7, address: "新北市新店區中正路250號", district: "新店區", type: "透天", sizePing: 75.0, floors: "1-4F", price: "售 4,800萬", status: "available" },
  { id: 8, address: "新北市中和區中和路300號10樓", district: "中和區", type: "大樓", sizePing: 30.8, floors: "10F/20F", price: "租 18,000/月", status: "available" },
  { id: 9, address: "台北市大安區仁愛路四段88號15樓", district: "大安區", type: "大樓", sizePing: 68.5, floors: "15F/22F", price: "售 7,200萬", status: "sold" },
  { id: 10, address: "新北市永和區中正路500號2樓", district: "永和區", type: "公寓", sizePing: 22.0, floors: "2F/5F", price: "租 15,000/月", status: "rented" },
  { id: 11, address: "台北市中正區重慶南路一段50號6樓", district: "中正區", type: "大樓", sizePing: 35.0, floors: "6F/12F", price: "售 2,850萬", status: "available" },
];

const types = ["全部", "大樓", "公寓", "透天", "店面"];
const districts = ["全部", "信義區", "大安區", "中山區", "松山區", "內湖區", "中正區", "板橋區", "新店區", "中和區", "永和區"];
const statuses = ["全部", "available", "reserved", "sold", "rented"];

export default function PropertiesPage() {
  const [filterType, setFilterType] = useState("全部");
  const [filterDistrict, setFilterDistrict] = useState("全部");
  const [filterStatus, setFilterStatus] = useState("全部");

  const filtered = properties
    .filter((p) => filterType === "全部" || p.type === filterType)
    .filter((p) => filterDistrict === "全部" || p.district === filterDistrict)
    .filter((p) => filterStatus === "全部" || p.status === filterStatus);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">物件管理</h1>

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            {types.map((t) => <option key={t} value={t}>{t === "全部" ? "全部類型" : t}</option>)}
          </select>
          <select value={filterDistrict} onChange={(e) => setFilterDistrict(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            {districts.map((d) => <option key={d} value={d}>{d === "全部" ? "全部區域" : d}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            {statuses.map((s) => <option key={s} value={s}>{s === "全部" ? "全部狀態" : statusLabels[s]}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">地址</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">區域</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">類型</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">坪數</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">樓層</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">價格</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">狀態</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{p.address}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.district}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.type}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">{p.sizePing} 坪</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.floors}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{p.price}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={\`px-2 py-1 rounded-full text-xs font-medium \${statusColors[p.status]}\`}>{statusLabels[p.status]}</span>
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
`;

const OWNERS_PAGE = `"use client";
import { useState } from "react";

const owners = [
  {
    id: 1, name: "王建民", phone: "0912-111-222", email: "wang@example.com", propertiesCount: 3, totalEstimatedValue: 98500000, commissionRate: 4,
    properties: ["信義區松仁路88號12樓", "內湖區成功路四段168號7樓", "中正區重慶南路一段50號6樓"],
    contactHistory: [
      { date: "2024-12-15", note: "討論信義區物件降價策略", type: "電話" },
      { date: "2024-12-01", note: "內湖物件有人出價斡旋", type: "LINE" },
    ],
  },
  {
    id: 2, name: "陳美玲", phone: "0923-333-444", email: "chen.ml@example.com", propertiesCount: 2, totalEstimatedValue: 48035000, commissionRate: 3.5,
    properties: ["大安區復興南路一段200號5樓", "新店區中正路250號"],
    contactHistory: [
      { date: "2024-12-10", note: "新店透天確認開價", type: "現場" },
    ],
  },
  {
    id: 3, name: "林志偉", phone: "0934-555-666", email: "lin.cw@example.com", propertiesCount: 2, totalEstimatedValue: 18040000, commissionRate: 4,
    properties: ["中山區南京東路二段15號3樓", "中和區中和路300號10樓"],
    contactHistory: [
      { date: "2024-12-12", note: "中和物件租金調整", type: "電話" },
      { date: "2024-11-25", note: "中山區公寓拍照", type: "現場" },
    ],
  },
  {
    id: 4, name: "張淑芬", phone: "0945-777-888", email: "chang.sf@example.com", propertiesCount: 2, totalEstimatedValue: 94500000, commissionRate: 3,
    properties: ["板橋區文化路一段100號18樓", "大安區仁愛路四段88號15樓"],
    contactHistory: [
      { date: "2024-12-08", note: "大安仁愛豪宅已成交簽約", type: "現場" },
    ],
  },
  {
    id: 5, name: "黃國豪", phone: "0956-999-000", email: "huang.kh@example.com", propertiesCount: 2, totalEstimatedValue: 25085000, commissionRate: 4.5,
    properties: ["松山區八德路四段520號1樓", "永和區中正路500號2樓"],
    contactHistory: [
      { date: "2024-12-05", note: "松山店面有租客來看", type: "LINE" },
      { date: "2024-11-28", note: "永和套房續約事宜", type: "電話" },
    ],
  },
];

export default function OwnersPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = owners.find((o) => o.id === selectedId);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">屋主管理</h1>

        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">電話</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">物件數</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">估計總值</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {owners.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{o.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{o.phone}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{o.email}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">{o.propertiesCount}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">NT$ {(o.totalEstimatedValue / 10000).toLocaleString()} 萬</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => setSelectedId(o.id)} className="text-blue-600 hover:text-blue-800 text-sm">詳細</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">屋主詳情 - {selected.name}</h2>
              <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-gray-600 text-sm">關閉</button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div><span className="text-gray-500">電話：</span>{selected.phone}</div>
              <div><span className="text-gray-500">Email：</span>{selected.email}</div>
              <div><span className="text-gray-500">佣金比例：</span>{selected.commissionRate}%</div>
              <div><span className="text-gray-500">物件數：</span>{selected.propertiesCount}</div>
            </div>

            <h3 className="text-sm font-semibold text-gray-700 mb-2">委託物件</h3>
            <ul className="list-disc list-inside mb-4 text-sm text-gray-600 space-y-1">
              {selected.properties.map((p, i) => <li key={i}>{p}</li>)}
            </ul>

            <h3 className="text-sm font-semibold text-gray-700 mb-2">聯繫紀錄</h3>
            <div className="space-y-2">
              {selected.contactHistory.map((c, i) => (
                <div key={i} className="flex items-start gap-3 p-2 bg-gray-50 rounded">
                  <span className="text-xs text-gray-400 whitespace-nowrap">{c.date}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">{c.type}</span>
                  <span className="text-sm text-gray-700">{c.note}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
`;

const TRANSACTIONS_PAGE = `"use client";
import { useState } from "react";

const transactions = [
  { id: 1, date: "2024-12-08", propertyAddress: "台北市大安區仁愛路四段88號15樓", type: "sale", amount: 72000000, commission: 2160000, agent: "李業務" },
  { id: 2, date: "2024-11-15", propertyAddress: "台北市大安區復興南路一段200號5樓", type: "rent", amount: 35000, commission: 35000, agent: "李業務" },
  { id: 3, date: "2024-10-20", propertyAddress: "新北市永和區中正路500號2樓", type: "rent", amount: 15000, commission: 15000, agent: "張經理" },
  { id: 4, date: "2024-09-05", propertyAddress: "台北市內湖區成功路四段168號7樓", type: "sale", amount: 29800000, commission: 1192000, agent: "張經理" },
  { id: 5, date: "2024-08-18", propertyAddress: "台北市中山區南京東路二段15號3樓", type: "rent", amount: 22000, commission: 22000, agent: "李業務" },
];

const typeLabels: Record<string, string> = { sale: "買賣", rent: "租賃" };
const typeColors: Record<string, string> = { sale: "bg-purple-100 text-purple-800", rent: "bg-blue-100 text-blue-800" };

export default function TransactionsPage() {
  const [filterType, setFilterType] = useState("all");

  const filtered = transactions.filter((t) => filterType === "all" || t.type === filterType);

  const totalAmount = filtered.reduce((sum, t) => sum + t.amount, 0);
  const totalCommission = filtered.reduce((sum, t) => sum + t.commission, 0);

  const q4Transactions = transactions.filter((t) => {
    const month = parseInt(t.date.split("-")[1]);
    return month >= 10 && month <= 12;
  });
  const q4Total = q4Transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">成交紀錄</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">篩選期間總額</p>
            <p className="text-2xl font-bold text-gray-900">NT$ {totalAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">篩選期間佣金</p>
            <p className="text-2xl font-bold text-green-600">NT$ {totalCommission.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">Q4 成交總額</p>
            <p className="text-2xl font-bold text-purple-600">NT$ {q4Total.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="all">全部類型</option>
            <option value="sale">買賣</option>
            <option value="rent">租賃</option>
          </select>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">物件</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">類型</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">金額</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">佣金</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">經辦人</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{t.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{t.propertyAddress}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={\`px-2 py-1 rounded-full text-xs font-medium \${typeColors[t.type]}\`}>{typeLabels[t.type]}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">NT$ {t.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-green-600">NT$ {t.commission.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{t.agent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
`;

export const ERP_REALESTATE: PresetOverlay = {
  templateId: "erp",
  files: [
    { path: "src/app/page.tsx", content: DASHBOARD_PAGE },
    { path: "src/app/properties/page.tsx", content: PROPERTIES_PAGE },
    { path: "src/app/owners/page.tsx", content: OWNERS_PAGE },
    { path: "src/app/transactions/page.tsx", content: TRANSACTIONS_PAGE },
    { path: "src/lib/types.ts", content: TYPES_FILE },
    { path: "src/lib/mock-data.ts", content: MOCK_DATA_FILE },
  ],
  requiredServices: [
    { category: "database", suggestedTypes: ["built_in_supabase", "postgresql"], purpose: "儲存物件與交易資料" },
    { category: "industry", suggestedTypes: ["built_in_realestate"], purpose: "存取物件資料庫", optional: true },
  ],
};
