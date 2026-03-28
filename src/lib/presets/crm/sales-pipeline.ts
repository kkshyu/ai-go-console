import type { PresetOverlay } from "../index";

const TYPES_FILE = `export type Stage = "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";

export interface Customer {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  dealValue: number;
  stage: Stage;
  lastContactDate: string;
  notes?: string;
}

export interface Deal {
  id: string;
  customerId: string;
  companyName: string;
  contactPerson: string;
  amount: number;
  stage: Stage;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  customerId: string;
  companyName: string;
  type: "call" | "email" | "meeting" | "note";
  description: string;
  date: string;
}

export const stageLabels: Record<Stage, string> = {
  new: "\u65b0\u5ba2\u6236",
  contacted: "\u5df2\u806f\u7e6b",
  qualified: "\u9700\u6c42\u78ba\u8a8d",
  proposal: "\u63d0\u6848\u4e2d",
  negotiation: "\u8ac7\u5224\u4e2d",
  won: "\u5df2\u6210\u4ea4",
  lost: "\u5df2\u5931\u53bb",
};

export const stageColors: Record<Stage, string> = {
  new: "bg-gray-100 text-gray-800",
  contacted: "bg-blue-100 text-blue-800",
  qualified: "bg-yellow-100 text-yellow-800",
  proposal: "bg-purple-100 text-purple-800",
  negotiation: "bg-orange-100 text-orange-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
};
`;

const MOCK_DATA_FILE = `import { Customer, Deal, Activity } from "./types";

export const customers: Customer[] = [
  { id: "c1", companyName: "\u53f0\u7063\u79d1\u6280\u80a1\u4efd\u6709\u9650\u516c\u53f8", contactPerson: "\u738b\u5927\u660e", phone: "02-2771-1234", email: "wang@twtech.com.tw", dealValue: 2500000, stage: "proposal", lastContactDate: "2025-03-20", notes: "\u5c0d ERP \u6574\u5408\u6709\u8208\u8da3" },
  { id: "c2", companyName: "\u5275\u65b0\u6578\u4f4d\u6709\u9650\u516c\u53f8", contactPerson: "\u674e\u7f8e\u73b2", phone: "02-2891-5678", email: "lee@innovate.tw", dealValue: 820000, stage: "qualified", lastContactDate: "2025-03-22", notes: "\u9810\u8a08\u4e0b\u5b63\u63a1\u8cfc" },
  { id: "c3", companyName: "\u5168\u7403\u8cbf\u6613\u96c6\u5718", contactPerson: "\u9673\u5fd7\u5049", phone: "02-2567-9012", email: "chen@globaltrade.com.tw", dealValue: 4800000, stage: "won", lastContactDate: "2025-03-10" },
  { id: "c4", companyName: "\u667a\u6167\u751f\u6d3b\u79d1\u6280", contactPerson: "\u6797\u96c5\u5a77", phone: "03-5578-1234", email: "lin@smartlife.tw", dealValue: 350000, stage: "new", lastContactDate: "2025-03-25" },
  { id: "c5", companyName: "\u5317\u6975\u661f\u9867\u554f\u516c\u53f8", contactPerson: "\u5f35\u66f8\u8c6a", phone: "02-2345-6789", email: "chang@polarstar.tw", dealValue: 1100000, stage: "contacted", lastContactDate: "2025-03-18" },
  { id: "c6", companyName: "\u5927\u5730\u5efa\u8a2d\u958b\u767c", contactPerson: "\u9ec3\u6dd1\u82ac", phone: "04-2234-5678", email: "huang@dadi.com.tw", dealValue: 5000000, stage: "negotiation", lastContactDate: "2025-03-12" },
  { id: "c7", companyName: "\u7389\u5c71\u91d1\u878d\u63a7\u80a1", contactPerson: "\u5289\u5b97\u7ff0", phone: "02-2781-3456", email: "liu@yushan-fin.tw", dealValue: 3200000, stage: "proposal", lastContactDate: "2025-03-15" },
  { id: "c8", companyName: "\u65e5\u5149\u96fb\u5b50\u5de5\u696d", contactPerson: "\u8b1d\u660e\u83ef", phone: "03-3456-7890", email: "hsieh@nikko-elec.tw", dealValue: 680000, stage: "contacted", lastContactDate: "2025-03-21" },
  { id: "c9", companyName: "\u5bae\u57ce\u7269\u6d41\u80a1\u4efd\u6709\u9650\u516c\u53f8", contactPerson: "\u8a31\u6587\u5091", phone: "07-3456-1234", email: "hsu@miyagi-logistics.tw", dealValue: 1500000, stage: "won", lastContactDate: "2025-03-05" },
  { id: "c10", companyName: "\u7f8e\u9e97\u83ef\u751f\u6280", contactPerson: "\u5433\u96c5\u96ef", phone: "02-8771-2345", email: "wu@bellebio.tw", dealValue: 75000, stage: "lost", lastContactDate: "2025-02-28" },
];

export const deals: Deal[] = customers.map((c) => ({
  id: "d" + c.id.slice(1),
  customerId: c.id,
  companyName: c.companyName,
  contactPerson: c.contactPerson,
  amount: c.dealValue,
  stage: c.stage,
  createdAt: "2025-01-15",
  updatedAt: c.lastContactDate,
}));

export const activities: Activity[] = [
  { id: "a1", customerId: "c1", companyName: "\u53f0\u7063\u79d1\u6280\u80a1\u4efd\u6709\u9650\u516c\u53f8", type: "meeting", description: "\u8a0e\u8ad6 ERP \u5c0e\u5165\u7bc4\u570d\u8207\u6642\u7a0b", date: "2025-03-20" },
  { id: "a2", customerId: "c2", companyName: "\u5275\u65b0\u6578\u4f4d\u6709\u9650\u516c\u53f8", type: "call", description: "\u78ba\u8a8d\u9810\u7b97\u8207\u63a1\u8cfc\u6d41\u7a0b", date: "2025-03-22" },
  { id: "a3", customerId: "c6", companyName: "\u5927\u5730\u5efa\u8a2d\u958b\u767c", type: "email", description: "\u5831\u50f9\u55ae\u5df2\u5bc4\u51fa\uff0c\u7b49\u5f85\u56de\u8986", date: "2025-03-19" },
  { id: "a4", customerId: "c5", companyName: "\u5317\u6975\u661f\u9867\u554f\u516c\u53f8", type: "call", description: "\u521d\u6b21\u96fb\u8a71\u806f\u7e6b\uff0c\u5c0d\u65b9\u8868\u793a\u6709\u8208\u8da3", date: "2025-03-18" },
  { id: "a5", customerId: "c3", companyName: "\u5168\u7403\u8cbf\u6613\u96c6\u5718", type: "note", description: "\u5408\u7d04\u5df2\u7c3d\u7f72\uff0c\u5c08\u6848\u4e0b\u9031\u555f\u52d5", date: "2025-03-10" },
  { id: "a6", customerId: "c7", companyName: "\u7389\u5c71\u91d1\u878d\u63a7\u80a1", type: "meeting", description: "\u7b2c\u4e8c\u6b21\u7c21\u5831\uff0c\u5c0d\u65b9\u9700\u8981\u5167\u90e8\u8a55\u4f30", date: "2025-03-15" },
  { id: "a7", customerId: "c8", companyName: "\u65e5\u5149\u96fb\u5b50\u5de5\u696d", type: "email", description: "\u5bc4\u9001\u7522\u54c1\u76ee\u9304\u8207\u6848\u4f8b\u5206\u4eab", date: "2025-03-21" },
  { id: "a8", customerId: "c4", companyName: "\u667a\u6167\u751f\u6d3b\u79d1\u6280", type: "call", description: "\u65b0\u5ba2\u6236\u4f86\u96fb\u8a62\u554f\u96f2\u7aef\u670d\u52d9", date: "2025-03-25" },
  { id: "a9", customerId: "c9", companyName: "\u5bae\u57ce\u7269\u6d41\u80a1\u4efd\u6709\u9650\u516c\u53f8", type: "note", description: "\u5c08\u6848\u9806\u5229\u4e0a\u7dda\uff0c\u5ba2\u6236\u6eff\u610f", date: "2025-03-05" },
  { id: "a10", customerId: "c6", companyName: "\u5927\u5730\u5efa\u8a2d\u958b\u767c", type: "meeting", description: "\u9ad8\u5c64\u6703\u8b70\uff0c\u8a0e\u8ad6\u5408\u7d04\u689d\u6b3e\u7d30\u7bc0", date: "2025-03-12" },
];
`;

const PAGE_DASHBOARD = `"use client";
import { useState } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList } from "recharts";
import { customers, activities } from "@/lib/mock-data";
import { stageLabels, Stage } from "@/lib/types";

const typeIcons: Record<string, string> = {
  call: "\u260e\ufe0f",
  email: "\u2709\ufe0f",
  meeting: "\ud83e\udd1d",
  note: "\ud83d\udcdd",
};

export default function Dashboard() {
  const totalCustomers = customers.length;
  const totalDealValue = customers.reduce((s, c) => s + c.dealValue, 0);
  const wonCustomers = customers.filter((c) => c.stage === "won");
  const wonRate = totalCustomers > 0 ? Math.round((wonCustomers.length / totalCustomers) * 100) : 0;
  const thisMonthRevenue = wonCustomers.reduce((s, c) => s + c.dealValue, 0);

  const funnelOrder: Stage[] = ["new", "contacted", "qualified", "proposal", "negotiation", "won"];
  const funnelData = funnelOrder.map((stage) => ({
    name: stageLabels[stage],
    value: customers.filter((c) => c.stage === stage).length,
  }));

  const recentActivities = [...activities].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <h1 className="text-xl font-bold text-gray-900">\u92b7\u552e\u7ba1\u7406\u7cfb\u7d71</h1>
          <Link href="/" className="text-blue-600 font-medium">\u5100\u8868\u677f</Link>
          <Link href="/customers" className="text-gray-600 hover:text-blue-600">\u5ba2\u6236\u5217\u8868</Link>
          <Link href="/deals" className="text-gray-600 hover:text-blue-600">\u5546\u6a5f\u770b\u677f</Link>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">\u5ba2\u6236\u7e3d\u6578</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalCustomers}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">\u5546\u6a5f\u7e3d\u984d</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">NT$ {totalDealValue.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">\u6210\u4ea4\u7387</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">{wonRate}%</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">\u672c\u6708\u71df\u6536</p>
            <p className="text-3xl font-bold text-green-600 mt-1">NT$ {thisMonthRevenue.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">\u92b7\u552e\u6f0f\u6597</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">\u8fd1\u671f\u6d3b\u52d5</h2>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {recentActivities.map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                  <span className="text-xl">{typeIcons[a.type]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.companyName}</p>
                    <p className="text-sm text-gray-600">{a.description}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{a.date}</span>
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

const PAGE_CUSTOMERS = `"use client";
import { useState } from "react";
import Link from "next/link";
import { customers as initialCustomers } from "@/lib/mock-data";
import { stageLabels, stageColors, Stage } from "@/lib/types";

const allStages: (Stage | "all")[] = ["all", "new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<Stage | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = initialCustomers.filter((c) => {
    const matchSearch =
      c.companyName.includes(search) ||
      c.contactPerson.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchStage = filterStage === "all" || c.stage === filterStage;
    return matchSearch && matchStage;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <h1 className="text-xl font-bold text-gray-900">\u92b7\u552e\u7ba1\u7406\u7cfb\u7d71</h1>
          <Link href="/" className="text-gray-600 hover:text-blue-600">\u5100\u8868\u677f</Link>
          <Link href="/customers" className="text-blue-600 font-medium">\u5ba2\u6236\u5217\u8868</Link>
          <Link href="/deals" className="text-gray-600 hover:text-blue-600">\u5546\u6a5f\u770b\u677f</Link>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">\u5ba2\u6236\u5217\u8868</h2>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="\u641c\u5c0b\u516c\u53f8\u540d\u7a31\u3001\u806f\u7d61\u4eba\u6216\u4fe1\u7bb1..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value as Stage | "all")}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">\u6240\u6709\u968e\u6bb5</option>
              {(["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"] as Stage[]).map((s) => (
                <option key={s} value={s}>{stageLabels[s]}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">\u516c\u53f8\u540d\u7a31</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">\u806f\u7d61\u4eba</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">\u96fb\u8a71</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Email</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">\u5546\u6a5f\u91d1\u984d</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">\u968e\u6bb5</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">\u6700\u5f8c\u806f\u7e6b</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((c) => (
                  <>
                    <tr
                      key={c.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.companyName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{c.contactPerson}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{c.phone}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{c.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-mono">NT$ {c.dealValue.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={\`inline-block px-2 py-1 rounded-full text-xs font-medium \${stageColors[c.stage]}\`}>
                          {stageLabels[c.stage]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{c.lastContactDate}</td>
                    </tr>
                    {expandedId === c.id && (
                      <tr key={c.id + "-detail"}>
                        <td colSpan={7} className="px-4 py-4 bg-blue-50">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><span className="font-medium text-gray-700">\u5099\u8a3b\uff1a</span> {c.notes || "\u7121"}</div>
                            <div><span className="font-medium text-gray-700">\u5ba2\u6236 ID\uff1a</span> {c.id}</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
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

const PAGE_DEALS = `"use client";
import { useState } from "react";
import Link from "next/link";
import { deals as initialDeals } from "@/lib/mock-data";
import { stageLabels, Stage } from "@/lib/types";
import type { Deal } from "@/lib/types";

const kanbanStages: Stage[] = ["new", "contacted", "qualified", "proposal", "negotiation", "won"];

const columnColors: Record<string, string> = {
  new: "border-t-gray-400",
  contacted: "border-t-blue-400",
  qualified: "border-t-yellow-400",
  proposal: "border-t-purple-400",
  negotiation: "border-t-orange-400",
  won: "border-t-green-400",
};

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>(initialDeals.filter((d) => d.stage !== "lost"));

  const moveDeal = (dealId: string, newStage: Stage) => {
    setDeals((prev) =>
      prev.map((d) =>
        d.id === dealId ? { ...d, stage: newStage, updatedAt: new Date().toISOString().slice(0, 10) } : d
      )
    );
  };

  const getNextStage = (current: Stage): Stage | null => {
    const idx = kanbanStages.indexOf(current);
    return idx < kanbanStages.length - 1 ? kanbanStages[idx + 1] : null;
  };

  const getPrevStage = (current: Stage): Stage | null => {
    const idx = kanbanStages.indexOf(current);
    return idx > 0 ? kanbanStages[idx - 1] : null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <h1 className="text-xl font-bold text-gray-900">\u92b7\u552e\u7ba1\u7406\u7cfb\u7d71</h1>
          <Link href="/" className="text-gray-600 hover:text-blue-600">\u5100\u8868\u677f</Link>
          <Link href="/customers" className="text-gray-600 hover:text-blue-600">\u5ba2\u6236\u5217\u8868</Link>
          <Link href="/deals" className="text-blue-600 font-medium">\u5546\u6a5f\u770b\u677f</Link>
        </div>
      </nav>
      <div className="max-w-full mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">\u5546\u6a5f\u770b\u677f</h2>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanStages.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage);
            const total = stageDeals.reduce((s, d) => s + d.amount, 0);

            return (
              <div
                key={stage}
                className={\`flex-shrink-0 w-64 bg-white rounded-lg shadow border-t-4 \${columnColors[stage]}\`}
              >
                <div className="p-3 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{stageLabels[stage]}</h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{stageDeals.length}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">NT$ {total.toLocaleString()}</p>
                </div>
                <div className="p-2 space-y-2 min-h-[200px]">
                  {stageDeals.map((deal) => (
                    <div key={deal.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:shadow-md transition-shadow">
                      <p className="text-sm font-medium text-gray-900 truncate">{deal.companyName}</p>
                      <p className="text-xs text-gray-500 mt-1">{deal.contactPerson}</p>
                      <p className="text-sm font-mono text-blue-600 mt-2">NT$ {deal.amount.toLocaleString()}</p>
                      <div className="flex gap-1 mt-2">
                        {getPrevStage(stage) && (
                          <button
                            onClick={() => moveDeal(deal.id, getPrevStage(stage)!)}
                            className="flex-1 text-xs py-1 px-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
                          >
                            \u2190 {stageLabels[getPrevStage(stage)!]}
                          </button>
                        )}
                        {getNextStage(stage) && (
                          <button
                            onClick={() => moveDeal(deal.id, getNextStage(stage)!)}
                            className="flex-1 text-xs py-1 px-2 bg-blue-100 hover:bg-blue-200 rounded text-blue-700"
                          >
                            {stageLabels[getNextStage(stage)!]} \u2192
                          </button>
                        )}
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

export const CRM_SALES_PIPELINE: PresetOverlay = {
  templateId: "crm",
  files: [
    { path: "src/app/page.tsx", content: PAGE_DASHBOARD },
    { path: "src/app/customers/page.tsx", content: PAGE_CUSTOMERS },
    { path: "src/app/deals/page.tsx", content: PAGE_DEALS },
    { path: "src/lib/types.ts", content: TYPES_FILE },
    { path: "src/lib/mock-data.ts", content: MOCK_DATA_FILE },
  ],
  requiredServices: [
    { category: "database", suggestedTypes: ["built_in_pg", "postgresql"], purpose: "\u5132\u5b58\u5ba2\u6236\u8207\u5546\u6a5f\u8cc7\u6599" },
    { category: "email", suggestedTypes: ["sendgrid", "ses"], purpose: "\u5bc4\u9001\u8ddf\u9032\u90f5\u4ef6", optional: true },
  ],
};
