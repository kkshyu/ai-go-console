import type { PresetOverlay } from "../index";

const TYPES_FILE = `export type TicketStatus = "open" | "in-progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type InvoiceStatus = "paid" | "pending" | "overdue";

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  sender: "client" | "support";
  senderName: string;
  content: string;
  date: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  amount: number;
  status: InvoiceStatus;
  description: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
}
`;

const MOCK_DATA_FILE = `import { Ticket, Invoice, Document } from "./types";

export const tickets: Ticket[] = [
  {
    id: "t1",
    title: "\u7cfb\u7d71\u767b\u5165\u7570\u5e38",
    description: "\u4eca\u5929\u65e9\u4e0a\u7121\u6cd5\u6b63\u5e38\u767b\u5165\u5f8c\u53f0\u7cfb\u7d71\uff0c\u986f\u793a\u300c\u9a57\u8b49\u5931\u6557\u300d\u932f\u8aa4\u8a0a\u606f\u3002",
    priority: "high",
    status: "in-progress",
    createdAt: "2025-03-20",
    updatedAt: "2025-03-21",
    messages: [
      { id: "m1", sender: "client", senderName: "\u738b\u5c0f\u660e", content: "\u4eca\u5929\u65e9\u4e0a\u7121\u6cd5\u6b63\u5e38\u767b\u5165\u5f8c\u53f0\u7cfb\u7d71\uff0c\u986f\u793a\u300c\u9a57\u8b49\u5931\u6557\u300d\u932f\u8aa4\u8a0a\u606f\u3002\u5df2\u5617\u8a66\u6e05\u9664\u5feb\u53d6\u4f46\u554f\u984c\u4ecd\u5728\u3002", date: "2025-03-20 09:15" },
      { id: "m2", sender: "support", senderName: "\u6280\u8853\u652f\u63f4 \u5c0f\u9673", content: "\u60a8\u597d\uff0c\u6211\u5011\u5df2\u6536\u5230\u60a8\u7684\u554f\u984c\u56de\u5831\u3002\u8acb\u554f\u60a8\u4f7f\u7528\u7684\u700f\u89bd\u5668\u7248\u672c\u662f\uff1f\u6211\u5011\u6b63\u5728\u6392\u67e5\u4e2d\u3002", date: "2025-03-20 10:30" },
      { id: "m3", sender: "client", senderName: "\u738b\u5c0f\u660e", content: "\u4f7f\u7528 Chrome 122 \u7248\u672c\uff0cWindows 11 \u7cfb\u7d71\u3002", date: "2025-03-20 11:00" },
      { id: "m4", sender: "support", senderName: "\u6280\u8853\u652f\u63f4 \u5c0f\u9673", content: "\u5df2\u627e\u5230\u554f\u984c\u539f\u56e0\uff0c\u662f\u8a8d\u8b49\u4f3a\u670d\u5668\u66f4\u65b0\u5f8c\u7684\u76f8\u5bb9\u6027\u554f\u984c\u3002\u6b63\u5728\u4fee\u5fa9\u4e2d\uff0c\u9810\u8a08\u4eca\u5929\u4e0b\u5348\u53ef\u89e3\u6c7a\u3002", date: "2025-03-21 09:00" },
    ],
  },
  {
    id: "t2",
    title: "\u5831\u8868\u532f\u51fa\u529f\u80fd\u7570\u5e38",
    description: "\u532f\u51fa\u6708\u5831\u8868\u6642 Excel \u6a94\u6848\u5167\u5bb9\u70ba\u7a7a\u767d\uff0c\u7121\u6cd5\u6b63\u5e38\u986f\u793a\u8cc7\u6599\u3002",
    priority: "medium",
    status: "open",
    createdAt: "2025-03-22",
    updatedAt: "2025-03-22",
    messages: [
      { id: "m5", sender: "client", senderName: "\u674e\u7f8e\u83ef", content: "\u532f\u51fa\u6708\u5831\u8868\u6642 Excel \u6a94\u6848\u5167\u5bb9\u70ba\u7a7a\u767d\uff0c\u53ea\u6709\u6a19\u984c\u884c\u6c92\u6709\u8cc7\u6599\u3002", date: "2025-03-22 14:00" },
    ],
  },
  {
    id: "t3",
    title: "\u5e33\u865f\u6b0a\u9650\u8abf\u6574\u7533\u8acb",
    description: "\u7533\u8acb\u5c07\u300c\u8b1d\u7d44\u9577\u300d\u5e33\u865f\u5347\u7d1a\u70ba\u7ba1\u7406\u54e1\u6b0a\u9650\uff0c\u9700\u8981\u5b58\u53d6\u5168\u516c\u53f8\u5831\u8868\u3002",
    priority: "low",
    status: "resolved",
    createdAt: "2025-03-15",
    updatedAt: "2025-03-18",
    messages: [
      { id: "m6", sender: "client", senderName: "\u5f35\u7d93\u7406", content: "\u9ebb\u7169\u5c07\u8b1d\u7d44\u9577\u7684\u5e33\u865f\u6b0a\u9650\u63d0\u5347\u70ba\u7ba1\u7406\u54e1\uff0c\u9700\u8981\u67e5\u770b\u5168\u516c\u53f8\u5831\u8868\u3002", date: "2025-03-15 10:00" },
      { id: "m7", sender: "support", senderName: "\u6280\u8853\u652f\u63f4 \u5c0f\u6797", content: "\u5df2\u5b8c\u6210\u6b0a\u9650\u8abf\u6574\uff0c\u8acb\u8b1d\u7d44\u9577\u91cd\u65b0\u767b\u5165\u5373\u53ef\u3002", date: "2025-03-18 11:00" },
    ],
  },
  {
    id: "t4",
    title: "API \u4ecb\u63a5\u6587\u4ef6\u8acb\u6c42",
    description: "\u5e0c\u671b\u53d6\u5f97\u6700\u65b0\u7248\u672c\u7684 API \u4ecb\u63a5\u6587\u4ef6\uff0c\u7528\u65bc\u5167\u90e8\u7cfb\u7d71\u6574\u5408\u3002",
    priority: "medium",
    status: "closed",
    createdAt: "2025-03-10",
    updatedAt: "2025-03-12",
    messages: [
      { id: "m8", sender: "client", senderName: "\u9673\u5de5\u7a0b\u5e2b", content: "\u8acb\u63d0\u4f9b\u6700\u65b0\u7684 API \u4ecb\u63a5\u6587\u4ef6 v3.2 \u7248\u672c\u3002", date: "2025-03-10 16:00" },
      { id: "m9", sender: "support", senderName: "\u6280\u8853\u652f\u63f4 \u5c0f\u9673", content: "\u5df2\u5c07\u6587\u4ef6\u4e0a\u50b3\u81f3\u6587\u4ef6\u4e2d\u5fc3\uff0c\u8acb\u81f3\u300c\u6587\u4ef6\u300d\u9801\u9762\u4e0b\u8f09\u3002", date: "2025-03-12 09:30" },
    ],
  },
  {
    id: "t5",
    title: "\u8cc7\u6599\u532f\u5165\u683c\u5f0f\u932f\u8aa4",
    description: "\u4f7f\u7528 CSV \u532f\u5165\u5ba2\u6236\u8cc7\u6599\u6642\u51fa\u73fe\u7de8\u78bc\u554f\u984c\uff0c\u4e2d\u6587\u986f\u793a\u4e82\u78bc\u3002",
    priority: "urgent",
    status: "open",
    createdAt: "2025-03-25",
    updatedAt: "2025-03-25",
    messages: [
      { id: "m10", sender: "client", senderName: "\u738b\u5c0f\u660e", content: "\u7dca\u6025\uff01\u4f7f\u7528 CSV \u532f\u5165\u5ba2\u6236\u8cc7\u6599\u6642\u4e2d\u6587\u5168\u90e8\u8b8a\u6210\u4e82\u78bc\uff0c\u5f71\u97ff\u660e\u5929\u7684\u5ba2\u6236\u5831\u544a\u3002", date: "2025-03-25 17:00" },
    ],
  },
];

export const invoices: Invoice[] = [
  {
    id: "inv1",
    invoiceNumber: "INV-2025-001",
    date: "2025-01-15",
    dueDate: "2025-02-15",
    amount: 180000,
    status: "paid",
    description: "\u7cfb\u7d71\u5efa\u7f6e\u8cbb\u7528 - \u7b2c\u4e00\u671f",
    items: [
      { name: "\u7cfb\u7d71\u5efa\u7f6e\u670d\u52d9", quantity: 1, unitPrice: 150000 },
      { name: "\u57fa\u790e\u6559\u80b2\u8a13\u7df4", quantity: 1, unitPrice: 30000 },
    ],
  },
  {
    id: "inv2",
    invoiceNumber: "INV-2025-002",
    date: "2025-02-01",
    dueDate: "2025-03-01",
    amount: 35000,
    status: "paid",
    description: "2\u6708\u4efd\u6708\u8cbb - \u5c08\u696d\u7248",
    items: [
      { name: "\u5c08\u696d\u7248\u6708\u8cbb", quantity: 1, unitPrice: 30000 },
      { name: "\u984d\u5916\u5132\u5b58\u7a7a\u9593 50GB", quantity: 1, unitPrice: 5000 },
    ],
  },
  {
    id: "inv3",
    invoiceNumber: "INV-2025-003",
    date: "2025-03-01",
    dueDate: "2025-04-01",
    amount: 35000,
    status: "pending",
    description: "3\u6708\u4efd\u6708\u8cbb - \u5c08\u696d\u7248",
    items: [
      { name: "\u5c08\u696d\u7248\u6708\u8cbb", quantity: 1, unitPrice: 30000 },
      { name: "\u984d\u5916\u5132\u5b58\u7a7a\u9593 50GB", quantity: 1, unitPrice: 5000 },
    ],
  },
  {
    id: "inv4",
    invoiceNumber: "INV-2025-004",
    date: "2025-02-15",
    dueDate: "2025-03-15",
    amount: 85000,
    status: "overdue",
    description: "\u5ba2\u88fd\u958b\u767c\u8cbb\u7528 - \u5831\u8868\u6a21\u7d44",
    items: [
      { name: "\u5ba2\u88fd\u5831\u8868\u958b\u767c", quantity: 1, unitPrice: 70000 },
      { name: "\u6e2c\u8a66\u8207\u90e8\u7f72", quantity: 1, unitPrice: 15000 },
    ],
  },
  {
    id: "inv5",
    invoiceNumber: "INV-2025-005",
    date: "2025-03-15",
    dueDate: "2025-04-15",
    amount: 50000,
    status: "pending",
    description: "\u5e74\u5ea6\u7dad\u8b77\u5408\u7d04 - Q2",
    items: [
      { name: "Q2 \u7dad\u8b77\u8cbb\u7528", quantity: 1, unitPrice: 40000 },
      { name: "\u7dca\u6025\u652f\u63f4\u670d\u52d9", quantity: 1, unitPrice: 10000 },
    ],
  },
];

export const documents: Document[] = [
  { id: "doc1", name: "\u670d\u52d9\u5408\u7d04\u66f8_2025.pdf", type: "PDF", size: "2.4 MB", uploadedAt: "2025-01-10" },
  { id: "doc2", name: "API_\u6587\u4ef6_v3.2.pdf", type: "PDF", size: "5.1 MB", uploadedAt: "2025-03-12" },
  { id: "doc3", name: "\u7cfb\u7d71\u64cd\u4f5c\u624b\u518a.pdf", type: "PDF", size: "8.7 MB", uploadedAt: "2025-01-20" },
  { id: "doc4", name: "\u6708\u5831\u8868\u7bc4\u672c.xlsx", type: "Excel", size: "1.2 MB", uploadedAt: "2025-02-28" },
  { id: "doc5", name: "SLA_\u670d\u52d9\u7b49\u7d1a\u5354\u8b70.pdf", type: "PDF", size: "0.8 MB", uploadedAt: "2025-01-10" },
];
`;

const PAGE_DASHBOARD = `"use client";
import Link from "next/link";
import { tickets, invoices, documents } from "@/lib/mock-data";

export default function Dashboard() {
  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in-progress").length;
  const pendingInvoices = invoices.filter((i) => i.status === "pending" || i.status === "overdue");
  const pendingAmount = pendingInvoices.reduce((s, i) => s + i.amount, 0);
  const overdueAmount = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const recentDocs = documents.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <h1 className="text-xl font-bold text-gray-900">\u5ba2\u6236\u5165\u53e3</h1>
          <Link href="/" className="text-blue-600 font-medium">\u7e3d\u89bd</Link>
          <Link href="/tickets" className="text-gray-600 hover:text-blue-600">\u652f\u63f4\u5de5\u55ae</Link>
          <Link href="/invoices" className="text-gray-600 hover:text-blue-600">\u5e33\u55ae\u67e5\u8a62</Link>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">\u6b61\u8fce\u56de\u4f86</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">\u9032\u884c\u4e2d\u5de5\u55ae</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{openTickets}</p>
            <Link href="/tickets" className="text-sm text-blue-500 hover:underline mt-2 inline-block">\u67e5\u770b\u5168\u90e8</Link>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">\u5f85\u4ed8\u5e33\u55ae</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">NT$ {pendingAmount.toLocaleString()}</p>
            {overdueAmount > 0 && (
              <p className="text-sm text-red-500 mt-1">\u9018\u671f NT$ {overdueAmount.toLocaleString()}</p>
            )}
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">\u6700\u65b0\u6587\u4ef6</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{documents.length}</p>
            <p className="text-sm text-gray-400 mt-1">\u4efd\u6587\u4ef6\u53ef\u67e5\u95b1</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">\u6700\u65b0\u5de5\u55ae\u72c0\u614b</h3>
            <div className="space-y-3">
              {tickets.slice(0, 4).map((t) => {
                const statusMap: Record<string, { label: string; color: string }> = {
                  open: { label: "\u958b\u555f", color: "bg-yellow-100 text-yellow-700" },
                  "in-progress": { label: "\u8655\u7406\u4e2d", color: "bg-blue-100 text-blue-700" },
                  resolved: { label: "\u5df2\u89e3\u6c7a", color: "bg-green-100 text-green-700" },
                  closed: { label: "\u5df2\u95dc\u9589", color: "bg-gray-100 text-gray-700" },
                };
                const st = statusMap[t.status];
                return (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t.title}</p>
                      <p className="text-xs text-gray-500">{t.createdAt}</p>
                    </div>
                    <span className={\`inline-block px-2 py-1 rounded-full text-xs font-medium \${st.color}\`}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">\u6700\u65b0\u6587\u4ef6</h3>
            <div className="space-y-3">
              {recentDocs.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{d.type === "PDF" ? "\ud83d\udcc4" : "\ud83d\udcca"}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{d.name}</p>
                      <p className="text-xs text-gray-500">{d.size} | {d.uploadedAt}</p>
                    </div>
                  </div>
                  <button className="text-sm text-blue-500 hover:underline">\u4e0b\u8f09</button>
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

const PAGE_TICKETS = `"use client";
import { useState } from "react";
import Link from "next/link";
import { tickets as initialTickets } from "@/lib/mock-data";
import type { Ticket, TicketStatus, TicketPriority } from "@/lib/types";

const statusMap: Record<TicketStatus, { label: string; color: string }> = {
  open: { label: "\u958b\u555f", color: "bg-yellow-100 text-yellow-700" },
  "in-progress": { label: "\u8655\u7406\u4e2d", color: "bg-blue-100 text-blue-700" },
  resolved: { label: "\u5df2\u89e3\u6c7a", color: "bg-green-100 text-green-700" },
  closed: { label: "\u5df2\u95dc\u9589", color: "bg-gray-100 text-gray-700" },
};

const priorityMap: Record<TicketPriority, { label: string; color: string }> = {
  low: { label: "\u4f4e", color: "bg-gray-100 text-gray-600" },
  medium: { label: "\u4e2d", color: "bg-blue-100 text-blue-600" },
  high: { label: "\u9ad8", color: "bg-orange-100 text-orange-600" },
  urgent: { label: "\u7dca\u6025", color: "bg-red-100 text-red-600" },
};

export default function TicketsPage() {
  const [tickets] = useState<Ticket[]>(initialTickets);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<TicketPriority>("medium");

  const selectedTicket = tickets.find((t) => t.id === selectedId);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <h1 className="text-xl font-bold text-gray-900">\u5ba2\u6236\u5165\u53e3</h1>
          <Link href="/" className="text-gray-600 hover:text-blue-600">\u7e3d\u89bd</Link>
          <Link href="/tickets" className="text-blue-600 font-medium">\u652f\u63f4\u5de5\u55ae</Link>
          <Link href="/invoices" className="text-gray-600 hover:text-blue-600">\u5e33\u55ae\u67e5\u8a62</Link>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">\u652f\u63f4\u5de5\u55ae</h2>
          <button
            onClick={() => { setShowNewForm(!showNewForm); setSelectedId(null); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showNewForm ? "\u53d6\u6d88" : "\u65b0\u589e\u5de5\u55ae"}
          </button>
        </div>

        {showNewForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">\u63d0\u4ea4\u65b0\u5de5\u55ae</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">\u6a19\u984c</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="\u8acb\u7c21\u8981\u63cf\u8ff0\u554f\u984c..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">\u8a73\u7d30\u63cf\u8ff0</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="\u8acb\u8a73\u7d30\u63cf\u8ff0\u60a8\u9047\u5230\u7684\u554f\u984c..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">\u512a\u5148\u7d1a</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">\u4f4e</option>
                  <option value="medium">\u4e2d</option>
                  <option value="high">\u9ad8</option>
                  <option value="urgent">\u7dca\u6025</option>
                </select>
              </div>
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">\u63d0\u4ea4\u5de5\u55ae</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={\`\${selectedTicket ? "lg:col-span-1" : "lg:col-span-3"}\`}>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="divide-y divide-gray-200">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className={\`p-4 cursor-pointer hover:bg-gray-50 transition-colors \${selectedId === t.id ? "bg-blue-50 border-l-4 border-blue-500" : ""}\`}
                    onClick={() => { setSelectedId(t.id); setShowNewForm(false); }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{t.createdAt} | {t.messages.length} \u5247\u8a0a\u606f</p>
                      </div>
                      <div className="flex gap-2 ml-2">
                        <span className={\`inline-block px-2 py-0.5 rounded-full text-xs font-medium \${priorityMap[t.priority].color}\`}>
                          {priorityMap[t.priority].label}
                        </span>
                        <span className={\`inline-block px-2 py-0.5 rounded-full text-xs font-medium \${statusMap[t.status].color}\`}>
                          {statusMap[t.status].label}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {selectedTicket && (
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedTicket.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={\`inline-block px-2 py-0.5 rounded-full text-xs font-medium \${statusMap[selectedTicket.status].color}\`}>
                        {statusMap[selectedTicket.status].label}
                      </span>
                      <span className={\`inline-block px-2 py-0.5 rounded-full text-xs font-medium \${priorityMap[selectedTicket.priority].color}\`}>
                        {priorityMap[selectedTicket.priority].label}
                      </span>
                      <span className="text-xs text-gray-400">\u5efa\u7acb\u65bc {selectedTicket.createdAt}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-gray-600 text-xl">\u00d7</button>
                </div>

                <p className="text-sm text-gray-700 mb-6 p-3 bg-gray-50 rounded-lg">{selectedTicket.description}</p>

                <h4 className="text-sm font-semibold text-gray-700 mb-3">\u5c0d\u8a71\u7d00\u9304</h4>
                <div className="space-y-4 mb-4">
                  {selectedTicket.messages.map((msg) => (
                    <div key={msg.id} className={\`flex \${msg.sender === "client" ? "justify-end" : "justify-start"}\`}>
                      <div className={\`max-w-[80%] p-3 rounded-lg \${
                        msg.sender === "client" ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-900"
                      }\`}>
                        <p className="text-xs font-medium mb-1">{msg.senderName}</p>
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs text-gray-500 mt-1 text-right">{msg.date}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="\u8f38\u5165\u56de\u8986..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">\u50b3\u9001</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
`;

const PAGE_INVOICES = `"use client";
import { useState } from "react";
import Link from "next/link";
import { invoices } from "@/lib/mock-data";
import type { InvoiceStatus } from "@/lib/types";

const statusMap: Record<InvoiceStatus, { label: string; color: string }> = {
  paid: { label: "\u5df2\u4ed8\u6b3e", color: "bg-green-100 text-green-700" },
  pending: { label: "\u5f85\u4ed8\u6b3e", color: "bg-yellow-100 text-yellow-700" },
  overdue: { label: "\u9018\u671f", color: "bg-red-100 text-red-700" },
};

export default function InvoicesPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalOutstanding = invoices.filter((i) => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const overdueAmount = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const paidAmount = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <h1 className="text-xl font-bold text-gray-900">\u5ba2\u6236\u5165\u53e3</h1>
          <Link href="/" className="text-gray-600 hover:text-blue-600">\u7e3d\u89bd</Link>
          <Link href="/tickets" className="text-gray-600 hover:text-blue-600">\u652f\u63f4\u5de5\u55ae</Link>
          <Link href="/invoices" className="text-blue-600 font-medium">\u5e33\u55ae\u67e5\u8a62</Link>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">\u5e33\u55ae\u67e5\u8a62</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">\u5f85\u4ed8\u7e3d\u984d</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">NT$ {totalOutstanding.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">\u9018\u671f\u91d1\u984d</p>
            <p className="text-2xl font-bold text-red-600 mt-1">NT$ {overdueAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">\u5df2\u4ed8\u7e3d\u984d</p>
            <p className="text-2xl font-bold text-green-600 mt-1">NT$ {paidAmount.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">\u5e33\u55ae\u865f\u78bc</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">\u63cf\u8ff0</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">\u958b\u7acb\u65e5\u671f</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">\u5230\u671f\u65e5</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">\u91d1\u984d</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">\u72c0\u614b</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.map((inv) => (
                <>
                  <tr
                    key={inv.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                  >
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{inv.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{inv.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{inv.dueDate}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900 text-right">NT$ {inv.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={\`inline-block px-2 py-1 rounded-full text-xs font-medium \${statusMap[inv.status].color}\`}>
                        {statusMap[inv.status].label}
                      </span>
                    </td>
                  </tr>
                  {expandedId === inv.id && (
                    <tr key={inv.id + "-detail"}>
                      <td colSpan={6} className="px-4 py-4 bg-gray-50">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">\u5e33\u55ae\u660e\u7d30</h4>
                        <table className="w-full">
                          <thead>
                            <tr>
                              <th className="text-left text-xs text-gray-500 pb-2">\u9805\u76ee</th>
                              <th className="text-right text-xs text-gray-500 pb-2">\u6578\u91cf</th>
                              <th className="text-right text-xs text-gray-500 pb-2">\u55ae\u50f9</th>
                              <th className="text-right text-xs text-gray-500 pb-2">\u5c0f\u8a08</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inv.items.map((item, idx) => (
                              <tr key={idx}>
                                <td className="text-sm text-gray-700 py-1">{item.name}</td>
                                <td className="text-sm text-gray-700 py-1 text-right">{item.quantity}</td>
                                <td className="text-sm font-mono text-gray-700 py-1 text-right">NT$ {item.unitPrice.toLocaleString()}</td>
                                <td className="text-sm font-mono text-gray-900 py-1 text-right">NT$ {(item.quantity * item.unitPrice).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-gray-300">
                              <td colSpan={3} className="text-sm font-semibold text-gray-900 pt-2 text-right">\u5408\u8a08</td>
                              <td className="text-sm font-mono font-semibold text-gray-900 pt-2 text-right">NT$ {inv.amount.toLocaleString()}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
`;

export const CRM_CLIENT_PORTAL: PresetOverlay = {
  templateId: "crm",
  files: [
    { path: "src/app/page.tsx", content: PAGE_DASHBOARD },
    { path: "src/app/tickets/page.tsx", content: PAGE_TICKETS },
    { path: "src/app/invoices/page.tsx", content: PAGE_INVOICES },
    { path: "src/lib/types.ts", content: TYPES_FILE },
    { path: "src/lib/mock-data.ts", content: MOCK_DATA_FILE },
  ],
  requiredServices: [
    { category: "database", suggestedTypes: ["built_in_supabase", "postgresql"], purpose: "\u5132\u5b58\u5de5\u55ae\u8207\u767c\u7968\u8cc7\u6599" },
    { category: "storage", suggestedTypes: ["built_in_supabase", "s3"], purpose: "\u6587\u4ef6\u5132\u5b58", optional: true },
  ],
};
