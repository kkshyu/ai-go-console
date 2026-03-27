export const SALES_CRM_PAGE = `"use client";
import { useState } from "react";

const initialCustomers = [
  { id: 1, name: "王大明", company: "台灣科技股份有限公司", email: "wang@twtech.com", phone: "0912-345-678", deal: 1500000, stage: "proposal", lastContact: "2024-03-15" },
  { id: 2, name: "李美玲", company: "創新數位有限公司", email: "lee@innovate.tw", phone: "0923-456-789", deal: 820000, stage: "qualified", lastContact: "2024-03-20" },
  { id: 3, name: "陳志偉", company: "全球貿易集團", email: "chen@globaltrade.com", phone: "0934-567-890", deal: 3200000, stage: "won", lastContact: "2024-03-10" },
  { id: 4, name: "林雅婷", company: "智慧生活科技", email: "lin@smartlife.tw", phone: "0945-678-901", deal: 650000, stage: "new", lastContact: "2024-03-22" },
  { id: 5, name: "張書豪", company: "北極星顧問公司", email: "chang@polarstar.tw", phone: "0956-789-012", deal: 1100000, stage: "contacted", lastContact: "2024-03-18" },
  { id: 6, name: "黃淑芬", company: "大地建設開發", email: "huang@dadi.com.tw", phone: "0967-890-123", deal: 4500000, stage: "proposal", lastContact: "2024-03-12" },
];

const stageLabels: Record<string, string> = {
  new: "新客戶",
  contacted: "已聯繫",
  qualified: "已確認需求",
  proposal: "提案中",
  won: "已成交",
};

const stageColors: Record<string, string> = {
  new: "bg-gray-100 text-gray-800",
  contacted: "bg-blue-100 text-blue-800",
  qualified: "bg-yellow-100 text-yellow-800",
  proposal: "bg-purple-100 text-purple-800",
  won: "bg-green-100 text-green-800",
};

export default function Home() {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("all");

  const filtered = customers.filter((c) => {
    const matchSearch = c.name.includes(search) || c.company.includes(search) || c.email.includes(search);
    const matchStage = filterStage === "all" || c.stage === filterStage;
    return matchSearch && matchStage;
  });

  const totalDeal = customers.reduce((sum, c) => sum + c.deal, 0);
  const wonDeal = customers.filter((c) => c.stage === "won").reduce((sum, c) => sum + c.deal, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">客戶關係管理 (CRM)</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">客戶總數</p>
          <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">商機總額</p>
          <p className="text-2xl font-bold text-blue-600">NT$ {totalDeal.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">已成交金額</p>
          <p className="text-2xl font-bold text-green-600">NT$ {wonDeal.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex flex-col md:flex-row gap-3">
          <input
            type="text"
            placeholder="搜尋客戶名稱、公司或信箱..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">所有階段</option>
            {Object.entries(stageLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">客戶名稱</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">公司</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">聯絡方式</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">商機金額</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">階段</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">最後聯繫</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.company}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{c.email}</div>
                    <div className="text-sm text-gray-400">{c.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-medium">NT$ {c.deal.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={\`px-2 py-1 rounded-full text-xs font-medium \${stageColors[c.stage]}\`}>{stageLabels[c.stage]}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.lastContact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8">找不到符合條件的客戶</p>}
      </div>
    </div>
  );
}
`;

export const SALES_QUOTE_GENERATOR_PAGE = `"use client";
import { useState } from "react";

const customerList = [
  { id: 1, name: "台灣科技股份有限公司" },
  { id: 2, name: "創新數位有限公司" },
  { id: 3, name: "全球貿易集團" },
  { id: 4, name: "智慧生活科技" },
  { id: 5, name: "北極星顧問公司" },
];

const initialItems = [
  { id: 1, name: "企業雲端方案 - 基礎版", qty: 1, unitPrice: 36000 },
  { id: 2, name: "資料備份服務 (年約)", qty: 2, unitPrice: 12000 },
  { id: 3, name: "SSL 憑證", qty: 1, unitPrice: 3500 },
];

export default function Home() {
  const [selectedCustomer, setSelectedCustomer] = useState(1);
  const [items, setItems] = useState(initialItems);
  const [nextId, setNextId] = useState(4);
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState(1);
  const [newPrice, setNewPrice] = useState(0);
  const [taxRate] = useState(5);

  const subtotal = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const tax = Math.round(subtotal * taxRate / 100);
  const total = subtotal + tax;

  const addItem = () => {
    if (!newName || newPrice <= 0) return;
    setItems([...items, { id: nextId, name: newName, qty: newQty, unitPrice: newPrice }]);
    setNextId(nextId + 1);
    setNewName("");
    setNewQty(1);
    setNewPrice(0);
  };

  const removeItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateQty = (id: number, qty: number) => {
    setItems(items.map((item) => item.id === id ? { ...item, qty: Math.max(1, qty) } : item));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">報價單產生器</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-3">客戶選擇</h2>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {customerList.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-3">報價項目</h2>
            <table className="w-full mb-4">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">項目名稱</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">數量</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">單價</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">小計</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-gray-900">{item.name}</td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateQty(item.id, Number(e.target.value))}
                        className="w-16 text-center border border-gray-300 rounded px-1 py-1"
                        min={1}
                      />
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">NT$ {item.unitPrice.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-medium">NT$ {(item.qty * item.unitPrice).toLocaleString()}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 text-sm">刪除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t pt-4 flex flex-col md:flex-row gap-2">
              <input
                type="text"
                placeholder="項目名稱"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="數量"
                value={newQty}
                onChange={(e) => setNewQty(Number(e.target.value))}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={1}
              />
              <input
                type="number"
                placeholder="單價"
                value={newPrice || ""}
                onChange={(e) => setNewPrice(Number(e.target.value))}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={addItem} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">新增項目</button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 h-fit">
          <h2 className="text-lg font-semibold mb-4">報價摘要</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-gray-600">
              <span>小計</span>
              <span>NT$ {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>營業稅 ({taxRate}%)</span>
              <span>NT$ {tax.toLocaleString()}</span>
            </div>
            <div className="border-t pt-3 flex justify-between text-lg font-bold text-gray-900">
              <span>總計</span>
              <span>NT$ {total.toLocaleString()}</span>
            </div>
          </div>
          <button className="w-full mt-6 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">產生報價單</button>
        </div>
      </div>
    </div>
  );
}
`;

export const SALES_LEAD_TRACKER_PAGE = `"use client";
import { useState } from "react";

type Stage = "new" | "contacted" | "qualified" | "proposal" | "won";

interface Lead {
  id: number;
  name: string;
  company: string;
  value: number;
  stage: Stage;
  source: string;
}

const initialLeads: Lead[] = [
  { id: 1, name: "劉書宏", company: "宏碁資訊科技", value: 980000, stage: "new", source: "官網表單" },
  { id: 2, name: "蔡依伶", company: "綠能科技有限公司", value: 1500000, stage: "contacted", source: "展覽名片" },
  { id: 3, name: "吳建良", company: "台北金融集團", value: 3200000, stage: "qualified", source: "客戶推薦" },
  { id: 4, name: "許雅筑", company: "美麗生活電商", value: 450000, stage: "proposal", source: "LinkedIn" },
  { id: 5, name: "鄭文凱", company: "大同精密工業", value: 2100000, stage: "won", source: "電話開發" },
  { id: 6, name: "周怡君", company: "春風教育科技", value: 780000, stage: "new", source: "官網表單" },
  { id: 7, name: "楊政憲", company: "海洋物流股份公司", value: 1800000, stage: "contacted", source: "合作夥伴" },
];

const columns: { key: Stage; label: string; color: string }[] = [
  { key: "new", label: "新線索", color: "bg-gray-500" },
  { key: "contacted", label: "已聯繫", color: "bg-blue-500" },
  { key: "qualified", label: "已確認需求", color: "bg-yellow-500" },
  { key: "proposal", label: "提案中", color: "bg-purple-500" },
  { key: "won", label: "已成交", color: "bg-green-500" },
];

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);

  const moveForward = (id: number) => {
    setLeads(leads.map((lead) => {
      if (lead.id !== id) return lead;
      const idx = columns.findIndex((c) => c.key === lead.stage);
      if (idx < columns.length - 1) return { ...lead, stage: columns[idx + 1].key };
      return lead;
    }));
  };

  const moveBack = (id: number) => {
    setLeads(leads.map((lead) => {
      if (lead.id !== id) return lead;
      const idx = columns.findIndex((c) => c.key === lead.stage);
      if (idx > 0) return { ...lead, stage: columns[idx - 1].key };
      return lead;
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">銷售線索追蹤看板</h1>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {columns.map((col) => {
          const colLeads = leads.filter((l) => l.stage === col.key);
          const colTotal = colLeads.reduce((sum, l) => sum + l.value, 0);
          return (
            <div key={col.key} className="bg-white rounded-lg shadow p-3 text-center">
              <p className="text-sm text-gray-500">{col.label}</p>
              <p className="text-xl font-bold">{colLeads.length}</p>
              <p className="text-xs text-gray-400">NT$ {colTotal.toLocaleString()}</p>
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colLeads = leads.filter((l) => l.stage === col.key);
          return (
            <div key={col.key} className="min-w-[260px] flex-1">
              <div className={\`\${col.color} text-white px-3 py-2 rounded-t-lg font-semibold text-sm flex justify-between\`}>
                <span>{col.label}</span>
                <span>{colLeads.length}</span>
              </div>
              <div className="bg-gray-100 rounded-b-lg p-2 space-y-2 min-h-[200px]">
                {colLeads.map((lead) => (
                  <div key={lead.id} className="bg-white rounded-lg shadow p-3">
                    <p className="font-medium text-gray-900">{lead.name}</p>
                    <p className="text-sm text-gray-500">{lead.company}</p>
                    <p className="text-sm font-medium text-blue-600 mt-1">NT$ {lead.value.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-1">來源：{lead.source}</p>
                    <div className="flex justify-between mt-2">
                      <button
                        onClick={() => moveBack(lead.id)}
                        disabled={col.key === "new"}
                        className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-30"
                      >
                        ← 退回
                      </button>
                      <button
                        onClick={() => moveForward(lead.id)}
                        disabled={col.key === "won"}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-30"
                      >
                        推進 →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
`;

export const SALES_ORDER_MANAGEMENT_PAGE = `"use client";
import { useState } from "react";

const initialOrders = [
  { id: "ORD-20240301", customer: "台灣科技股份有限公司", contact: "王大明", items: 3, total: 156000, status: "pending", date: "2024-03-01" },
  { id: "ORD-20240305", customer: "創新數位有限公司", contact: "李美玲", items: 1, total: 82000, status: "confirmed", date: "2024-03-05" },
  { id: "ORD-20240308", customer: "全球貿易集團", contact: "陳志偉", items: 5, total: 320000, status: "shipped", date: "2024-03-08" },
  { id: "ORD-20240312", customer: "智慧生活科技", contact: "林雅婷", items: 2, total: 65000, status: "delivered", date: "2024-03-12" },
  { id: "ORD-20240315", customer: "北極星顧問公司", contact: "張書豪", items: 4, total: 210000, status: "pending", date: "2024-03-15" },
  { id: "ORD-20240318", customer: "大地建設開發", contact: "黃淑芬", items: 2, total: 450000, status: "confirmed", date: "2024-03-18" },
  { id: "ORD-20240320", customer: "春風教育科技", contact: "周怡君", items: 1, total: 38000, status: "cancelled", date: "2024-03-20" },
];

const statusLabels: Record<string, string> = {
  pending: "待確認",
  confirmed: "已確認",
  shipped: "已出貨",
  delivered: "已送達",
  cancelled: "已取消",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function Home() {
  const [orders] = useState(initialOrders);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = orders.filter((o) => {
    const matchSearch = o.id.includes(search) || o.customer.includes(search) || o.contact.includes(search);
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalRevenue = orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + o.total, 0);
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">訂單管理</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">總訂單數</p>
          <p className="text-2xl font-bold">{orders.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">營收總額</p>
          <p className="text-2xl font-bold text-green-600">NT$ {totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">待確認</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">已取消</p>
          <p className="text-2xl font-bold text-red-600">{orders.filter((o) => o.status === "cancelled").length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex flex-col md:flex-row gap-3">
          <input
            type="text"
            placeholder="搜尋訂單編號、客戶或聯絡人..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">所有狀態</option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">訂單編號</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">客戶</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">聯絡人</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">品項數</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">金額</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">狀態</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm text-blue-600">{o.id}</td>
                  <td className="px-4 py-3 text-gray-900">{o.customer}</td>
                  <td className="px-4 py-3 text-gray-600">{o.contact}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{o.items}</td>
                  <td className="px-4 py-3 text-right font-medium">NT$ {o.total.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={\`px-2 py-1 rounded-full text-xs font-medium \${statusColors[o.status]}\`}>{statusLabels[o.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{o.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8">找不到符合條件的訂單</p>}
      </div>
    </div>
  );
}
`;

export const SALES_COMMISSION_PAGE = `"use client";
import { useState } from "react";

const initialReps = [
  { id: 1, name: "陳彥廷", region: "北區", sales: 4500000, deals: 12, rate: 8 },
  { id: 2, name: "林佳蓉", region: "中區", sales: 3200000, deals: 9, rate: 7 },
  { id: 3, name: "張家豪", region: "南區", sales: 5100000, deals: 15, rate: 9 },
  { id: 4, name: "黃雅琪", region: "北區", sales: 2800000, deals: 7, rate: 7 },
  { id: 5, name: "吳政達", region: "東區", sales: 1900000, deals: 5, rate: 6 },
  { id: 6, name: "蔡宜蓁", region: "中區", sales: 3800000, deals: 11, rate: 8 },
];

export default function Home() {
  const [reps] = useState(initialReps);
  const [search, setSearch] = useState("");
  const [filterRegion, setFilterRegion] = useState("all");

  const regions = Array.from(new Set(reps.map((r) => r.region)));

  const filtered = reps.filter((r) => {
    const matchSearch = r.name.includes(search);
    const matchRegion = filterRegion === "all" || r.region === filterRegion;
    return matchSearch && matchRegion;
  });

  const totalSales = reps.reduce((sum, r) => sum + r.sales, 0);
  const totalCommission = reps.reduce((sum, r) => sum + Math.round(r.sales * r.rate / 100), 0);
  const totalDeals = reps.reduce((sum, r) => sum + r.deals, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">佣金計算器</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">業務人數</p>
          <p className="text-2xl font-bold">{reps.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">總業績</p>
          <p className="text-2xl font-bold text-blue-600">NT$ {totalSales.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">總佣金支出</p>
          <p className="text-2xl font-bold text-orange-600">NT$ {totalCommission.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">總成交數</p>
          <p className="text-2xl font-bold text-green-600">{totalDeals}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex flex-col md:flex-row gap-3">
          <input
            type="text"
            placeholder="搜尋業務名稱..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">所有區域</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">業務名稱</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">負責區域</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">業績金額</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">成交數</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">佣金比例</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">佣金金額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((r) => {
                const commission = Math.round(r.sales * r.rate / 100);
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                    <td className="px-4 py-3 text-gray-600">{r.region}</td>
                    <td className="px-4 py-3 text-right text-gray-900">NT$ {r.sales.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{r.deals}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">{r.rate}%</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-orange-600">NT$ {commission.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8">找不到符合條件的業務</p>}
      </div>
    </div>
  );
}
`;

export const SALES_VISIT_LOG_PAGE = `"use client";
import { useState } from "react";

interface Visit {
  id: number;
  date: string;
  customer: string;
  contact: string;
  purpose: string;
  notes: string;
  followUp: boolean;
}

const initialVisits: Visit[] = [
  { id: 1, date: "2024-03-20", customer: "台灣科技股份有限公司", contact: "王大明", purpose: "產品展示", notes: "客戶對雲端方案有興趣，需提供報價", followUp: true },
  { id: 2, date: "2024-03-19", customer: "創新數位有限公司", contact: "李美玲", purpose: "需求訪談", notes: "了解客戶目前系統痛點，後續安排技術評估", followUp: true },
  { id: 3, date: "2024-03-18", customer: "全球貿易集團", contact: "陳志偉", purpose: "合約簽署", notes: "順利完成年度合約簽署", followUp: false },
  { id: 4, date: "2024-03-15", customer: "智慧生活科技", contact: "林雅婷", purpose: "售後服務", notes: "系統上線後回訪，運行正常", followUp: false },
  { id: 5, date: "2024-03-14", customer: "北極星顧問公司", contact: "張書豪", purpose: "初次拜訪", notes: "介紹公司產品線，客戶有意願進一步了解", followUp: true },
  { id: 6, date: "2024-03-12", customer: "大地建設開發", contact: "黃淑芬", purpose: "提案簡報", notes: "提交客製化方案簡報，等待客戶內部評估", followUp: true },
];

export default function Home() {
  const [visits, setVisits] = useState<Visit[]>(initialVisits);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newVisit, setNewVisit] = useState({ date: "", customer: "", contact: "", purpose: "", notes: "" });
  const [nextId, setNextId] = useState(7);

  const filtered = visits.filter((v) =>
    v.customer.includes(search) || v.contact.includes(search) || v.purpose.includes(search)
  );

  const addVisit = () => {
    if (!newVisit.date || !newVisit.customer || !newVisit.contact) return;
    setVisits([{ id: nextId, ...newVisit, followUp: false }, ...visits]);
    setNextId(nextId + 1);
    setNewVisit({ date: "", customer: "", contact: "", purpose: "", notes: "" });
    setShowForm(false);
  };

  const toggleFollowUp = (id: number) => {
    setVisits(visits.map((v) => v.id === id ? { ...v, followUp: !v.followUp } : v));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">客戶拜訪紀錄</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {showForm ? "取消" : "新增拜訪"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">新增拜訪紀錄</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="date" value={newVisit.date} onChange={(e) => setNewVisit({ ...newVisit, date: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="text" placeholder="客戶公司" value={newVisit.customer} onChange={(e) => setNewVisit({ ...newVisit, customer: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="text" placeholder="聯絡人" value={newVisit.contact} onChange={(e) => setNewVisit({ ...newVisit, contact: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="text" placeholder="拜訪目的" value={newVisit.purpose} onChange={(e) => setNewVisit({ ...newVisit, purpose: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <textarea placeholder="備註" value={newVisit.notes} onChange={(e) => setNewVisit({ ...newVisit, notes: e.target.value })} className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} />
          </div>
          <button onClick={addVisit} className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">儲存紀錄</button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <input
            type="text"
            placeholder="搜尋客戶、聯絡人或拜訪目的..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">客戶公司</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">聯絡人</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">拜訪目的</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">備註</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">需追蹤</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{v.date}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{v.customer}</td>
                  <td className="px-4 py-3 text-gray-600">{v.contact}</td>
                  <td className="px-4 py-3 text-gray-600">{v.purpose}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm max-w-[200px] truncate">{v.notes}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleFollowUp(v.id)}
                      className={\`px-2 py-1 rounded text-xs font-medium \${v.followUp ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-500"}\`}
                    >
                      {v.followUp ? "待追蹤" : "已完成"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8">找不到符合條件的拜訪紀錄</p>}
      </div>
    </div>
  );
}
`;

export const SALES_TERRITORY_MAP_PAGE = `"use client";
import { useState } from "react";

const initialTerritories = [
  { id: 1, region: "台北市", rep: "陳彥廷", customers: 45, revenue: 12500000, target: 15000000 },
  { id: 2, region: "新北市", rep: "林佳蓉", customers: 38, revenue: 8900000, target: 10000000 },
  { id: 3, region: "桃園市", rep: "張家豪", customers: 22, revenue: 5600000, target: 7000000 },
  { id: 4, region: "台中市", rep: "黃雅琪", customers: 30, revenue: 7200000, target: 8000000 },
  { id: 5, region: "台南市", rep: "吳政達", customers: 18, revenue: 4100000, target: 5000000 },
  { id: 6, region: "高雄市", rep: "蔡宜蓁", customers: 28, revenue: 6800000, target: 8000000 },
  { id: 7, region: "新竹市", rep: "周怡君", customers: 15, revenue: 3500000, target: 4000000 },
];

export default function Home() {
  const [territories] = useState(initialTerritories);
  const [search, setSearch] = useState("");

  const filtered = territories.filter((t) =>
    t.region.includes(search) || t.rep.includes(search)
  );

  const totalRevenue = territories.reduce((sum, t) => sum + t.revenue, 0);
  const totalTarget = territories.reduce((sum, t) => sum + t.target, 0);
  const totalCustomers = territories.reduce((sum, t) => sum + t.customers, 0);
  const overallRate = Math.round((totalRevenue / totalTarget) * 100);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">銷售區域管理</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">管轄區域數</p>
          <p className="text-2xl font-bold">{territories.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">客戶總數</p>
          <p className="text-2xl font-bold text-blue-600">{totalCustomers}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">營收 / 目標</p>
          <p className="text-2xl font-bold text-green-600">NT$ {(totalRevenue / 10000).toFixed(0)}萬</p>
          <p className="text-xs text-gray-400">目標 NT$ {(totalTarget / 10000).toFixed(0)}萬</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">整體達成率</p>
          <p className={\`text-2xl font-bold \${overallRate >= 80 ? "text-green-600" : "text-orange-600"}\`}>{overallRate}%</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <input
            type="text"
            placeholder="搜尋區域或業務..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">區域</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">負責業務</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">客戶數</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">營收</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">目標</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">達成率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((t) => {
                const rate = Math.round((t.revenue / t.target) * 100);
                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{t.region}</td>
                    <td className="px-4 py-3 text-gray-600">{t.rep}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{t.customers}</td>
                    <td className="px-4 py-3 text-right text-gray-900">NT$ {t.revenue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-500">NT$ {t.target.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[120px]">
                          <div
                            className={\`h-2 rounded-full \${rate >= 80 ? "bg-green-500" : rate >= 60 ? "bg-yellow-500" : "bg-red-500"}\`}
                            style={{ width: \`\${Math.min(rate, 100)}%\` }}
                          />
                        </div>
                        <span className={\`text-sm font-medium \${rate >= 80 ? "text-green-600" : rate >= 60 ? "text-yellow-600" : "text-red-600"}\`}>{rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8">找不到符合條件的區域</p>}
      </div>
    </div>
  );
}
`;

export const SALES_PRODUCT_CATALOG_PAGE = `"use client";
import { useState } from "react";

const initialProducts = [
  { id: 1, name: "企業雲端方案 - 基礎版", category: "雲端服務", price: 36000, unit: "年", description: "適合小型團隊，含 100GB 儲存空間", inStock: true },
  { id: 2, name: "企業雲端方案 - 專業版", category: "雲端服務", price: 96000, unit: "年", description: "適合中型企業，含 1TB 儲存空間及進階分析", inStock: true },
  { id: 3, name: "資料備份服務", category: "資安服務", price: 12000, unit: "年", description: "自動每日備份，異地儲存，快速還原", inStock: true },
  { id: 4, name: "SSL 憑證", category: "資安服務", price: 3500, unit: "年", description: "企業級 SSL 憑證，支援萬用字元", inStock: true },
  { id: 5, name: "智能客服機器人", category: "AI 解決方案", price: 180000, unit: "套", description: "AI 驅動的客服系統，支援多語系", inStock: false },
  { id: 6, name: "數據分析平台", category: "AI 解決方案", price: 250000, unit: "套", description: "企業級 BI 工具，即時儀表板與報表", inStock: true },
  { id: 7, name: "網站建置服務", category: "專業服務", price: 85000, unit: "專案", description: "RWD 響應式網站設計與開發", inStock: true },
  { id: 8, name: "系統整合顧問", category: "專業服務", price: 15000, unit: "天", description: "資深顧問到場評估與規劃", inStock: true },
];

export default function Home() {
  const [products] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showInStockOnly, setShowInStockOnly] = useState(false);

  const categories = Array.from(new Set(products.map((p) => p.category)));

  const filtered = products.filter((p) => {
    const matchSearch = p.name.includes(search) || p.description.includes(search);
    const matchCategory = filterCategory === "all" || p.category === filterCategory;
    const matchStock = !showInStockOnly || p.inStock;
    return matchSearch && matchCategory && matchStock;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">產品目錄</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            placeholder="搜尋產品名稱或描述..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">所有類別</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showInStockOnly}
              onChange={(e) => setShowInStockOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-600">僅顯示可供應</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map((p) => (
          <div key={p.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">{p.category}</span>
                <span className={\`px-2 py-1 rounded text-xs font-medium \${p.inStock ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}\`}>
                  {p.inStock ? "可供應" : "缺貨中"}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mt-2">{p.name}</h3>
              <p className="text-sm text-gray-500 mt-1 min-h-[40px]">{p.description}</p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-blue-600">NT$ {p.price.toLocaleString()}</span>
                <span className="text-sm text-gray-400">/ {p.unit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-center text-gray-400 py-12 bg-white rounded-lg shadow mt-4">找不到符合條件的產品</div>
      )}
    </div>
  );
}
`;
