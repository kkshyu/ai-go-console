import type { PresetOverlay } from "../index";

/* ===== src/lib/types.ts ===== */
const TYPES_FILE = `export type TaskStatus = "todo" | "in_progress" | "review" | "done";

export type Priority = "high" | "medium" | "low";

export type ProjectStatus = "active" | "completed" | "on_hold";

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  assignee: string;
  assigneeId: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  startDate: string;
  description: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  owner: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  progress: number;
  color: string;
}
`;

/* ===== src/lib/mock-data.ts ===== */
const MOCK_DATA_FILE = `import type { Project, Task, TeamMember } from "./types";

export const teamMembers: TeamMember[] = [
  { id: "M1", name: "陳志明", role: "技術主管", avatar: "CM" },
  { id: "M2", name: "林美玲", role: "產品經理", avatar: "ML" },
  { id: "M3", name: "王建宏", role: "前端工程師", avatar: "JH" },
  { id: "M4", name: "張雅婷", role: "後端工程師", avatar: "YT" },
  { id: "M5", name: "李國豪", role: "UI 設計師", avatar: "GH" },
  { id: "M6", name: "黃淑芬", role: "QA 工程師", avatar: "SF" },
];

export const projects: Project[] = [
  { id: "P1", name: "電商平台改版", description: "前台購物流程與後台管理系統全面改版升級", owner: "林美玲", status: "active", startDate: "2024-01-15", endDate: "2024-06-30", progress: 62, color: "#3b82f6" },
  { id: "P2", name: "行動 App 開發", description: "iOS 與 Android 原生應用程式開發", owner: "陳志明", status: "active", startDate: "2024-02-01", endDate: "2024-08-31", progress: 35, color: "#10b981" },
  { id: "P3", name: "內部 CRM 系統", description: "客戶關係管理系統建置", owner: "林美玲", status: "on_hold", startDate: "2024-03-01", endDate: "2024-09-30", progress: 15, color: "#f59e0b" },
  { id: "P4", name: "資料倉儲建置", description: "建立企業級資料倉儲與 BI 報表系統", owner: "陳志明", status: "completed", startDate: "2023-10-01", endDate: "2024-03-15", progress: 100, color: "#8b5cf6" },
];

export const tasks: Task[] = [
  // P1 - 電商平台改版
  { id: "T01", projectId: "P1", title: "首頁 UI 重新設計", assignee: "李國豪", assigneeId: "M5", priority: "high", status: "done", dueDate: "2024-02-28", startDate: "2024-01-15", description: "重新設計首頁視覺與互動體驗" },
  { id: "T02", projectId: "P1", title: "商品列表頁開發", assignee: "王建宏", assigneeId: "M3", priority: "high", status: "done", dueDate: "2024-03-15", startDate: "2024-02-01", description: "實作商品列表篩選與排序功能" },
  { id: "T03", projectId: "P1", title: "購物車功能重構", assignee: "張雅婷", assigneeId: "M4", priority: "high", status: "in_progress", dueDate: "2024-04-10", startDate: "2024-03-01", description: "購物車 API 與前端整合重構" },
  { id: "T04", projectId: "P1", title: "結帳流程優化", assignee: "王建宏", assigneeId: "M3", priority: "medium", status: "in_progress", dueDate: "2024-04-30", startDate: "2024-03-15", description: "簡化結帳步驟，提升轉換率" },
  { id: "T05", projectId: "P1", title: "後台訂單管理", assignee: "張雅婷", assigneeId: "M4", priority: "medium", status: "todo", dueDate: "2024-05-15", startDate: "2024-04-15", description: "訂單管理後台介面與 API" },
  { id: "T06", projectId: "P1", title: "金流串接測試", assignee: "黃淑芬", assigneeId: "M6", priority: "high", status: "review", dueDate: "2024-04-20", startDate: "2024-03-20", description: "串接藍新金流並完成測試" },
  // P2 - 行動 App
  { id: "T07", projectId: "P2", title: "App 架構設計", assignee: "陳志明", assigneeId: "M1", priority: "high", status: "done", dueDate: "2024-02-28", startDate: "2024-02-01", description: "確定技術架構與開發框架" },
  { id: "T08", projectId: "P2", title: "使用者認證模組", assignee: "張雅婷", assigneeId: "M4", priority: "high", status: "in_progress", dueDate: "2024-04-15", startDate: "2024-03-01", description: "實作 OAuth 登入與 JWT 認證" },
  { id: "T09", projectId: "P2", title: "推播通知系統", assignee: "王建宏", assigneeId: "M3", priority: "medium", status: "todo", dueDate: "2024-05-30", startDate: "2024-04-20", description: "Firebase FCM 推播整合" },
  { id: "T10", projectId: "P2", title: "離線模式支援", assignee: "陳志明", assigneeId: "M1", priority: "low", status: "todo", dueDate: "2024-07-15", startDate: "2024-06-01", description: "實作離線資料快取與同步" },
  { id: "T11", projectId: "P2", title: "App UI 設計", assignee: "李國豪", assigneeId: "M5", priority: "high", status: "review", dueDate: "2024-03-30", startDate: "2024-02-15", description: "完成所有頁面 UI 設計稿" },
  // P3 - CRM
  { id: "T12", projectId: "P3", title: "需求訪談與規劃", assignee: "林美玲", assigneeId: "M2", priority: "high", status: "done", dueDate: "2024-03-31", startDate: "2024-03-01", description: "與業務部門進行需求訪談" },
  { id: "T13", projectId: "P3", title: "資料庫設計", assignee: "張雅婷", assigneeId: "M4", priority: "high", status: "todo", dueDate: "2024-05-15", startDate: "2024-04-15", description: "CRM 資料庫 schema 設計" },
  { id: "T14", projectId: "P3", title: "客戶管理模組", assignee: "王建宏", assigneeId: "M3", priority: "medium", status: "todo", dueDate: "2024-06-30", startDate: "2024-05-20", description: "客戶 CRUD 與搜尋功能" },
  // P4 - 資料倉儲
  { id: "T15", projectId: "P4", title: "ETL Pipeline 建置", assignee: "陳志明", assigneeId: "M1", priority: "high", status: "done", dueDate: "2024-01-31", startDate: "2023-10-15", description: "建立 ETL 資料管線" },
  { id: "T16", projectId: "P4", title: "BI 報表開發", assignee: "張雅婷", assigneeId: "M4", priority: "high", status: "done", dueDate: "2024-02-28", startDate: "2024-01-15", description: "開發營運關鍵報表" },
  { id: "T17", projectId: "P4", title: "資料品質驗證", assignee: "黃淑芬", assigneeId: "M6", priority: "medium", status: "done", dueDate: "2024-03-10", startDate: "2024-02-15", description: "驗證資料完整性與正確性" },
  { id: "T18", projectId: "P4", title: "使用者教育訓練", assignee: "林美玲", assigneeId: "M2", priority: "low", status: "done", dueDate: "2024-03-15", startDate: "2024-03-01", description: "舉辦 BI 系統教育訓練" },
  // Additional tasks
  { id: "T19", projectId: "P1", title: "SEO 優化", assignee: "林美玲", assigneeId: "M2", priority: "low", status: "todo", dueDate: "2024-06-15", startDate: "2024-05-20", description: "電商平台 SEO 優化" },
  { id: "T20", projectId: "P2", title: "App Store 上架準備", assignee: "李國豪", assigneeId: "M5", priority: "medium", status: "todo", dueDate: "2024-08-15", startDate: "2024-07-20", description: "準備上架截圖與說明文案" },
  { id: "T21", projectId: "P1", title: "效能優化", assignee: "陳志明", assigneeId: "M1", priority: "medium", status: "review", dueDate: "2024-04-25", startDate: "2024-04-01", description: "頁面載入速度與 API 效能優化" },
];

export function getProjectTasks(projectId: string): Task[] {
  return tasks.filter((t) => t.projectId === projectId);
}

export function getProjectById(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}
`;

/* ===== src/app/page.tsx — Dashboard ===== */
const PAGE_DASHBOARD = `"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { projects, tasks, teamMembers } from "@/lib/mock-data";

const statusColors = {
  active: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  on_hold: "bg-yellow-100 text-yellow-800",
};

const statusLabels = {
  active: "進行中",
  completed: "已完成",
  on_hold: "暫停中",
};

const completionData = [
  { name: "已完成", value: tasks.filter((t) => t.status === "done").length, color: "#10b981" },
  { name: "進行中", value: tasks.filter((t) => t.status === "in_progress").length, color: "#3b82f6" },
  { name: "審核中", value: tasks.filter((t) => t.status === "review").length, color: "#f59e0b" },
  { name: "待辦", value: tasks.filter((t) => t.status === "todo").length, color: "#6b7280" },
];

const workloadData = teamMembers.map((m) => ({
  name: m.name,
  tasks: tasks.filter((t) => t.assigneeId === m.id && t.status !== "done").length,
}));

export default function Home() {
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const overdueTasks = tasks.filter((t) => t.status !== "done" && new Date(t.dueDate) < new Date()).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">專案管理儀表板</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">進行中專案</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{activeProjects}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">逾期任務</p>
            <p className="text-3xl font-bold text-red-500 mt-1">{overdueTasks}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">總任務數</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{tasks.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">團隊成員</p>
            <p className="text-3xl font-bold text-purple-600 mt-1">{teamMembers.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Completion Rate Pie */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">任務完成分佈</h2>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={completionData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => \`\${name} \${value}\`}>
                  {completionData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Team Workload Bar */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">團隊工作量</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={workloadData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="tasks" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project List Quick View */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">專案概覽</h2>
          <div className="space-y-4">
            {projects.map((p) => (
              <div key={p.id} className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">{p.name}</p>
                    <span className={\`px-2 py-0.5 rounded-full text-xs shrink-0 \${statusColors[p.status]}\`}>{statusLabels[p.status]}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 rounded-full h-2 transition-all" style={{ width: \`\${p.progress}%\` }} />
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">{p.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
`;

/* ===== src/app/projects/page.tsx ===== */
const PAGE_PROJECTS = `"use client";
import { useState } from "react";
import Link from "next/link";
import { projects, tasks } from "@/lib/mock-data";
import type { ProjectStatus } from "@/lib/types";

const statusColors: Record<ProjectStatus, string> = {
  active: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  on_hold: "bg-yellow-100 text-yellow-800",
};

const statusLabels: Record<ProjectStatus, string> = {
  active: "進行中",
  completed: "已完成",
  on_hold: "暫停中",
};

export default function ProjectsPage() {
  const [filter, setFilter] = useState<ProjectStatus | "all">("all");

  const filtered = filter === "all" ? projects : projects.filter((p) => p.status === filter);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">專案列表</h1>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {(["all", "active", "completed", "on_hold"] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={\`px-4 py-2 rounded-lg text-sm font-medium \${filter === s ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100 shadow-sm"}\`}>
              {s === "all" ? "全部" : statusLabels[s]}
            </button>
          ))}
        </div>

        {/* Project Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((p) => {
            const projectTasks = tasks.filter((t) => t.projectId === p.id);
            const doneTasks = projectTasks.filter((t) => t.status === "done").length;
            return (
              <Link key={p.id} href={\`/projects/\${p.id}\`} className="block">
                <div className="bg-white rounded-xl shadow hover:shadow-md transition-shadow p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{p.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{p.description}</p>
                    </div>
                    <span className={\`px-2 py-0.5 rounded-full text-xs shrink-0 \${statusColors[p.status]}\`}>{statusLabels[p.status]}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="rounded-full h-2 transition-all" style={{ width: \`\${p.progress}%\`, backgroundColor: p.color }} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{p.progress}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>負責人：{p.owner}</span>
                    <span>{p.startDate} ~ {p.endDate}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">任務 {doneTasks}/{projectTasks.length} 完成</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
`;

/* ===== src/app/projects/[id]/page.tsx — Kanban Board ===== */
const PAGE_KANBAN = `"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getProjectById, getProjectTasks } from "@/lib/mock-data";
import type { Task, TaskStatus, Priority } from "@/lib/types";

const columns: { key: TaskStatus; label: string; color: string }[] = [
  { key: "todo", label: "待辦", color: "border-gray-300" },
  { key: "in_progress", label: "進行中", color: "border-blue-400" },
  { key: "review", label: "審核中", color: "border-yellow-400" },
  { key: "done", label: "已完成", color: "border-green-400" },
];

const priorityColors: Record<Priority, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

const priorityLabels: Record<Priority, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export default function KanbanPage() {
  const params = useParams();
  const projectId = params.id as string;
  const project = getProjectById(projectId);
  const initialTasks = getProjectTasks(projectId);
  const [taskList, setTaskList] = useState<Task[]>(initialTasks);

  const moveTask = (taskId: string, newStatus: TaskStatus) => {
    setTaskList((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">找不到此專案</p>
          <Link href="/projects" className="text-blue-600 hover:underline">返回專案列表</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/projects" className="text-gray-400 hover:text-gray-600">&larr;</Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-sm text-gray-500">{project.description}</p>
          </div>
        </div>

        {/* Kanban Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((col) => {
            const colTasks = taskList.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className={\`bg-gray-100 rounded-xl p-4 border-t-4 \${col.color}\`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700">{col.label}</h3>
                  <span className="bg-gray-200 text-gray-600 text-xs rounded-full px-2 py-0.5">{colTasks.length}</span>
                </div>
                <div className="space-y-3">
                  {colTasks.map((task) => (
                    <div key={task.id} className="bg-white rounded-lg shadow-sm p-4 hover:shadow transition-shadow">
                      <h4 className="font-medium text-gray-900 text-sm mb-2">{task.title}</h4>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={\`px-1.5 py-0.5 rounded text-[10px] font-medium \${priorityColors[task.priority]}\`}>{priorityLabels[task.priority]}</span>
                        <span className="text-xs text-gray-400">{task.dueDate}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{task.assignee}</span>
                        <div className="flex gap-1">
                          {columns.filter((c) => c.key !== col.key).map((c) => (
                            <button key={c.key} onClick={() => moveTask(task.id, c.key)} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 hover:bg-gray-200" title={\`移至\${c.label}\`}>
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  {colTasks.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-4">無任務</p>
                  )}
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

/* ===== src/app/timeline/page.tsx — Gantt-style Timeline ===== */
const PAGE_TIMELINE = `"use client";
import { useMemo } from "react";
import { projects, tasks } from "@/lib/mock-data";
import { format, differenceInDays, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { zhTW } from "date-fns/locale";

interface TimelineItem {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  color: string;
  isProject: boolean;
}

export default function TimelinePage() {
  const items = useMemo<TimelineItem[]>(() => {
    const result: TimelineItem[] = [];
    projects.forEach((p) => {
      result.push({ id: p.id, label: p.name, startDate: p.startDate, endDate: p.endDate, color: p.color, isProject: true });
      tasks
        .filter((t) => t.projectId === p.id)
        .forEach((t) => {
          result.push({ id: t.id, label: t.title, startDate: t.startDate, endDate: t.dueDate, color: p.color, isProject: false });
        });
    });
    return result;
  }, []);

  const allDates = items.flatMap((i) => [parseISO(i.startDate), parseISO(i.endDate)]);
  const minDate = startOfMonth(new Date(Math.min(...allDates.map((d) => d.getTime()))));
  const maxDate = endOfMonth(new Date(Math.max(...allDates.map((d) => d.getTime()))));
  const totalDays = differenceInDays(maxDate, minDate) + 1;
  const months = eachMonthOfInterval({ start: minDate, end: maxDate });

  const today = new Date();
  const todayOffset = differenceInDays(today, minDate);
  const todayPercent = (todayOffset / totalDays) * 100;

  function getBarStyle(start: string, end: string) {
    const s = differenceInDays(parseISO(start), minDate);
    const e = differenceInDays(parseISO(end), minDate);
    const left = (s / totalDays) * 100;
    const width = ((e - s + 1) / totalDays) * 100;
    return { left: \`\${left}%\`, width: \`\${Math.max(width, 0.5)}%\` };
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1400px] mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">專案時間軸</h1>

        <div className="bg-white rounded-xl shadow overflow-x-auto">
          {/* Month Headers */}
          <div className="flex border-b sticky top-0 bg-white z-10" style={{ marginLeft: "240px" }}>
            {months.map((m) => {
              const mStart = differenceInDays(m, minDate);
              const mEnd = differenceInDays(endOfMonth(m), minDate);
              const width = ((mEnd - mStart + 1) / totalDays) * 100;
              return (
                <div key={m.toISOString()} className="text-xs text-gray-500 text-center py-2 border-r shrink-0" style={{ width: \`\${width}%\` }}>
                  {format(m, "yyyy MMM", { locale: zhTW })}
                </div>
              );
            })}
          </div>

          {/* Rows */}
          <div className="relative">
            {/* Today line */}
            {todayPercent >= 0 && todayPercent <= 100 && (
              <div className="absolute top-0 bottom-0 w-px bg-red-400 z-10" style={{ left: \`calc(240px + \${todayPercent}% * (100% - 240px) / 100%)\` }}>
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-red-500 whitespace-nowrap">今天</span>
              </div>
            )}

            {items.map((item) => {
              const barStyle = getBarStyle(item.startDate, item.endDate);
              return (
                <div key={item.id} className={\`flex items-center border-b hover:bg-gray-50 \${item.isProject ? "bg-gray-50" : ""}\`} style={{ height: "40px" }}>
                  <div className={\`w-[240px] shrink-0 px-4 text-sm truncate \${item.isProject ? "font-semibold text-gray-900" : "pl-8 text-gray-600"}\`}>
                    {item.label}
                  </div>
                  <div className="flex-1 relative h-full">
                    <div
                      className={\`absolute top-1/2 -translate-y-1/2 rounded \${item.isProject ? "h-3" : "h-2"}\`}
                      style={{ ...barStyle, backgroundColor: item.color, opacity: item.isProject ? 1 : 0.6 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
`;

export const INTERNAL_PROJECT: PresetOverlay = {
  templateId: "internal",
  files: [
    { path: "src/lib/types.ts", content: TYPES_FILE },
    { path: "src/lib/mock-data.ts", content: MOCK_DATA_FILE },
    { path: "src/app/page.tsx", content: PAGE_DASHBOARD },
    { path: "src/app/projects/page.tsx", content: PAGE_PROJECTS },
    { path: "src/app/projects/[id]/page.tsx", content: PAGE_KANBAN },
    { path: "src/app/timeline/page.tsx", content: PAGE_TIMELINE },
  ],
  requiredServices: [
    { category: "database", suggestedTypes: ["built_in_supabase", "postgresql"], purpose: "儲存專案資料" },
  ],
};
