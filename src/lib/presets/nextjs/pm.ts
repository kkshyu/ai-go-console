export const PM_TASK_BOARD_PAGE = `"use client";
import { useState } from "react";

const priorityMap: Record<string, { label: string; color: string }> = {
  high: { label: "高", color: "bg-red-100 text-red-800" },
  medium: { label: "中", color: "bg-yellow-100 text-yellow-800" },
  low: { label: "低", color: "bg-green-100 text-green-800" },
};

const initialTasks = [
  { id: 1, title: "設計首頁原型", assignee: "林小美", priority: "high", column: "todo" },
  { id: 2, title: "API 登入功能開發", assignee: "陳大文", priority: "high", column: "in-progress" },
  { id: 3, title: "撰寫測試案例", assignee: "王志明", priority: "medium", column: "todo" },
  { id: 4, title: "資料庫 Schema 設計", assignee: "張雅婷", priority: "medium", column: "done" },
  { id: 5, title: "部署 CI/CD 流程", assignee: "李建宏", priority: "low", column: "in-progress" },
  { id: 6, title: "使用者權限模組", assignee: "陳大文", priority: "high", column: "todo" },
  { id: 7, title: "效能優化報告", assignee: "林小美", priority: "medium", column: "done" },
  { id: 8, title: "整合第三方支付", assignee: "王志明", priority: "high", column: "in-progress" },
];

const columns = [
  { id: "todo", label: "待辦", color: "bg-gray-500" },
  { id: "in-progress", label: "進行中", color: "bg-blue-500" },
  { id: "done", label: "已完成", color: "bg-green-500" },
];

export default function Home() {
  const [tasks, setTasks] = useState(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", assignee: "", priority: "medium" });

  const moveTask = (taskId: number, direction: "left" | "right") => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const colIndex = columns.findIndex((c) => c.id === t.column);
        const newIndex = direction === "right" ? Math.min(colIndex + 1, columns.length - 1) : Math.max(colIndex - 1, 0);
        return { ...t, column: columns[newIndex].id };
      })
    );
  };

  const handleAdd = () => {
    if (!form.title || !form.assignee) return;
    setTasks([...tasks, { id: tasks.length + 1, title: form.title, assignee: form.assignee, priority: form.priority, column: "todo" }]);
    setForm({ title: "", assignee: "", priority: "medium" });
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">任務看板</h1>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">＋ 新增任務</button>
        </div>

        {/* 新增表單 */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h3 className="font-semibold mb-3">新增任務</h3>
            <div className="grid grid-cols-3 gap-3">
              <input placeholder="任務名稱" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="負責人" value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                <option value="high">高優先</option><option value="medium">中優先</option><option value="low">低優先</option>
              </select>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleAdd} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">建立</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">取消</button>
            </div>
          </div>
        )}

        {/* 看板 */}
        <div className="grid grid-cols-3 gap-6">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.column === col.id);
            return (
              <div key={col.id} className="bg-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className={\`w-3 h-3 rounded-full \${col.color}\`} />
                  <h2 className="font-semibold text-gray-700">{col.label}</h2>
                  <span className="ml-auto bg-gray-300 text-gray-600 text-xs px-2 py-0.5 rounded-full">{colTasks.length}</span>
                </div>
                <div className="space-y-3">
                  {colTasks.map((t) => (
                    <div key={t.id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                      <p className="text-sm font-medium text-gray-900 mb-2">{t.title}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">{t.assignee[0]}</div>
                          <span className="text-xs text-gray-500">{t.assignee}</span>
                        </div>
                        <span className={\`px-2 py-0.5 rounded-full text-xs font-medium \${priorityMap[t.priority].color}\`}>{priorityMap[t.priority].label}</span>
                      </div>
                      <div className="flex gap-1 mt-3">
                        {col.id !== "todo" && (
                          <button onClick={() => moveTask(t.id, "left")} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">← 移回</button>
                        )}
                        {col.id !== "done" && (
                          <button onClick={() => moveTask(t.id, "right")} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">推進 →</button>
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
}`;

export const PM_MEETING_NOTES_PAGE = `"use client";
import { useState } from "react";

const initialNotes = [
  { id: 1, title: "Q2 產品規劃會議", date: "2024-03-25", attendees: ["林小美", "陳大文", "王志明"], summary: "討論 Q2 功能路線圖，確認三大重點項目", actionItems: ["完成需求文件", "排定開發排程", "確認設計資源"], tags: ["產品", "規劃"] },
  { id: 2, title: "每週站立會議", date: "2024-03-22", attendees: ["全體研發"], summary: "各組進度回報，無重大阻塞點", actionItems: ["持續追蹤效能問題", "更新看板狀態"], tags: ["例行", "研發"] },
  { id: 3, title: "客戶需求訪談 - A公司", date: "2024-03-20", attendees: ["張雅婷", "李建宏"], summary: "了解 A 公司自動化流程需求，評估開發可行性", actionItems: ["撰寫需求規格", "估算開發工時", "回覆報價"], tags: ["客戶", "需求"] },
  { id: 4, title: "技術架構評審", date: "2024-03-18", attendees: ["陳大文", "王志明", "李建宏"], summary: "評估微服務架構遷移方案，決定分階段進行", actionItems: ["製作架構圖", "POC 驗證"], tags: ["技術", "架構"] },
  { id: 5, title: "設計審查會議", date: "2024-03-15", attendees: ["林小美", "張雅婷"], summary: "審查新版儀表板設計稿，提出修改建議", actionItems: ["修改配色方案", "調整表格排版", "新增篩選功能"], tags: ["設計", "UI"] },
  { id: 6, title: "專案回顧會議", date: "2024-03-12", attendees: ["全體專案成員"], summary: "回顧上月專案執行狀況，討論改善方案", actionItems: ["建立 code review 流程", "改善部署自動化"], tags: ["回顧", "流程"] },
];

export default function Home() {
  const [notes, setNotes] = useState(initialNotes);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", attendees: "", summary: "", actionItems: "", tags: "" });

  const filtered = notes.filter((n) =>
    n.title.includes(search) || n.summary.includes(search) || n.tags.some((t) => t.includes(search))
  );

  const handleAdd = () => {
    if (!form.title || !form.summary) return;
    setNotes([{
      id: notes.length + 1,
      title: form.title,
      date: new Date().toISOString().split("T")[0],
      attendees: form.attendees.split("、").filter(Boolean),
      summary: form.summary,
      actionItems: form.actionItems.split("、").filter(Boolean),
      tags: form.tags.split("、").filter(Boolean),
    }, ...notes]);
    setForm({ title: "", attendees: "", summary: "", actionItems: "", tags: "" });
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">會議記錄</h1>

        {/* 搜尋與新增 */}
        <div className="flex items-center gap-3 mb-4">
          <input placeholder="搜尋會議記錄..." value={search} onChange={(e) => setSearch(e.target.value)} className="border rounded-lg px-3 py-2 text-sm flex-1" />
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap">＋ 新增記錄</button>
        </div>

        {/* 新增表單 */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h3 className="font-semibold mb-3">新增會議記錄</h3>
            <div className="space-y-3">
              <input placeholder="會議標題" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="參與者（以「、」分隔）" value={form.attendees} onChange={(e) => setForm({ ...form, attendees: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <textarea placeholder="會議摘要" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} />
              <input placeholder="待辦事項（以「、」分隔）" value={form.actionItems} onChange={(e) => setForm({ ...form, actionItems: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="標籤（以「、」分隔）" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleAdd} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">儲存</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">取消</button>
            </div>
          </div>
        )}

        {/* 記錄列表 */}
        <div className="space-y-3">
          {filtered.map((n) => (
            <div key={n.id} className="bg-white rounded-lg shadow">
              <div className="p-4 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedId(expandedId === n.id ? null : n.id)}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{n.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{n.date} ・ {n.attendees.join("、")}</p>
                  </div>
                  <div className="flex gap-1">
                    {n.tags.map((t) => <span key={t} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs">{t}</span>)}
                  </div>
                </div>
              </div>
              {expandedId === n.id && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  <p className="text-sm text-gray-700 mb-3">{n.summary}</p>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">待辦事項</h4>
                  <ul className="space-y-1">
                    {n.actionItems.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}`;
