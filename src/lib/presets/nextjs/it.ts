export const IT_HELPDESK_PAGE = `"use client";
import { useState } from "react";

const initialTickets = [
  { id: 1, title: "無法登入 VPN", requester: "王小明", department: "研發部", priority: "high", status: "open", createdAt: "2024-03-25 09:30" },
  { id: 2, title: "印表機無法連線", requester: "李美玲", department: "行銷部", priority: "medium", status: "in-progress", createdAt: "2024-03-24 14:20" },
  { id: 3, title: "電腦藍屏重啟", requester: "張志偉", department: "財務部", priority: "high", status: "open", createdAt: "2024-03-25 10:15" },
  { id: 4, title: "需要安裝 Adobe 軟體", requester: "陳雅婷", department: "設計部", priority: "low", status: "resolved", createdAt: "2024-03-23 11:00" },
  { id: 5, title: "Email 收不到外部信件", requester: "林建宏", department: "業務部", priority: "high", status: "in-progress", createdAt: "2024-03-25 08:45" },
  { id: 6, title: "申請新員工帳號", requester: "黃淑芬", department: "人資部", priority: "medium", status: "open", createdAt: "2024-03-24 16:30" },
  { id: 7, title: "會議室投影設備故障", requester: "周家豪", department: "總務部", priority: "medium", status: "resolved", createdAt: "2024-03-22 13:00" },
  { id: 8, title: "網路速度異常緩慢", requester: "吳佩珊", department: "客服部", priority: "high", status: "open", createdAt: "2024-03-25 11:30" },
];

const priorityMap: Record<string, { label: string; color: string }> = {
  high: { label: "高", color: "bg-red-100 text-red-800" },
  medium: { label: "中", color: "bg-yellow-100 text-yellow-800" },
  low: { label: "低", color: "bg-green-100 text-green-800" },
};

const statusMap: Record<string, { label: string; color: string }> = {
  open: { label: "待處理", color: "bg-red-100 text-red-800" },
  "in-progress": { label: "處理中", color: "bg-blue-100 text-blue-800" },
  resolved: { label: "已解決", color: "bg-green-100 text-green-800" },
};

export default function Home() {
  const [tickets, setTickets] = useState(initialTickets);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", requester: "", department: "", priority: "medium" });

  const filtered = tickets
    .filter((t) => filterStatus === "all" || t.status === filterStatus)
    .filter((t) => t.title.includes(search) || t.requester.includes(search) || t.department.includes(search));

  const handleAdd = () => {
    if (!form.title || !form.requester || !form.department) return;
    const now = new Date();
    const createdAt = now.toISOString().slice(0, 16).replace("T", " ");
    setTickets([{ id: tickets.length + 1, title: form.title, requester: form.requester, department: form.department, priority: form.priority, status: "open", createdAt }, ...tickets]);
    setForm({ title: "", requester: "", department: "", priority: "medium" });
    setShowForm(false);
  };

  const toggleStatus = (id: number) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const order = ["open", "in-progress", "resolved"];
        const next = order[(order.indexOf(t.status) + 1) % order.length];
        return { ...t, status: next };
      })
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">IT 服務台</h1>

        {/* 統計 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">全部工單</p>
            <p className="text-2xl font-bold text-gray-900">{tickets.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">待處理</p>
            <p className="text-2xl font-bold text-red-600">{tickets.filter((t) => t.status === "open").length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">處理中</p>
            <p className="text-2xl font-bold text-blue-600">{tickets.filter((t) => t.status === "in-progress").length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">已解決</p>
            <p className="text-2xl font-bold text-green-600">{tickets.filter((t) => t.status === "resolved").length}</p>
          </div>
        </div>

        {/* 工具列 */}
        <div className="flex items-center justify-between mb-4 gap-3">
          <input placeholder="搜尋工單..." value={search} onChange={(e) => setSearch(e.target.value)} className="border rounded-lg px-3 py-2 text-sm flex-1 max-w-xs" />
          <div className="flex gap-2">
            {["all", "open", "in-progress", "resolved"].map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)} className={\`px-3 py-1 rounded-full text-sm \${filterStatus === s ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}\`}>
                {s === "all" ? "全部" : statusMap[s].label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap">＋ 建立工單</button>
        </div>

        {/* 新增表單 */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h3 className="font-semibold mb-3">建立工單</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input placeholder="問題描述" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="申請人" value={form.requester} onChange={(e) => setForm({ ...form, requester: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="部門" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                <option value="high">高優先</option><option value="medium">中優先</option><option value="low">低優先</option>
              </select>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleAdd} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">送出</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">取消</button>
            </div>
          </div>
        )}

        {/* 工單列表 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">問題描述</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">申請人</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">部門</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">優先度</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">建立時間</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-400">#{t.id}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{t.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{t.requester}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{t.department}</td>
                  <td className="px-4 py-3"><span className={\`px-2 py-0.5 rounded-full text-xs font-medium \${priorityMap[t.priority].color}\`}>{priorityMap[t.priority].label}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{t.createdAt}</td>
                  <td className="px-4 py-3"><button onClick={() => toggleStatus(t.id)} className={\`px-2 py-1 rounded-full text-xs font-medium cursor-pointer \${statusMap[t.status].color}\`}>{statusMap[t.status].label}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}`;
