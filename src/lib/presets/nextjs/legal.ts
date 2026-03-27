export const LEGAL_CONTRACT_MANAGER_PAGE = `"use client";
import { useState } from "react";

interface Contract {
  id: number;
  title: string;
  party: string;
  type: string;
  startDate: string;
  expiryDate: string;
  amount: string;
  status: "draft" | "reviewing" | "active" | "expired";
}

const initialContracts: Contract[] = [
  { id: 1, title: "\u88DD\u6F62\u5DE5\u7A0B\u627F\u652C\u5408\u7D04", party: "\u5927\u548C\u5EFA\u8A2D\u6709\u9650\u516C\u53F8", type: "\u627F\u652C", startDate: "2025-01-15", expiryDate: "2026-01-14", amount: "NT$ 2,500,000", status: "active" },
  { id: 2, title: "\u8EDF\u9AD4\u6388\u6B0A\u5408\u7D04", party: "\u667A\u6167\u79D1\u6280\u80A1\u4EFD\u6709\u9650\u516C\u53F8", type: "\u6388\u6B0A", startDate: "2024-06-01", expiryDate: "2025-05-31", amount: "NT$ 480,000", status: "expired" },
  { id: 3, title: "\u4FDD\u5BC6\u5354\u8B70\u66F8 (NDA)", party: "\u5275\u65B0\u91D1\u878D\u80A1\u4EFD\u6709\u9650\u516C\u53F8", type: "\u4FDD\u5BC6", startDate: "2025-03-01", expiryDate: "2027-02-28", amount: "-", status: "active" },
  { id: 4, title: "\u8FA6\u516C\u5BA4\u79DF\u8CC3\u5408\u7D04", party: "\u4FE1\u7FA9\u4E0D\u52D5\u7522\u958B\u767C\u6709\u9650\u516C\u53F8", type: "\u79DF\u8CC3", startDate: "2025-04-01", expiryDate: "2028-03-31", amount: "NT$ 1,800,000/\u5E74", status: "reviewing" },
  { id: 5, title: "\u54E1\u5DE5\u52DE\u52D5\u5408\u7D04\u7BC4\u672C", party: "\u5167\u90E8\u4F7F\u7528", type: "\u52DE\u52D5", startDate: "2025-02-01", expiryDate: "2026-01-31", amount: "-", status: "draft" },
  { id: 6, title: "\u96FB\u5B50\u5546\u52D9\u5408\u4F5C\u5408\u7D04", party: "\u7DB2\u8DEF\u5BB6\u80A1\u4EFD\u6709\u9650\u516C\u53F8", type: "\u5408\u4F5C", startDate: "2025-05-10", expiryDate: "2026-05-09", amount: "NT$ 960,000", status: "reviewing" },
];

const statusConfig: Record<Contract["status"], { label: string; color: string }> = {
  draft: { label: "\u8349\u7A3F", color: "bg-gray-100 text-gray-700" },
  reviewing: { label: "\u5BE9\u67E5\u4E2D", color: "bg-yellow-100 text-yellow-700" },
  active: { label: "\u751F\u6548\u4E2D", color: "bg-green-100 text-green-700" },
  expired: { label: "\u5DF2\u5230\u671F", color: "bg-red-100 text-red-700" },
};

export default function Home() {
  const [contracts, setContracts] = useState<Contract[]>(initialContracts);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newParty, setNewParty] = useState("");
  const [newType, setNewType] = useState("\u627F\u652C");
  const [newExpiry, setNewExpiry] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const filtered = filterStatus === "all" ? contracts : contracts.filter((c) => c.status === filterStatus);

  const handleAdd = () => {
    if (!newTitle || !newParty || !newExpiry) return;
    const today = new Date().toISOString().slice(0, 10);
    setContracts([
      ...contracts,
      {
        id: Date.now(),
        title: newTitle,
        party: newParty,
        type: newType,
        startDate: today,
        expiryDate: newExpiry,
        amount: newAmount || "-",
        status: "draft",
      },
    ]);
    setNewTitle("");
    setNewParty("");
    setNewType("\u627F\u652C");
    setNewExpiry("");
    setNewAmount("");
    setShowForm(false);
  };

  const daysUntilExpiry = (date: string) => {
    const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
    return diff;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">\u5408\u7D04\u7BA1\u7406\u7CFB\u7D71</h1>
            <p className="text-gray-500 mt-1">\u5408\u7D04\u7E3D\u6578 {contracts.length} \u4EFD\uFF0C\u751F\u6548\u4E2D {contracts.filter((c) => c.status === "active").length} \u4EFD</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">{showForm ? "\u53D6\u6D88" : "\u65B0\u589E\u5408\u7D04"}</button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow p-6 mb-6 border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">\u65B0\u589E\u5408\u7D04</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="border rounded-lg px-3 py-2" placeholder="\u5408\u7D04\u540D\u7A31" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              <input className="border rounded-lg px-3 py-2" placeholder="\u5C0D\u65B9\u7576\u4E8B\u4EBA" value={newParty} onChange={(e) => setNewParty(e.target.value)} />
              <select className="border rounded-lg px-3 py-2" value={newType} onChange={(e) => setNewType(e.target.value)}>
                <option>\u627F\u652C</option><option>\u6388\u6B0A</option><option>\u4FDD\u5BC6</option><option>\u79DF\u8CC3</option><option>\u52DE\u52D5</option><option>\u5408\u4F5C</option>
              </select>
              <input className="border rounded-lg px-3 py-2" type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} />
              <input className="border rounded-lg px-3 py-2" placeholder="\u91D1\u984D" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
              <button onClick={handleAdd} className="bg-green-600 text-white rounded-lg px-4 py-2 hover:bg-green-700 transition">\u78BA\u8A8D\u65B0\u589E</button>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          {["all", "draft", "reviewing", "active", "expired"].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)} className={\`px-3 py-1 rounded-full text-sm font-medium transition \${filterStatus === s ? "bg-blue-600 text-white" : "bg-white text-gray-600 border hover:bg-gray-50"}\`}>
              {s === "all" ? "\u5168\u90E8" : statusConfig[s as Contract["status"]].label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">\u5408\u7D04\u540D\u7A31</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">\u5C0D\u65B9\u7576\u4E8B\u4EBA</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">\u985E\u578B</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">\u5230\u671F\u65E5</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">\u91D1\u984D</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">\u72C0\u614B</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const days = daysUntilExpiry(c.expiryDate);
                return (
                  <tr key={c.id} className="border-b last:border-b-0 hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.title}</td>
                    <td className="px-4 py-3 text-gray-600">{c.party}</td>
                    <td className="px-4 py-3"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-sm">{c.type}</span></td>
                    <td className="px-4 py-3">
                      <span className={days <= 30 && days > 0 ? "text-orange-600 font-medium" : days <= 0 ? "text-red-600 font-medium" : "text-gray-600"}>
                        {c.expiryDate} {days <= 30 && days > 0 ? \`(\${days}\u5929\u5F8C\u5230\u671F)\` : days <= 0 ? "(\u5DF2\u5230\u671F)" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.amount}</td>
                    <td className="px-4 py-3"><span className={\`px-2 py-1 rounded-full text-xs font-medium \${statusConfig[c.status].color}\`}>{statusConfig[c.status].label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-8 text-gray-400">\u7121\u7B26\u5408\u689D\u4EF6\u7684\u5408\u7D04</div>}
        </div>
      </div>
    </div>
  );
}
`;

export const LEGAL_CASE_TRACKER_PAGE = `"use client";
import { useState } from "react";

interface Case {
  id: number;
  caseNumber: string;
  title: string;
  client: string;
  type: string;
  status: "pending" | "in_progress" | "court" | "closed";
  deadline: string;
  documentCount: number;
  assignee: string;
}

const initialCases: Case[] = [
  { id: 1, caseNumber: "C-2025-001", title: "\u5546\u6A19\u4FB5\u6B0A\u722D\u8B70\u6848", client: "\u5927\u548C\u5EFA\u8A2D\u6709\u9650\u516C\u53F8", type: "\u667A\u6167\u8CA1\u7522", status: "in_progress", deadline: "2025-08-15", documentCount: 12, assignee: "\u674E\u5C1A\u5FB7" },
  { id: 2, caseNumber: "C-2025-002", title: "\u52DE\u8CC7\u722D\u8B70\u8ABF\u89E3\u6848", client: "\u738B\u5C0F\u660E", type: "\u52DE\u52D5\u6CD5", status: "pending", deadline: "2025-06-30", documentCount: 5, assignee: "\u9673\u7F8E\u83EF" },
  { id: 3, caseNumber: "C-2025-003", title: "\u5408\u7D04\u50B5\u52D9\u4E0D\u5C65\u884C\u6848", client: "\u5275\u65B0\u91D1\u878D\u80A1\u4EFD\u6709\u9650\u516C\u53F8", type: "\u6C11\u4E8B", status: "court", deadline: "2025-07-20", documentCount: 28, assignee: "\u674E\u5C1A\u5FB7" },
  { id: 4, caseNumber: "C-2025-004", title: "\u4E0D\u52D5\u7522\u7A05\u52D9\u7533\u8A34\u6848", client: "\u4FE1\u7FA9\u4E0D\u52D5\u7522\u958B\u767C\u6709\u9650\u516C\u53F8", type: "\u7A05\u52D9", status: "in_progress", deadline: "2025-09-01", documentCount: 8, assignee: "\u5F35\u5FD7\u660E" },
  { id: 5, caseNumber: "C-2024-018", title: "\u80A1\u6771\u6703\u6C7A\u8B70\u7121\u6548\u6848", client: "\u7DB2\u8DEF\u5BB6\u80A1\u4EFD\u6709\u9650\u516C\u53F8", type: "\u516C\u53F8\u6CD5", status: "closed", deadline: "2025-03-15", documentCount: 34, assignee: "\u9673\u7F8E\u83EF" },
  { id: 6, caseNumber: "C-2025-005", title: "\u500B\u4EBA\u8CC7\u6599\u5916\u6D29\u640D\u5BB3\u8CE0\u511F\u6848", client: "\u6797\u5FD7\u73B2", type: "\u500B\u8CC7\u6CD5", status: "pending", deadline: "2025-07-10", documentCount: 3, assignee: "\u5F35\u5FD7\u660E" },
  { id: 7, caseNumber: "C-2025-006", title: "\u5EFA\u7BC9\u5DE5\u7A0B\u7CE7\u7D1B\u6848", client: "\u5927\u548C\u5EFA\u8A2D\u6709\u9650\u516C\u53F8", type: "\u6C11\u4E8B", status: "in_progress", deadline: "2025-10-30", documentCount: 15, assignee: "\u674E\u5C1A\u5FB7" },
];

const statusConfig: Record<Case["status"], { label: string; color: string }> = {
  pending: { label: "\u5F85\u8655\u7406", color: "bg-yellow-100 text-yellow-700" },
  in_progress: { label: "\u9032\u884C\u4E2D", color: "bg-blue-100 text-blue-700" },
  court: { label: "\u958B\u5EAD\u4E2D", color: "bg-purple-100 text-purple-700" },
  closed: { label: "\u5DF2\u7D50\u6848", color: "bg-gray-100 text-gray-600" },
};

export default function Home() {
  const [cases, setCases] = useState<Case[]>(initialCases);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = cases
    .filter((c) => filterStatus === "all" || c.status === filterStatus)
    .filter((c) => c.title.includes(searchTerm) || c.client.includes(searchTerm) || c.caseNumber.includes(searchTerm));

  const daysUntilDeadline = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);

  const progressPercent = (status: Case["status"]) => {
    const map: Record<Case["status"], number> = { pending: 10, in_progress: 50, court: 75, closed: 100 };
    return map[status];
  };

  const stats = {
    total: cases.length,
    active: cases.filter((c) => c.status !== "closed").length,
    urgent: cases.filter((c) => { const d = daysUntilDeadline(c.deadline); return d <= 30 && d > 0 && c.status !== "closed"; }).length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">\u6848\u4EF6\u8FFD\u8E64\u7CFB\u7D71</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-4 border border-gray-200">
            <p className="text-sm text-gray-500">\u7E3D\u6848\u4EF6\u6578</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border border-gray-200">
            <p className="text-sm text-gray-500">\u9032\u884C\u4E2D\u6848\u4EF6</p>
            <p className="text-3xl font-bold text-blue-600">{stats.active}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border border-gray-200">
            <p className="text-sm text-gray-500">\u7DCA\u6025\u6848\u4EF6\uFF0830\u5929\u5167\u5230\u671F\uFF09</p>
            <p className="text-3xl font-bold text-red-600">{stats.urgent}</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <input className="border rounded-lg px-4 py-2 flex-1" placeholder="\u641C\u5C0B\u6848\u4EF6\u7DE8\u865F\u3001\u540D\u7A31\u6216\u5BA2\u6236..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <div className="flex gap-2">
            {["all", "pending", "in_progress", "court", "closed"].map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)} className={\`px-3 py-1 rounded-full text-sm font-medium transition \${filterStatus === s ? "bg-blue-600 text-white" : "bg-white text-gray-600 border hover:bg-gray-50"}\`}>
                {s === "all" ? "\u5168\u90E8" : statusConfig[s as Case["status"]].label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filtered.map((c) => {
            const days = daysUntilDeadline(c.deadline);
            const pct = progressPercent(c.status);
            return (
              <div key={c.id} className="bg-white rounded-xl shadow p-5 border border-gray-200 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-gray-400 font-mono">{c.caseNumber}</span>
                      <span className={\`px-2 py-0.5 rounded-full text-xs font-medium \${statusConfig[c.status].color}\`}>{statusConfig[c.status].label}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{c.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">\u5BA2\u6236\uFF1A{c.client} \u00B7 \u985E\u578B\uFF1A{c.type} \u00B7 \u627F\u8FA6\u4EBA\uFF1A{c.assignee}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <span>\u6587\u4EF6</span>
                      <span className="bg-gray-100 px-2 py-0.5 rounded font-medium">{c.documentCount}</span>
                    </div>
                    <p className={\`text-sm mt-1 font-medium \${days <= 14 && days > 0 ? "text-red-600" : days <= 30 && days > 0 ? "text-orange-600" : days <= 0 && c.status !== "closed" ? "text-red-700" : "text-gray-500"}\`}>
                      {c.status === "closed" ? "\u5DF2\u7D50\u6848" : days <= 0 ? "\u5DF2\u904E\u671F\u671F\u9650" : \`\u5269\u9918 \${days} \u5929\`}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={\`h-2 rounded-full transition-all \${c.status === "closed" ? "bg-gray-400" : pct >= 75 ? "bg-purple-500" : pct >= 50 ? "bg-blue-500" : "bg-yellow-500"}\`} style={{ width: \`\${pct}%\` }} />
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="text-center py-12 text-gray-400">\u7121\u7B26\u5408\u689D\u4EF6\u7684\u6848\u4EF6</div>}
        </div>
      </div>
    </div>
  );
}
`;

export const LEGAL_COMPLIANCE_CHECKLIST_PAGE = `"use client";
import { useState } from "react";

interface ChecklistItem {
  id: number;
  category: string;
  title: string;
  description: string;
  completed: boolean;
  dueDate: string;
  assignee: string;
  priority: "high" | "medium" | "low";
}

interface AuditLog {
  id: number;
  itemId: number;
  action: string;
  user: string;
  timestamp: string;
}

const initialItems: ChecklistItem[] = [
  { id: 1, category: "\u500B\u8CC7\u4FDD\u8B77", title: "\u500B\u4EBA\u8CC7\u6599\u76E4\u9EDE\u8207\u5206\u985E", description: "\u5B8C\u6210\u516C\u53F8\u6240\u6709\u500B\u4EBA\u8CC7\u6599\u7684\u76E4\u9EDE\uFF0C\u5EFA\u7ACB\u8CC7\u6599\u6E05\u518A\u4E26\u5206\u985E\u6A19\u8A3B", completed: true, dueDate: "2025-04-30", assignee: "\u9673\u7F8E\u83EF", priority: "high" },
  { id: 2, category: "\u500B\u8CC7\u4FDD\u8B77", title: "\u96B1\u79C1\u653F\u7B56\u66F4\u65B0", description: "\u4F9D\u64DA\u6700\u65B0\u500B\u8CC7\u6CD5\u898F\u5B9A\u66F4\u65B0\u516C\u53F8\u96B1\u79C1\u653F\u7B56\u8207\u540C\u610F\u66F8", completed: false, dueDate: "2025-06-15", assignee: "\u674E\u5C1A\u5FB7", priority: "high" },
  { id: 3, category: "\u53CD\u6D17\u9322", title: "KYC \u6D41\u7A0B\u5BE9\u67E5", description: "\u6AA2\u8996\u73FE\u6709\u5BA2\u6236\u8EAB\u5206\u9A57\u8B49\u6D41\u7A0B\u662F\u5426\u7B26\u5408\u6CD5\u898F", completed: false, dueDate: "2025-05-20", assignee: "\u5F35\u5FD7\u660E", priority: "high" },
  { id: 4, category: "\u53CD\u6D17\u9322", title: "\u53EF\u7591\u4EA4\u6613\u5831\u544A\u6A5F\u5236", description: "\u78BA\u8A8D\u53EF\u7591\u4EA4\u6613\u5831\u544A\u7CFB\u7D71\u904B\u4F5C\u6B63\u5E38\u4E26\u6E2C\u8A66\u901A\u5831\u6D41\u7A0B", completed: true, dueDate: "2025-04-15", assignee: "\u5F35\u5FD7\u660E", priority: "medium" },
  { id: 5, category: "\u8CC7\u5B89\u5408\u898F", title: "\u8CC7\u8A0A\u5B89\u5168\u5167\u90E8\u7A3D\u6838", description: "\u57F7\u884C\u5E74\u5EA6\u8CC7\u5B89\u7A3D\u6838\uFF0C\u6AA2\u67E5\u5B58\u53D6\u63A7\u5236\u8207\u7CFB\u7D71\u6B0A\u9650\u8A2D\u5B9A", completed: false, dueDate: "2025-07-31", assignee: "\u9673\u7F8E\u83EF", priority: "medium" },
  { id: 6, category: "\u8CC7\u5B89\u5408\u898F", title: "\u54E1\u5DE5\u8CC7\u5B89\u6559\u80B2\u8A13\u7DF4", description: "\u5B8C\u6210\u5168\u9AD4\u54E1\u5DE5\u8CC7\u8A0A\u5B89\u5168\u610F\u8B58\u8A13\u7DF4\u8AB2\u7A0B", completed: true, dueDate: "2025-03-31", assignee: "\u674E\u5C1A\u5FB7", priority: "low" },
  { id: 7, category: "\u516C\u53F8\u6CBB\u7406", title: "\u8463\u4E8B\u6703\u6703\u8B70\u8A18\u9304\u5B58\u6A94", description: "\u78BA\u8A8D\u672C\u5E74\u5EA6\u8463\u4E8B\u6703\u6703\u8B70\u8A18\u9304\u5DF2\u5B8C\u6574\u5B58\u6A94\u4E26\u53EF\u4F9B\u67E5\u95B1", completed: false, dueDate: "2025-08-30", assignee: "\u5F35\u5FD7\u660E", priority: "low" },
];

const initialLogs: AuditLog[] = [
  { id: 1, itemId: 1, action: "\u5DF2\u5B8C\u6210\u6AA2\u67E5\u9805\u76EE", user: "\u9673\u7F8E\u83EF", timestamp: "2025-04-28 14:30" },
  { id: 2, itemId: 4, action: "\u5DF2\u5B8C\u6210\u6AA2\u67E5\u9805\u76EE", user: "\u5F35\u5FD7\u660E", timestamp: "2025-04-10 09:15" },
  { id: 3, itemId: 6, action: "\u5DF2\u5B8C\u6210\u6AA2\u67E5\u9805\u76EE", user: "\u674E\u5C1A\u5FB7", timestamp: "2025-03-28 16:45" },
];

const priorityConfig: Record<ChecklistItem["priority"], { label: string; color: string }> = {
  high: { label: "\u9AD8", color: "bg-red-100 text-red-700" },
  medium: { label: "\u4E2D", color: "bg-yellow-100 text-yellow-700" },
  low: { label: "\u4F4E", color: "bg-green-100 text-green-700" },
};

export default function Home() {
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showCompleted, setShowCompleted] = useState(true);

  const categories = Array.from(new Set(items.map((i) => i.category)));
  const completedCount = items.filter((i) => i.completed).length;
  const complianceRate = Math.round((completedCount / items.length) * 100);

  const toggleItem = (id: number) => {
    setItems(items.map((item) => {
      if (item.id !== id) return item;
      const newCompleted = !item.completed;
      setLogs([{ id: Date.now(), itemId: id, action: newCompleted ? "\u5DF2\u5B8C\u6210\u6AA2\u67E5\u9805\u76EE" : "\u5DF2\u53D6\u6D88\u5B8C\u6210", user: item.assignee, timestamp: new Date().toLocaleString("zh-TW") }, ...logs]);
      return { ...item, completed: newCompleted };
    }));
  };

  const filtered = items
    .filter((i) => filterCategory === "all" || i.category === filterCategory)
    .filter((i) => showCompleted || !i.completed);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">\u5408\u898F\u6AA2\u67E5\u6E05\u55AE</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-4 border border-gray-200">
            <p className="text-sm text-gray-500">\u5408\u898F\u9054\u6210\u7387</p>
            <div className="flex items-end gap-2">
              <p className={\`text-3xl font-bold \${complianceRate >= 80 ? "text-green-600" : complianceRate >= 50 ? "text-yellow-600" : "text-red-600"}\`}>{complianceRate}%</p>
              <p className="text-sm text-gray-400 mb-1">{completedCount}/{items.length} \u9805</p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
              <div className={\`h-2 rounded-full transition-all \${complianceRate >= 80 ? "bg-green-500" : complianceRate >= 50 ? "bg-yellow-500" : "bg-red-500"}\`} style={{ width: \`\${complianceRate}%\` }} />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border border-gray-200">
            <p className="text-sm text-gray-500">\u5F85\u5B8C\u6210\u9805\u76EE</p>
            <p className="text-3xl font-bold text-orange-600">{items.length - completedCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border border-gray-200">
            <p className="text-sm text-gray-500">\u9AD8\u512A\u5148\u5F85\u8FA6</p>
            <p className="text-3xl font-bold text-red-600">{items.filter((i) => i.priority === "high" && !i.completed).length}</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-4 items-start md:items-center">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilterCategory("all")} className={\`px-3 py-1 rounded-full text-sm font-medium transition \${filterCategory === "all" ? "bg-blue-600 text-white" : "bg-white text-gray-600 border hover:bg-gray-50"}\`}>\u5168\u90E8</button>
            {categories.map((cat) => (
              <button key={cat} onClick={() => setFilterCategory(cat)} className={\`px-3 py-1 rounded-full text-sm font-medium transition \${filterCategory === cat ? "bg-blue-600 text-white" : "bg-white text-gray-600 border hover:bg-gray-50"}\`}>{cat}</button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer ml-auto">
            <input type="checkbox" checked={showCompleted} onChange={() => setShowCompleted(!showCompleted)} className="rounded" />
            \u986F\u793A\u5DF2\u5B8C\u6210
          </label>
        </div>

        <div className="space-y-3 mb-8">
          {filtered.map((item) => (
            <div key={item.id} className={\`bg-white rounded-xl shadow p-4 border transition hover:shadow-md \${item.completed ? "border-green-200 bg-green-50/30" : "border-gray-200"}\`}>
              <div className="flex items-start gap-3">
                <button onClick={() => toggleItem(item.id)} className={\`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition \${item.completed ? "bg-green-500 border-green-500 text-white" : "border-gray-300 hover:border-blue-400"}\`}>
                  {item.completed && <span className="text-xs">\u2713</span>}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={\`font-medium \${item.completed ? "text-gray-400 line-through" : "text-gray-900"}\`}>{item.title}</h3>
                    <span className={\`px-2 py-0.5 rounded-full text-xs font-medium \${priorityConfig[item.priority].color}\`}>{priorityConfig[item.priority].label}</span>
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-xs">{item.category}</span>
                  </div>
                  <p className="text-sm text-gray-500">{item.description}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span>\u8CA0\u8CAC\u4EBA\uFF1A{item.assignee}</span>
                    <span>\u5230\u671F\u65E5\uFF1A{item.dueDate}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-12 text-gray-400">\u7121\u7B26\u5408\u689D\u4EF6\u7684\u6AA2\u67E5\u9805\u76EE</div>}
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">\u7A3D\u6838\u65E5\u8A8C</h2>
          <div className="space-y-3">
            {logs.slice(0, 10).map((log) => {
              const item = items.find((i) => i.id === log.itemId);
              return (
                <div key={log.id} className="flex items-center gap-3 text-sm">
                  <span className="text-gray-400 w-36 flex-shrink-0">{log.timestamp}</span>
                  <span className="font-medium text-gray-700">{log.user}</span>
                  <span className="text-gray-500">{log.action}</span>
                  <span className="text-blue-600">{item?.title || "\u672A\u77E5\u9805\u76EE"}</span>
                </div>
              );
            })}
            {logs.length === 0 && <p className="text-gray-400 text-sm">\u5C1A\u7121\u7A3D\u6838\u7D00\u9304</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
`;
