import type { PresetOverlay } from "../index";

const TYPES_FILE = `export type ClientType = "buy" | "rent";
export type AreaName = "\u4fe1\u7fa9\u5340" | "\u5927\u5b89\u5340" | "\u4e2d\u5c71\u5340" | "\u677f\u6a4b\u5340" | "\u4e2d\u548c\u5340" | "\u6c38\u548c\u5340" | "\u65b0\u5e97\u5340" | "\u5167\u6e56\u5340" | "\u677e\u5c71\u5340" | "\u5357\u6e2f\u5340";

export interface Client {
  id: string;
  name: string;
  phone: string;
  type: ClientType;
  budgetMin: number;
  budgetMax: number;
  preferredArea: AreaName[];
  preferredSize: number; // \u576a
  notes?: string;
  createdAt: string;
}

export interface PropertyNeed {
  id: string;
  clientId: string;
  type: ClientType;
  area: AreaName;
  minSize: number;
  maxBudget: number;
  features: string[];
}

export interface PropertyMatch {
  id: string;
  clientId: string;
  propertyName: string;
  area: AreaName;
  size: number;
  price: number;
  matchScore: number;
  address: string;
  type: string;
}

export interface Visit {
  id: string;
  clientId: string;
  clientName: string;
  propertyName: string;
  address: string;
  date: string;
  time: string;
  feedbackRating: number | null;
  notes: string;
  status: "scheduled" | "completed" | "cancelled";
}

export interface Feedback {
  visitId: string;
  rating: number;
  comment: string;
}
`;

const MOCK_DATA_FILE = `import { Client, Visit, PropertyMatch } from "./types";

export const clients: Client[] = [
  { id: "cl1", name: "\u738b\u5fd7\u660e", phone: "0912-345-678", type: "buy", budgetMin: 15000000, budgetMax: 25000000, preferredArea: ["\u4fe1\u7fa9\u5340", "\u5927\u5b89\u5340"], preferredSize: 35, createdAt: "2025-02-10", notes: "\u5e0c\u671b\u8fd1\u6377\u904b\u7ad9" },
  { id: "cl2", name: "\u9673\u7f8e\u83ef", phone: "0923-456-789", type: "buy", budgetMin: 20000000, budgetMax: 35000000, preferredArea: ["\u4e2d\u5c71\u5340", "\u677e\u5c71\u5340"], preferredSize: 45, createdAt: "2025-01-15", notes: "\u9700\u8981\u4e09\u623f\uff0c\u6709\u5b69\u5b50\u5c31\u5b78\u9700\u6c42" },
  { id: "cl3", name: "\u6797\u5efa\u5b8f", phone: "0934-567-890", type: "rent", budgetMin: 20000, budgetMax: 35000, preferredArea: ["\u677f\u6a4b\u5340", "\u4e2d\u548c\u5340"], preferredSize: 25, createdAt: "2025-03-01" },
  { id: "cl4", name: "\u9ec3\u96c5\u7433", phone: "0945-678-901", type: "buy", budgetMin: 30000000, budgetMax: 50000000, preferredArea: ["\u4fe1\u7fa9\u5340", "\u5167\u6e56\u5340"], preferredSize: 55, createdAt: "2025-02-20", notes: "\u6295\u8cc7\u578b\u8cb7\u5bb6\uff0c\u504f\u597d\u65b0\u5efa\u6848" },
  { id: "cl5", name: "\u5f35\u570b\u826f", phone: "0956-789-012", type: "rent", budgetMin: 15000, budgetMax: 22000, preferredArea: ["\u6c38\u548c\u5340", "\u65b0\u5e97\u5340"], preferredSize: 20, createdAt: "2025-03-10" },
  { id: "cl6", name: "\u5289\u82b3\u5b9c", phone: "0967-890-123", type: "buy", budgetMin: 12000000, budgetMax: 18000000, preferredArea: ["\u5357\u6e2f\u5340", "\u5167\u6e56\u5340"], preferredSize: 30, createdAt: "2025-03-05", notes: "\u9996\u8cfc\u65cf\uff0c\u5e0c\u671b\u6709\u8eca\u4f4d" },
  { id: "cl7", name: "\u8b1d\u5b97\u7ff0", phone: "0978-901-234", type: "buy", budgetMin: 40000000, budgetMax: 60000000, preferredArea: ["\u5927\u5b89\u5340", "\u4fe1\u7fa9\u5340"], preferredSize: 60, createdAt: "2025-01-28", notes: "\u63db\u5c4b\u65cf\uff0c\u73fe\u6709\u7269\u4ef6\u53ef\u8ce3" },
  { id: "cl8", name: "\u5433\u6dd1\u82ac", phone: "0989-012-345", type: "rent", budgetMin: 25000, budgetMax: 40000, preferredArea: ["\u4e2d\u5c71\u5340", "\u677e\u5c71\u5340"], preferredSize: 30, createdAt: "2025-03-15", notes: "\u5e36\u5bf5\u7269\uff0c\u9700\u8981\u53ef\u990a\u5bf5\u7269\u7269\u4ef6" },
];

export const propertyMatches: PropertyMatch[] = [
  { id: "pm1", clientId: "cl1", propertyName: "\u4fe1\u7fa9\u7f8e\u5fb3", area: "\u4fe1\u7fa9\u5340", size: 32, price: 22000000, matchScore: 85, address: "\u4fe1\u7fa9\u8def\u4e94\u6bb5120\u865f", type: "\u96fb\u68af\u5927\u6a13" },
  { id: "pm2", clientId: "cl1", propertyName: "\u6566\u5316\u8c6a\u5ead", area: "\u5927\u5b89\u5340", size: 38, price: 24500000, matchScore: 78, address: "\u6566\u5316\u5357\u8def\u4e8c\u6bb5200\u865f", type: "\u96fb\u68af\u5927\u6a13" },
  { id: "pm3", clientId: "cl2", propertyName: "\u6c11\u751f\u7f8e\u5883", area: "\u4e2d\u5c71\u5340", size: 48, price: 32000000, matchScore: 92, address: "\u6c11\u751f\u6771\u8def\u4e09\u6bb550\u865f", type: "\u96fb\u68af\u5927\u6a13" },
  { id: "pm4", clientId: "cl3", propertyName: "\u677f\u6a4b\u65b0\u5bbf", area: "\u677f\u6a4b\u5340", size: 22, price: 28000, matchScore: 88, address: "\u6587\u5316\u8def\u4e00\u6bb580\u865f", type: "\u516c\u5bd3" },
  { id: "pm5", clientId: "cl4", propertyName: "\u4fe1\u7fa9\u8c6a\u5b85A+", area: "\u4fe1\u7fa9\u5340", size: 58, price: 48000000, matchScore: 90, address: "\u4fe1\u7fa9\u8def\u56db\u6bb5300\u865f", type: "\u65b0\u5efa\u6848" },
  { id: "pm6", clientId: "cl5", propertyName: "\u6c38\u548c\u96c5\u5c45", area: "\u6c38\u548c\u5340", size: 18, price: 18000, matchScore: 82, address: "\u4e2d\u6b63\u8def500\u865f", type: "\u516c\u5bd3" },
  { id: "pm7", clientId: "cl6", propertyName: "\u5357\u6e2f\u7f8e\u5712", area: "\u5357\u6e2f\u5340", size: 28, price: 16500000, matchScore: 86, address: "\u7814\u7a76\u9662\u8def\u4e09\u6bb560\u865f", type: "\u96fb\u68af\u5927\u6a13" },
  { id: "pm8", clientId: "cl7", propertyName: "\u5927\u5b89\u6975\u7f8e", area: "\u5927\u5b89\u5340", size: 62, price: 55000000, matchScore: 88, address: "\u5fe0\u5b5d\u6771\u8def\u56db\u6bb5100\u865f", type: "\u65b0\u5efa\u6848" },
  { id: "pm9", clientId: "cl8", propertyName: "\u677e\u5c71\u83ef\u5ead", area: "\u677e\u5c71\u5340", size: 32, price: 35000, matchScore: 75, address: "\u5357\u4eac\u6771\u8def\u56db\u6bb5200\u865f", type: "\u516c\u5bd3" },
];

export const visits: Visit[] = [
  { id: "v1", clientId: "cl1", clientName: "\u738b\u5fd7\u660e", propertyName: "\u4fe1\u7fa9\u7f8e\u5fb3", address: "\u4fe1\u7fa9\u8def\u4e94\u6bb5120\u865f", date: "2025-03-18", time: "14:00", feedbackRating: 4, notes: "\u5ba2\u6236\u6eff\u610f\u683c\u5c40\uff0c\u4f46\u89ba\u5f97\u50f9\u683c\u7a0d\u9ad8", status: "completed" },
  { id: "v2", clientId: "cl2", clientName: "\u9673\u7f8e\u83ef", propertyName: "\u6c11\u751f\u7f8e\u5883", address: "\u6c11\u751f\u6771\u8def\u4e09\u6bb550\u865f", date: "2025-03-20", time: "10:00", feedbackRating: 5, notes: "\u975e\u5e38\u559c\u6b61\uff0c\u5b78\u5340\u8fd1\uff0c\u8003\u616e\u51fa\u50f9", status: "completed" },
  { id: "v3", clientId: "cl3", clientName: "\u6797\u5efa\u5b8f", propertyName: "\u677f\u6a4b\u65b0\u5bbf", address: "\u6587\u5316\u8def\u4e00\u6bb580\u865f", date: "2025-03-22", time: "16:00", feedbackRating: 3, notes: "\u7a7a\u9593\u504f\u5c0f\uff0c\u7e7c\u7e8c\u770b\u5176\u4ed6\u7269\u4ef6", status: "completed" },
  { id: "v4", clientId: "cl4", clientName: "\u9ec3\u96c5\u7433", propertyName: "\u4fe1\u7fa9\u8c6a\u5b85A+", address: "\u4fe1\u7fa9\u8def\u56db\u6bb5300\u865f", date: "2025-03-25", time: "11:00", feedbackRating: null, notes: "", status: "scheduled" },
  { id: "v5", clientId: "cl7", clientName: "\u8b1d\u5b97\u7ff0", propertyName: "\u5927\u5b89\u6975\u7f8e", address: "\u5fe0\u5b5d\u6771\u8def\u56db\u6bb5100\u865f", date: "2025-03-26", time: "14:30", feedbackRating: null, notes: "", status: "scheduled" },
  { id: "v6", clientId: "cl6", clientName: "\u5289\u82b3\u5b9c", propertyName: "\u5357\u6e2f\u7f8e\u5712", address: "\u7814\u7a76\u9662\u8def\u4e09\u6bb560\u865f", date: "2025-03-15", time: "09:30", feedbackRating: 4, notes: "\u683c\u5c40\u4e0d\u932f\uff0c\u4f46\u6c92\u6709\u8eca\u4f4d\uff0c\u518d\u8003\u616e", status: "completed" },
  { id: "v7", clientId: "cl8", clientName: "\u5433\u6dd1\u82ac", propertyName: "\u677e\u5c71\u83ef\u5ead", address: "\u5357\u4eac\u6771\u8def\u56db\u6bb5200\u865f", date: "2025-03-28", time: "15:00", feedbackRating: null, notes: "", status: "scheduled" },
];
`;

const PAGE_DASHBOARD = `"use client";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { clients, visits } from "@/lib/mock-data";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function Dashboard() {
  const pendingVisits = visits.filter((v) => v.status === "scheduled").length;
  const completedVisits = visits.filter((v) => v.status === "completed");
  const monthlyClosedCount = 3;
  const totalCommission = 1850000;

  const areaMap = new Map<string, number>();
  clients.forEach((c) => {
    c.preferredArea.forEach((area) => {
      areaMap.set(area, (areaMap.get(area) || 0) + 1);
    });
  });
  const pieData = Array.from(areaMap.entries()).map(([name, value]) => ({ name, value }));

  const buyCount = clients.filter((c) => c.type === "buy").length;
  const rentCount = clients.filter((c) => c.type === "rent").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <h1 className="text-xl font-bold text-gray-900">\u4e0d\u52d5\u7522 CRM</h1>
          <Link href="/" className="text-blue-600 font-medium">\u5100\u8868\u677f</Link>
          <Link href="/clients" className="text-gray-600 hover:text-blue-600">\u5ba2\u6236\u9700\u6c42</Link>
          <Link href="/matching" className="text-gray-600 hover:text-blue-600">\u7269\u4ef6\u914d\u5c0d</Link>
          <Link href="/visits" className="text-gray-600 hover:text-blue-600">\u5e36\u770b\u7d00\u9304</Link>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">\u5f85\u5e36\u770b\u6578</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{pendingVisits}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">\u672c\u6708\u6210\u4ea4\u6578</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{monthlyClosedCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">\u4f63\u91d1\u7d71\u8a08</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">NT$ {totalCommission.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">\u5ba2\u6236\u7d44\u6210</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">\u8cb7\u5c4b {buyCount} / \u79df\u5c4b {rentCount}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">\u5ba2\u6236\u9700\u6c42\u5340\u57df\u5206\u4f48</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => \`\${name} \${(percent * 100).toFixed(0)}%\`}>
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">\u8fd1\u671f\u5e36\u770b</h2>
            <div className="space-y-3">
              {visits.slice(0, 6).map((v) => (
                <div key={v.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{v.clientName} - {v.propertyName}</p>
                    <p className="text-xs text-gray-500">{v.address}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-700">{v.date} {v.time}</p>
                    <span className={\`inline-block text-xs px-2 py-0.5 rounded-full \${
                      v.status === "completed" ? "bg-green-100 text-green-700" :
                      v.status === "scheduled" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-700"
                    }\`}>{v.status === "completed" ? "\u5df2\u5b8c\u6210" : v.status === "scheduled" ? "\u5df2\u6392\u5b9a" : "\u5df2\u53d6\u6d88"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

const PAGE_CLIENTS = `"use client";
import { useState } from "react";
import Link from "next/link";
import { clients } from "@/lib/mock-data";
import type { ClientType, AreaName } from "@/lib/types";

const areas: AreaName[] = ["\u4fe1\u7fa9\u5340", "\u5927\u5b89\u5340", "\u4e2d\u5c71\u5340", "\u677f\u6a4b\u5340", "\u4e2d\u548c\u5340", "\u6c38\u548c\u5340", "\u65b0\u5e97\u5340", "\u5167\u6e56\u5340", "\u677e\u5c71\u5340", "\u5357\u6e2f\u5340"];

export default function ClientsPage() {
  const [filterType, setFilterType] = useState<ClientType | "all">("all");
  const [filterArea, setFilterArea] = useState<AreaName | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = clients.filter((c) => {
    const matchType = filterType === "all" || c.type === filterType;
    const matchArea = filterArea === "all" || c.preferredArea.includes(filterArea as AreaName);
    const matchSearch = c.name.includes(search) || c.phone.includes(search);
    return matchType && matchArea && matchSearch;
  });

  const formatBudget = (min: number, max: number, type: ClientType) => {
    if (type === "rent") {
      return \`NT$ \${min.toLocaleString()} - \${max.toLocaleString()} /\u6708\`;
    }
    return \`NT$ \${(min / 10000).toLocaleString()}\u842c - \${(max / 10000).toLocaleString()}\u842c\`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <h1 className="text-xl font-bold text-gray-900">\u4e0d\u52d5\u7522 CRM</h1>
          <Link href="/" className="text-gray-600 hover:text-blue-600">\u5100\u8868\u677f</Link>
          <Link href="/clients" className="text-blue-600 font-medium">\u5ba2\u6236\u9700\u6c42</Link>
          <Link href="/matching" className="text-gray-600 hover:text-blue-600">\u7269\u4ef6\u914d\u5c0d</Link>
          <Link href="/visits" className="text-gray-600 hover:text-blue-600">\u5e36\u770b\u7d00\u9304</Link>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">\u5ba2\u6236\u9700\u6c42\u7ba1\u7406</h2>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="\u641c\u5c0b\u5ba2\u6236\u59d3\u540d\u6216\u96fb\u8a71..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as ClientType | "all")}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">\u5168\u90e8\u985e\u578b</option>
              <option value="buy">\u8cb7\u5c4b</option>
              <option value="rent">\u79df\u5c4b</option>
            </select>
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value as AreaName | "all")}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">\u5168\u90e8\u5340\u57df</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">\u59d3\u540d</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">\u96fb\u8a71</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">\u985e\u578b</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">\u9810\u7b97\u7bc4\u570d</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">\u504f\u597d\u5340\u57df</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">\u9700\u6c42\u576a\u6578</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">\u5099\u8a3b</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.phone}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={\`inline-block px-2 py-1 rounded-full text-xs font-medium \${c.type === "buy" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}\`}>
                        {c.type === "buy" ? "\u8cb7\u5c4b" : "\u79df\u5c4b"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatBudget(c.budgetMin, c.budgetMax, c.type)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.preferredArea.join("\u3001")}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">{c.preferredSize} \u576a</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{c.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-gray-500">\u627e\u4e0d\u5230\u7b26\u5408\u689d\u4ef6\u7684\u5ba2\u6236</div>
          )}
        </div>
      </div>
    </div>
  );
}
`;

const PAGE_MATCHING = `"use client";
import Link from "next/link";
import { clients, propertyMatches } from "@/lib/mock-data";

export default function MatchingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <h1 className="text-xl font-bold text-gray-900">\u4e0d\u52d5\u7522 CRM</h1>
          <Link href="/" className="text-gray-600 hover:text-blue-600">\u5100\u8868\u677f</Link>
          <Link href="/clients" className="text-gray-600 hover:text-blue-600">\u5ba2\u6236\u9700\u6c42</Link>
          <Link href="/matching" className="text-blue-600 font-medium">\u7269\u4ef6\u914d\u5c0d</Link>
          <Link href="/visits" className="text-gray-600 hover:text-blue-600">\u5e36\u770b\u7d00\u9304</Link>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">\u7269\u4ef6\u914d\u5c0d</h2>

        <div className="space-y-6">
          {clients.map((client) => {
            const matches = propertyMatches.filter((m) => m.clientId === client.id);
            if (matches.length === 0) return null;

            return (
              <div key={client.id} className="bg-white rounded-lg shadow">
                <div className="p-4 border-b bg-gray-50 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{client.name}</h3>
                      <p className="text-sm text-gray-500">
                        {client.type === "buy" ? "\u8cb7\u5c4b" : "\u79df\u5c4b"} | {client.preferredArea.join("\u3001")} | {client.preferredSize}\u576a
                      </p>
                    </div>
                    <span className="text-sm text-gray-500">{matches.length} \u7b46\u914d\u5c0d</span>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {matches.sort((a, b) => b.matchScore - a.matchScore).map((m) => (
                    <div key={m.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{m.propertyName}</h4>
                        <div className={\`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold \${
                          m.matchScore >= 90 ? "bg-green-100 text-green-700" :
                          m.matchScore >= 80 ? "bg-blue-100 text-blue-700" :
                          "bg-yellow-100 text-yellow-700"
                        }\`}>
                          {m.matchScore}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">{m.area} | {m.type}</p>
                      <p className="text-xs text-gray-400 mt-1">{m.address}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm text-gray-700">{m.size} \u576a</span>
                        <span className="text-sm font-mono text-blue-600">
                          {client.type === "buy"
                            ? \`NT$ \${(m.price / 10000).toLocaleString()}\u842c\`
                            : \`NT$ \${m.price.toLocaleString()}/\u6708\`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
`;

const PAGE_VISITS = `"use client";
import { useState } from "react";
import Link from "next/link";
import { visits as initialVisits } from "@/lib/mock-data";
import type { Visit } from "@/lib/types";

export default function VisitsPage() {
  const [visits, setVisits] = useState<Visit[]>(initialVisits);
  const [showForm, setShowForm] = useState(false);

  const statusLabels: Record<string, string> = {
    scheduled: "\u5df2\u6392\u5b9a",
    completed: "\u5df2\u5b8c\u6210",
    cancelled: "\u5df2\u53d6\u6d88",
  };
  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-700",
  };

  const renderStars = (rating: number | null) => {
    if (rating === null) return <span className="text-gray-400">\u5c1a\u672a\u8a55\u50f9</span>;
    return (
      <span className="text-yellow-500">
        {Array.from({ length: 5 }, (_, i) => (i < rating ? "\u2605" : "\u2606")).join("")}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <h1 className="text-xl font-bold text-gray-900">\u4e0d\u52d5\u7522 CRM</h1>
          <Link href="/" className="text-gray-600 hover:text-blue-600">\u5100\u8868\u677f</Link>
          <Link href="/clients" className="text-gray-600 hover:text-blue-600">\u5ba2\u6236\u9700\u6c42</Link>
          <Link href="/matching" className="text-gray-600 hover:text-blue-600">\u7269\u4ef6\u914d\u5c0d</Link>
          <Link href="/visits" className="text-blue-600 font-medium">\u5e36\u770b\u7d00\u9304</Link>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">\u5e36\u770b\u7d00\u9304</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showForm ? "\u53d6\u6d88" : "\u65b0\u589e\u5e36\u770b"}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">\u65b0\u589e\u5e36\u770b\u884c\u7a0b</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">\u5ba2\u6236\u59d3\u540d</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">\u7269\u4ef6\u540d\u7a31</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">\u65e5\u671f</label>
                <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">\u6642\u9593</label>
                <input type="time" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">\u5730\u5740</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">\u5132\u5b58</button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">\u65e5\u671f</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">\u6642\u9593</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">\u5ba2\u6236</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">\u7269\u4ef6</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">\u72c0\u614b</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">\u8a55\u50f9</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">\u5099\u8a3b</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {visits.sort((a, b) => b.date.localeCompare(a.date)).map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{v.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{v.time}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{v.clientName}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{v.propertyName}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={\`inline-block px-2 py-1 rounded-full text-xs font-medium \${statusColors[v.status]}\`}>
                      {statusLabels[v.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm">{renderStars(v.feedbackRating)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{v.notes || "-"}</td>
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

export const CRM_REALESTATE: PresetOverlay = {
  templateId: "crm",
  files: [
    { path: "src/app/page.tsx", content: PAGE_DASHBOARD },
    { path: "src/app/clients/page.tsx", content: PAGE_CLIENTS },
    { path: "src/app/matching/page.tsx", content: PAGE_MATCHING },
    { path: "src/app/visits/page.tsx", content: PAGE_VISITS },
    { path: "src/lib/types.ts", content: TYPES_FILE },
    { path: "src/lib/mock-data.ts", content: MOCK_DATA_FILE },
  ],
  requiredServices: [
    { category: "database", suggestedTypes: ["built_in_pg", "postgresql"], purpose: "\u5132\u5b58\u5ba2\u6236\u8207\u5e36\u770b\u8cc7\u6599" },
    { category: "industry", suggestedTypes: ["built_in_realestate"], purpose: "\u5b58\u53d6\u7269\u4ef6\u8cc7\u6599\u5eab", optional: true },
  ],
};
