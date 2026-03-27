export const MARKETING_CAMPAIGN_PAGE = `"use client";
import { useState } from "react";

const initialCampaigns = [
  { id: 1, name: "春季促銷活動", channel: "Facebook", budget: 50000, spent: 32000, roi: 2.8, startDate: "2024-03-01", endDate: "2024-03-31", status: "active" },
  { id: 2, name: "新品上市推廣", channel: "Google Ads", budget: 80000, spent: 45000, roi: 3.2, startDate: "2024-03-15", endDate: "2024-04-15", status: "active" },
  { id: 3, name: "會員日特惠", channel: "LINE", budget: 30000, spent: 30000, roi: 4.1, startDate: "2024-02-14", endDate: "2024-02-28", status: "completed" },
  { id: 4, name: "品牌形象影片", channel: "YouTube", budget: 120000, spent: 15000, roi: 0, startDate: "2024-04-01", endDate: "2024-04-30", status: "draft" },
  { id: 5, name: "母親節檔期", channel: "Instagram", budget: 60000, spent: 0, roi: 0, startDate: "2024-05-01", endDate: "2024-05-12", status: "draft" },
  { id: 6, name: "年度品牌聯名", channel: "多渠道", budget: 200000, spent: 180000, roi: 5.3, startDate: "2024-01-01", endDate: "2024-02-28", status: "completed" },
];

const statusMap: Record<string, { label: string; color: string }> = {
  active: { label: "進行中", color: "bg-green-100 text-green-800" },
  completed: { label: "已結束", color: "bg-gray-100 text-gray-800" },
  draft: { label: "草稿", color: "bg-yellow-100 text-yellow-800" },
};

export default function Home() {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", channel: "", budget: "", startDate: "", endDate: "" });

  const filtered = filterStatus === "all" ? campaigns : campaigns.filter((c) => c.status === filterStatus);

  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);
  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
  const avgRoi = campaigns.filter((c) => c.roi > 0).reduce((s, c, _, a) => s + c.roi / a.length, 0);

  const handleAdd = () => {
    if (!form.name || !form.channel || !form.budget) return;
    setCampaigns([...campaigns, { id: campaigns.length + 1, name: form.name, channel: form.channel, budget: Number(form.budget), spent: 0, roi: 0, startDate: form.startDate, endDate: form.endDate, status: "draft" }]);
    setForm({ name: "", channel: "", budget: "", startDate: "", endDate: "" });
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">行銷活動管理</h1>

        {/* 統計卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">總預算</p>
            <p className="text-2xl font-bold text-gray-900">NT$ {totalBudget.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">已花費 NT$ {totalSpent.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">進行中活動</p>
            <p className="text-2xl font-bold text-green-600">{campaigns.filter((c) => c.status === "active").length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">平均 ROI</p>
            <p className="text-2xl font-bold text-blue-600">{avgRoi.toFixed(1)}x</p>
          </div>
        </div>

        {/* 工具列 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {["all", "active", "completed", "draft"].map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)} className={\`px-3 py-1 rounded-full text-sm \${filterStatus === s ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}\`}>
                {s === "all" ? "全部" : statusMap[s].label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">＋ 新增活動</button>
        </div>

        {/* 新增表單 */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h3 className="font-semibold mb-3">新增行銷活動</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <input placeholder="活動名稱" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="投放渠道" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="預算" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleAdd} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">建立活動</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">取消</button>
            </div>
          </div>
        )}

        {/* 活動列表 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">活動名稱</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">渠道</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">預算</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">已花費</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ROI</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">期間</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.channel}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">NT$ {c.budget.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">NT$ {c.spent.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.roi > 0 ? c.roi + "x" : "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.startDate} ~ {c.endDate}</td>
                  <td className="px-4 py-3"><span className={\`px-2 py-1 rounded-full text-xs font-medium \${statusMap[c.status].color}\`}>{statusMap[c.status].label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}`;

export const MARKETING_CONTENT_CALENDAR_PAGE = `"use client";
import { useState } from "react";

const platforms = ["Facebook", "Instagram", "LINE", "YouTube", "Blog"];
const platformColors: Record<string, string> = {
  Facebook: "bg-blue-100 text-blue-800",
  Instagram: "bg-pink-100 text-pink-800",
  LINE: "bg-green-100 text-green-800",
  YouTube: "bg-red-100 text-red-800",
  Blog: "bg-purple-100 text-purple-800",
};

const initialContents = [
  { id: 1, title: "春季新品貼文", platform: "Facebook", day: 1, time: "10:00", status: "published" },
  { id: 2, title: "品牌故事短影音", platform: "Instagram", day: 1, time: "14:00", status: "scheduled" },
  { id: 3, title: "會員限定優惠推播", platform: "LINE", day: 2, time: "09:00", status: "scheduled" },
  { id: 4, title: "產品開箱影片", platform: "YouTube", day: 3, time: "12:00", status: "draft" },
  { id: 5, title: "產業趨勢分析文", platform: "Blog", day: 4, time: "08:00", status: "draft" },
  { id: 6, title: "客戶見證圖文", platform: "Facebook", day: 5, time: "11:00", status: "scheduled" },
  { id: 7, title: "幕後花絮限動", platform: "Instagram", day: 5, time: "16:00", status: "published" },
  { id: 8, title: "每週電子報", platform: "LINE", day: 7, time: "10:00", status: "scheduled" },
];

const dayLabels = ["一", "二", "三", "四", "五", "六", "日"];

const statusMap: Record<string, { label: string; color: string }> = {
  published: { label: "已發佈", color: "bg-green-100 text-green-800" },
  scheduled: { label: "已排程", color: "bg-blue-100 text-blue-800" },
  draft: { label: "草稿", color: "bg-yellow-100 text-yellow-800" },
};

export default function Home() {
  const [contents, setContents] = useState(initialContents);
  const [showForm, setShowForm] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [form, setForm] = useState({ title: "", platform: "Facebook", day: "1", time: "10:00" });

  const filtered = filterPlatform === "all" ? contents : contents.filter((c) => c.platform === filterPlatform);

  const handleAdd = () => {
    if (!form.title) return;
    setContents([...contents, { id: contents.length + 1, title: form.title, platform: form.platform, day: Number(form.day), time: form.time, status: "draft" }]);
    setForm({ title: "", platform: "Facebook", day: "1", time: "10:00" });
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">內容行事曆</h1>

        {/* 平台篩選 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilterPlatform("all")} className={\`px-3 py-1 rounded-full text-sm \${filterPlatform === "all" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}\`}>全部</button>
            {platforms.map((p) => (
              <button key={p} onClick={() => setFilterPlatform(p)} className={\`px-3 py-1 rounded-full text-sm \${filterPlatform === p ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}\`}>{p}</button>
            ))}
          </div>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">＋ 新增內容</button>
        </div>

        {/* 新增表單 */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h3 className="font-semibold mb-3">新增內容</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input placeholder="內容標題" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                {dayLabels.map((d, i) => <option key={i} value={i + 1}>週{d}</option>)}
              </select>
              <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleAdd} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">新增</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">取消</button>
            </div>
          </div>
        )}

        {/* 週曆表格 */}
        <div className="grid grid-cols-7 gap-3">
          {dayLabels.map((d, i) => {
            const dayContents = filtered.filter((c) => c.day === i + 1);
            return (
              <div key={i} className="bg-white rounded-lg shadow min-h-[200px]">
                <div className="bg-gray-50 px-3 py-2 rounded-t-lg border-b">
                  <p className="text-sm font-semibold text-gray-700 text-center">週{d}</p>
                </div>
                <div className="p-2 space-y-2">
                  {dayContents.map((c) => (
                    <div key={c.id} className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                      <p className="text-xs font-medium text-gray-900 truncate">{c.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className={\`px-1.5 py-0.5 rounded text-xs \${platformColors[c.platform]}\`}>{c.platform}</span>
                        <span className="text-xs text-gray-400">{c.time}</span>
                      </div>
                      <span className={\`mt-1 inline-block px-1.5 py-0.5 rounded text-xs \${statusMap[c.status].color}\`}>{statusMap[c.status].label}</span>
                    </div>
                  ))}
                  {dayContents.length === 0 && <p className="text-xs text-gray-300 text-center py-4">無內容</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}`;
