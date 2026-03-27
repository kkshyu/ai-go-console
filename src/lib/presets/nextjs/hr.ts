export const HR_LEAVE_SYSTEM_PAGE = `"use client";
import { useState } from "react";

const initialLeaves = [
  { id: 1, employee: "王小明", type: "特休", startDate: "2024-03-25", endDate: "2024-03-26", days: 2, reason: "家庭旅遊", status: "approved" },
  { id: 2, employee: "李美玲", type: "病假", startDate: "2024-03-20", endDate: "2024-03-20", days: 1, reason: "身體不適", status: "pending" },
  { id: 3, employee: "張志偉", type: "事假", startDate: "2024-03-28", endDate: "2024-03-29", days: 2, reason: "搬家", status: "approved" },
  { id: 4, employee: "陳雅婷", type: "特休", startDate: "2024-04-01", endDate: "2024-04-03", days: 3, reason: "出國旅遊", status: "rejected" },
  { id: 5, employee: "林建宏", type: "公假", startDate: "2024-04-05", endDate: "2024-04-05", days: 1, reason: "外訓課程", status: "pending" },
  { id: 6, employee: "黃淑芬", type: "病假", startDate: "2024-03-18", endDate: "2024-03-19", days: 2, reason: "感冒發燒", status: "approved" },
];

const leaveBalance = [
  { type: "特休", total: 14, used: 5, remaining: 9 },
  { type: "病假", total: 30, used: 3, remaining: 27 },
  { type: "事假", total: 14, used: 2, remaining: 12 },
  { type: "公假", total: 0, used: 1, remaining: 0 },
];

const statusMap: Record<string, { label: string; color: string }> = {
  approved: { label: "已核准", color: "bg-green-100 text-green-800" },
  pending: { label: "待審核", color: "bg-yellow-100 text-yellow-800" },
  rejected: { label: "已駁回", color: "bg-red-100 text-red-800" },
};

export default function Home() {
  const [leaves, setLeaves] = useState(initialLeaves);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "特休", startDate: "", endDate: "", reason: "" });

  const filtered = filterStatus === "all" ? leaves : leaves.filter((l) => l.status === filterStatus);

  const handleSubmit = () => {
    if (!form.startDate || !form.endDate || !form.reason) return;
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    setLeaves([...leaves, { id: leaves.length + 1, employee: "王小明", type: form.type, startDate: form.startDate, endDate: form.endDate, days, reason: form.reason, status: "pending" }]);
    setForm({ type: "特休", startDate: "", endDate: "", reason: "" });
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">請假管理系統</h1>

        {/* 假別餘額 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {leaveBalance.map((b) => (
            <div key={b.type} className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">{b.type}</p>
              <p className="text-2xl font-bold text-gray-900">{b.remaining} <span className="text-sm font-normal text-gray-400">/ {b.total} 天</span></p>
              <p className="text-xs text-gray-400 mt-1">已使用 {b.used} 天</p>
            </div>
          ))}
        </div>

        {/* 工具列 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {["all", "pending", "approved", "rejected"].map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)} className={\`px-3 py-1 rounded-full text-sm \${filterStatus === s ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}\`}>
                {s === "all" ? "全部" : statusMap[s].label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            ＋ 新增請假
          </button>
        </div>

        {/* 新增表單 */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h3 className="font-semibold mb-3">申請請假</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                <option>特休</option><option>病假</option><option>事假</option><option>公假</option>
              </select>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="請假事由" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleSubmit} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">送出申請</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">取消</button>
            </div>
          </div>
        )}

        {/* 請假紀錄 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">員工</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">假別</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">起始日</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">結束日</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">天數</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">事由</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{l.employee}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{l.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{l.startDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{l.endDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{l.days}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{l.reason}</td>
                  <td className="px-4 py-3"><span className={\`px-2 py-1 rounded-full text-xs font-medium \${statusMap[l.status].color}\`}>{statusMap[l.status].label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}`;

export const HR_RECRUITMENT_PAGE = `"use client";
import { useState } from "react";

const initialJobs = [
  { id: 1, title: "前端工程師", department: "研發部", applicants: 23, interviews: 5, status: "open", postedDate: "2024-03-01" },
  { id: 2, title: "產品經理", department: "產品部", applicants: 15, interviews: 3, status: "open", postedDate: "2024-03-05" },
  { id: 3, title: "UI/UX 設計師", department: "設計部", applicants: 18, interviews: 4, status: "interviewing", postedDate: "2024-02-20" },
  { id: 4, title: "後端工程師", department: "研發部", applicants: 30, interviews: 8, status: "open", postedDate: "2024-03-10" },
  { id: 5, title: "行銷專員", department: "行銷部", applicants: 12, interviews: 2, status: "closed", postedDate: "2024-01-15" },
  { id: 6, title: "資料分析師", department: "數據部", applicants: 9, interviews: 1, status: "interviewing", postedDate: "2024-02-28" },
  { id: 7, title: "客服主管", department: "客服部", applicants: 7, interviews: 0, status: "open", postedDate: "2024-03-12" },
];

const statusMap: Record<string, { label: string; color: string }> = {
  open: { label: "招募中", color: "bg-green-100 text-green-800" },
  interviewing: { label: "面試中", color: "bg-blue-100 text-blue-800" },
  closed: { label: "已結束", color: "bg-gray-100 text-gray-800" },
};

export default function Home() {
  const [jobs, setJobs] = useState(initialJobs);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", department: "" });

  const filtered = jobs
    .filter((j) => filterStatus === "all" || j.status === filterStatus)
    .filter((j) => j.title.includes(search) || j.department.includes(search));

  const handleAdd = () => {
    if (!form.title || !form.department) return;
    setJobs([...jobs, { id: jobs.length + 1, title: form.title, department: form.department, applicants: 0, interviews: 0, status: "open", postedDate: new Date().toISOString().split("T")[0] }]);
    setForm({ title: "", department: "" });
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">招募管理平台</h1>

        {/* 統計卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">職缺總數</p>
            <p className="text-2xl font-bold text-gray-900">{jobs.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">總應徵人數</p>
            <p className="text-2xl font-bold text-blue-600">{jobs.reduce((s, j) => s + j.applicants, 0)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">面試安排</p>
            <p className="text-2xl font-bold text-green-600">{jobs.reduce((s, j) => s + j.interviews, 0)}</p>
          </div>
        </div>

        {/* 工具列 */}
        <div className="flex items-center justify-between mb-4 gap-3">
          <input placeholder="搜尋職缺或部門..." value={search} onChange={(e) => setSearch(e.target.value)} className="border rounded-lg px-3 py-2 text-sm flex-1 max-w-xs" />
          <div className="flex gap-2">
            {["all", "open", "interviewing", "closed"].map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)} className={\`px-3 py-1 rounded-full text-sm \${filterStatus === s ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}\`}>
                {s === "all" ? "全部" : statusMap[s].label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">＋ 新增職缺</button>
        </div>

        {/* 新增表單 */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h3 className="font-semibold mb-3">新增職缺</h3>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="職缺名稱" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="部門" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleAdd} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">建立職缺</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">取消</button>
            </div>
          </div>
        )}

        {/* 職缺列表 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">職缺</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">部門</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">應徵人數</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">面試數</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">刊登日期</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((j) => (
                <tr key={j.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{j.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{j.department}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{j.applicants}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{j.interviews}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{j.postedDate}</td>
                  <td className="px-4 py-3"><span className={\`px-2 py-1 rounded-full text-xs font-medium \${statusMap[j.status].color}\`}>{statusMap[j.status].label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}`;

export const HR_ONBOARDING_PAGE = `"use client";
import { useState } from "react";

const initialHires = [
  { id: 1, name: "周子瑜", position: "前端工程師", department: "研發部", startDate: "2024-04-01", progress: 75, avatar: "周" },
  { id: 2, name: "吳承恩", position: "產品經理", department: "產品部", startDate: "2024-04-08", progress: 40, avatar: "吳" },
  { id: 3, name: "蔡依林", position: "UI 設計師", department: "設計部", startDate: "2024-04-15", progress: 10, avatar: "蔡" },
  { id: 4, name: "鄭宇翔", position: "資料工程師", department: "數據部", startDate: "2024-03-25", progress: 100, avatar: "鄭" },
  { id: 5, name: "許雅琪", position: "行銷專員", department: "行銷部", startDate: "2024-04-01", progress: 60, avatar: "許" },
];

const defaultTasks = [
  { id: 1, label: "簽署勞動契約", category: "文件" },
  { id: 2, label: "領取員工證與門禁卡", category: "行政" },
  { id: 3, label: "設定公司信箱與帳號", category: "IT" },
  { id: 4, label: "完成資安訓練課程", category: "訓練" },
  { id: 5, label: "認識部門同仁", category: "社交" },
  { id: 6, label: "閱讀員工手冊", category: "文件" },
  { id: 7, label: "設定開發環境", category: "IT" },
  { id: 8, label: "參加新人歡迎會", category: "社交" },
];

export default function Home() {
  const [hires] = useState(initialHires);
  const [selectedHire, setSelectedHire] = useState(initialHires[0].id);
  const [tasks, setTasks] = useState<Record<number, Record<number, boolean>>>(() => {
    const init: Record<number, Record<number, boolean>> = {};
    initialHires.forEach((h) => {
      init[h.id] = {};
      const completedCount = Math.floor((h.progress / 100) * defaultTasks.length);
      defaultTasks.forEach((t, i) => { init[h.id][t.id] = i < completedCount; });
    });
    return init;
  });

  const toggleTask = (hireId: number, taskId: number) => {
    setTasks((prev) => ({
      ...prev,
      [hireId]: { ...prev[hireId], [taskId]: !prev[hireId]?.[taskId] },
    }));
  };

  const getProgress = (hireId: number) => {
    const hireTasks = tasks[hireId] || {};
    const done = Object.values(hireTasks).filter(Boolean).length;
    return Math.round((done / defaultTasks.length) * 100);
  };

  const currentHire = hires.find((h) => h.id === selectedHire);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">新人到職系統</h1>

        {/* 新人卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {hires.map((h) => {
            const prog = getProgress(h.id);
            return (
              <div key={h.id} onClick={() => setSelectedHire(h.id)} className={\`bg-white rounded-lg shadow p-4 cursor-pointer border-2 transition-colors \${selectedHire === h.id ? "border-blue-500" : "border-transparent hover:border-gray-300"}\`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">{h.avatar}</div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">{h.name}</p>
                    <p className="text-xs text-gray-500">{h.position}</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={\`h-2 rounded-full transition-all \${prog === 100 ? "bg-green-500" : "bg-blue-500"}\`} style={{ width: \`\${prog}%\` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{prog}% 完成</p>
              </div>
            );
          })}
        </div>

        {/* 任務清單 */}
        {currentHire && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{currentHire.name} 的到職任務</h2>
                <p className="text-sm text-gray-500">{currentHire.department} ・ {currentHire.position} ・ 到職日 {currentHire.startDate}</p>
              </div>
              <span className={\`px-3 py-1 rounded-full text-sm font-medium \${getProgress(currentHire.id) === 100 ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}\`}>
                {getProgress(currentHire.id) === 100 ? "已完成" : "進行中"}
              </span>
            </div>
            <div className="space-y-2">
              {defaultTasks.map((t) => (
                <label key={t.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={!!tasks[currentHire.id]?.[t.id]} onChange={() => toggleTask(currentHire.id, t.id)} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                  <span className={\`text-sm flex-1 \${tasks[currentHire.id]?.[t.id] ? "line-through text-gray-400" : "text-gray-700"}\`}>{t.label}</span>
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">{t.category}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}`;
