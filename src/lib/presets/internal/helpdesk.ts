import type { PresetOverlay } from "../index";

/* ===== src/lib/types.ts ===== */
const TYPES_FILE = `export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export type TicketPriority = "urgent" | "high" | "medium" | "low";

export type TicketCategory = "帳號問題" | "系統故障" | "功能需求" | "硬體設備" | "網路問題";

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignee: string;
  reporter: string;
  createdAt: string;
  slaDeadline: string;
  resolvedAt?: string;
}

export interface Comment {
  id: string;
  ticketId: string;
  author: string;
  content: string;
  isAgent: boolean;
  createdAt: string;
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: TicketCategory;
  helpfulCount: number;
  createdAt: string;
}
`;

/* ===== src/lib/mock-data.ts ===== */
const MOCK_DATA_FILE = `import type { Ticket, Comment, Article, TicketCategory } from "./types";

export const categories: TicketCategory[] = ["帳號問題", "系統故障", "功能需求", "硬體設備", "網路問題"];

export const tickets: Ticket[] = [
  { id: "TK-001", title: "無法登入公司信箱", description: "輸入正確密碼後仍顯示登入失敗", category: "帳號問題", priority: "urgent", status: "open", assignee: "IT 支援-小王", reporter: "陳志明", createdAt: "2024-03-25 09:15", slaDeadline: "2024-03-25 13:15" },
  { id: "TK-002", title: "ERP 系統報表匯出錯誤", description: "匯出 Excel 檔案時出現亂碼", category: "系統故障", priority: "high", status: "in_progress", assignee: "IT 支援-小李", reporter: "黃淑芬", createdAt: "2024-03-25 10:30", slaDeadline: "2024-03-26 10:30" },
  { id: "TK-003", title: "希望新增批次匯入功能", description: "目前只能逐筆輸入客戶資料，希望支援 CSV 批次匯入", category: "功能需求", priority: "medium", status: "open", assignee: "IT 支援-小王", reporter: "王建宏", createdAt: "2024-03-24 14:20", slaDeadline: "2024-03-29 14:20" },
  { id: "TK-004", title: "印表機卡紙頻繁", description: "3F 影印室印表機經常卡紙，已嘗試清理仍無改善", category: "硬體設備", priority: "low", status: "resolved", assignee: "IT 支援-小陳", reporter: "張雅婷", createdAt: "2024-03-22 11:00", slaDeadline: "2024-03-27 11:00", resolvedAt: "2024-03-24 15:30" },
  { id: "TK-005", title: "VPN 連線不穩定", description: "遠端連線時經常斷線，影響在家工作效率", category: "網路問題", priority: "high", status: "in_progress", assignee: "IT 支援-小李", reporter: "李國豪", createdAt: "2024-03-25 08:45", slaDeadline: "2024-03-26 08:45" },
  { id: "TK-006", title: "新進人員帳號申請", description: "業務部新進人員需要開通 ERP、信箱及 VPN 帳號", category: "帳號問題", priority: "medium", status: "open", assignee: "IT 支援-小王", reporter: "許雅惠", createdAt: "2024-03-25 11:00", slaDeadline: "2024-03-27 11:00" },
  { id: "TK-007", title: "監控系統告警誤報", description: "伺服器監控系統持續發出磁碟空間不足告警，但實際空間充足", category: "系統故障", priority: "urgent", status: "in_progress", assignee: "IT 支援-小陳", reporter: "吳宗翰", createdAt: "2024-03-25 07:30", slaDeadline: "2024-03-25 11:30" },
  { id: "TK-008", title: "會議室投影設備故障", description: "5F 大會議室投影機無法偵測筆電訊號", category: "硬體設備", priority: "medium", status: "resolved", assignee: "IT 支援-小陳", reporter: "林美玲", createdAt: "2024-03-23 09:00", slaDeadline: "2024-03-28 09:00", resolvedAt: "2024-03-23 16:00" },
  { id: "TK-009", title: "Wi-Fi 訊號不良", description: "2F 休息區 Wi-Fi 訊號非常弱，幾乎無法連線", category: "網路問題", priority: "low", status: "closed", assignee: "IT 支援-小李", reporter: "劉怡君", createdAt: "2024-03-20 13:45", slaDeadline: "2024-03-25 13:45", resolvedAt: "2024-03-22 10:00" },
  { id: "TK-010", title: "密碼重設請求", description: "忘記 ERP 系統密碼，需要重設", category: "帳號問題", priority: "low", status: "resolved", assignee: "IT 支援-小王", reporter: "蔡明哲", createdAt: "2024-03-25 10:00", slaDeadline: "2024-03-26 10:00", resolvedAt: "2024-03-25 10:30" },
  { id: "TK-011", title: "系統回應速度變慢", description: "CRM 系統在下午時段查詢回應時間超過 10 秒", category: "系統故障", priority: "high", status: "open", assignee: "IT 支援-小李", reporter: "陳志明", createdAt: "2024-03-25 15:00", slaDeadline: "2024-03-26 15:00" },
  { id: "TK-012", title: "希望增加行動版介面", description: "目前系統只有桌面版，希望能支援手機瀏覽", category: "功能需求", priority: "low", status: "open", assignee: "IT 支援-小王", reporter: "王建宏", createdAt: "2024-03-24 16:30", slaDeadline: "2024-03-31 16:30" },
  { id: "TK-013", title: "筆電電池膨脹", description: "公司配發的筆電底部明顯隆起，疑似電池膨脹", category: "硬體設備", priority: "urgent", status: "in_progress", assignee: "IT 支援-小陳", reporter: "楊子翔", createdAt: "2024-03-25 14:00", slaDeadline: "2024-03-25 18:00" },
  { id: "TK-014", title: "外部合作夥伴 VPN 權限", description: "需開通外部顧問的 VPN 存取權限，期限一個月", category: "帳號問題", priority: "medium", status: "closed", assignee: "IT 支援-小李", reporter: "林美玲", createdAt: "2024-03-18 10:00", slaDeadline: "2024-03-20 10:00", resolvedAt: "2024-03-19 09:00" },
  { id: "TK-015", title: "資料庫備份失敗通知", description: "自動備份排程連續三天失敗，需要排查原因", category: "系統故障", priority: "urgent", status: "open", assignee: "IT 支援-小陳", reporter: "吳宗翰", createdAt: "2024-03-25 08:00", slaDeadline: "2024-03-25 12:00" },
];

export const comments: Comment[] = [
  { id: "C-001", ticketId: "TK-001", author: "陳志明", content: "我已經嘗試重設密碼但還是無法登入，是否可以幫我檢查帳號狀態？", isAgent: false, createdAt: "2024-03-25 09:15" },
  { id: "C-002", ticketId: "TK-001", author: "IT 支援-小王", content: "已收到您的請求，我先檢查一下帳號的登入記錄和鎖定狀態。", isAgent: true, createdAt: "2024-03-25 09:25" },
  { id: "C-003", ticketId: "TK-001", author: "IT 支援-小王", content: "經查您的帳號因連續 5 次密碼錯誤已被鎖定，我已解除鎖定並發送密碼重設連結至您的備用信箱。", isAgent: true, createdAt: "2024-03-25 09:40" },
  { id: "C-004", ticketId: "TK-002", author: "黃淑芬", content: "匯出的 Excel 檔案開啟後全部是亂碼，嘗試用不同版本的 Excel 開啟都一樣。", isAgent: false, createdAt: "2024-03-25 10:30" },
  { id: "C-005", ticketId: "TK-002", author: "IT 支援-小李", content: "這看起來是編碼問題，我正在檢查匯出模組的字元編碼設定。", isAgent: true, createdAt: "2024-03-25 10:45" },
  { id: "C-006", ticketId: "TK-002", author: "IT 支援-小李", content: "已找到原因，匯出時未指定 UTF-8 BOM 標頭。修復已部署到測試環境，請幫忙驗證。", isAgent: true, createdAt: "2024-03-25 14:00" },
  { id: "C-007", ticketId: "TK-005", author: "李國豪", content: "今天在家上班 VPN 已經斷線 4 次了，每次都要重新連線，很影響工作。", isAgent: false, createdAt: "2024-03-25 08:45" },
  { id: "C-008", ticketId: "TK-005", author: "IT 支援-小李", content: "我已經在排查 VPN 伺服器的負載狀況，初步發現連線數已接近上限。正在進行擴容作業。", isAgent: true, createdAt: "2024-03-25 09:30" },
  { id: "C-009", ticketId: "TK-007", author: "吳宗翰", content: "告警每 5 分鐘發一次，信箱快被塞爆了。", isAgent: false, createdAt: "2024-03-25 07:30" },
  { id: "C-010", ticketId: "TK-007", author: "IT 支援-小陳", content: "已暫時關閉磁碟告警規則，同時排查監控 agent 的設定問題。", isAgent: true, createdAt: "2024-03-25 08:00" },
];

export const articles: Article[] = [
  { id: "KB-001", title: "如何重設公司信箱密碼", summary: "忘記密碼時的自助重設步驟說明", content: "1. 前往公司入口網站\\n2. 點選「忘記密碼」\\n3. 輸入員工編號與備用信箱\\n4. 收到重設連結後設定新密碼\\n5. 新密碼需符合複雜度要求（至少8碼、包含大小寫與數字）", category: "帳號問題", helpfulCount: 156, createdAt: "2024-01-15" },
  { id: "KB-002", title: "VPN 連線設定指南", summary: "從零開始設定公司 VPN 的完整教學", content: "1. 下載 FortiClient VPN 用戶端\\n2. 安裝完成後開啟應用程式\\n3. 新增 VPN 連線設定檔\\n4. 伺服器位址：vpn.company.com\\n5. 輸入公司帳號密碼登入\\n6. 連線成功後即可存取內部系統", category: "網路問題", helpfulCount: 243, createdAt: "2024-01-20" },
  { id: "KB-003", title: "印表機常見問題排解", summary: "卡紙、無法列印等常見問題的處理方式", content: "卡紙處理：\\n1. 打開印表機前蓋\\n2. 緩慢拉出卡住的紙張\\n3. 檢查是否有紙屑殘留\\n\\n無法列印：\\n1. 確認印表機電源開啟\\n2. 檢查網路連線\\n3. 重新安裝印表機驅動", category: "硬體設備", helpfulCount: 89, createdAt: "2024-02-05" },
  { id: "KB-004", title: "ERP 系統常見錯誤代碼", summary: "ERP 系統常見錯誤代碼對照與解決方案", content: "ERR-001：資料庫連線逾時 → 重新整理頁面\\nERR-002：權限不足 → 聯繫主管申請權限\\nERR-003：資料格式錯誤 → 檢查輸入資料格式\\nERR-004：檔案大小超過限制 → 壓縮檔案後重新上傳", category: "系統故障", helpfulCount: 178, createdAt: "2024-02-10" },
  { id: "KB-005", title: "新進人員 IT 帳號申請流程", summary: "新進員工帳號申請的標準作業程序", content: "1. 人資部填寫帳號申請表單\\n2. 部門主管簽核\\n3. IT 部門建立帳號（約 1-2 個工作天）\\n4. 通知申請人至 IT 部門領取帳號資訊\\n5. 首次登入後強制變更密碼", category: "帳號問題", helpfulCount: 112, createdAt: "2024-02-20" },
  { id: "KB-006", title: "Wi-Fi 訊號不良時的處理方式", summary: "辦公室無線網路問題的自助排查步驟", content: "1. 確認是否在 Wi-Fi 覆蓋範圍內\\n2. 嘗試忘記網路後重新連線\\n3. 重啟裝置的 Wi-Fi 功能\\n4. 若仍無法連線，改用有線網路\\n5. 回報 IT 部門標註確切位置", category: "網路問題", helpfulCount: 67, createdAt: "2024-03-01" },
];

export function getTicketComments(ticketId: string): Comment[] {
  return comments.filter((c) => c.ticketId === ticketId);
}

export function getTicketById(id: string): Ticket | undefined {
  return tickets.find((t) => t.id === id);
}
`;

/* ===== src/app/page.tsx — Dashboard ===== */
const PAGE_DASHBOARD = `"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { tickets } from "@/lib/mock-data";

const statusLabels: Record<string, string> = { open: "待處理", in_progress: "處理中", resolved: "已解決", closed: "已關閉" };
const priorityLabels: Record<string, string> = { urgent: "緊急", high: "高", medium: "中", low: "低" };

const categoryData = (() => {
  const map: Record<string, number> = {};
  tickets.forEach((t) => { map[t.category] = (map[t.category] || 0) + 1; });
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
  return Object.entries(map).map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }));
})();

export default function Home() {
  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;
  const resolvedTickets = tickets.filter((t) => t.status === "resolved" || t.status === "closed");
  const avgResolution = (() => {
    const resolved = tickets.filter((t) => t.resolvedAt);
    if (resolved.length === 0) return "N/A";
    const total = resolved.reduce((sum, t) => {
      const created = new Date(t.createdAt).getTime();
      const done = new Date(t.resolvedAt!).getTime();
      return sum + (done - created) / (1000 * 60 * 60);
    }, 0);
    return \`\${Math.round(total / resolved.length)} 小時\`;
  })();
  const slaCompliance = (() => {
    const resolved = tickets.filter((t) => t.resolvedAt);
    if (resolved.length === 0) return 0;
    const withinSla = resolved.filter((t) => new Date(t.resolvedAt!) <= new Date(t.slaDeadline)).length;
    return Math.round((withinSla / resolved.length) * 100);
  })();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">IT 服務台</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">未結案工單</p>
            <p className="text-3xl font-bold text-red-500 mt-1">{openTickets}</p>
            <p className="text-xs text-gray-400 mt-1">件待處理</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">平均解決時間</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{avgResolution}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">SLA 達標率</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{slaCompliance}%</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">總工單數</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{tickets.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Pie */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">工單類別分佈</h2>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => \`\${name} \${value}\`}>
                  {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Urgent */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">緊急/高優先工單</h2>
            <div className="space-y-3">
              {tickets.filter((t) => (t.priority === "urgent" || t.priority === "high") && t.status !== "closed").map((t) => (
                <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <span className={\`px-2 py-0.5 rounded text-xs font-medium shrink-0 \${t.priority === "urgent" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}\`}>
                    {priorityLabels[t.priority]}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{t.title}</p>
                    <p className="text-xs text-gray-500">{t.id} · {t.assignee} · {statusLabels[t.status]}</p>
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

/* ===== src/app/tickets/page.tsx ===== */
const PAGE_TICKETS = `"use client";
import { useState } from "react";
import Link from "next/link";
import { tickets } from "@/lib/mock-data";
import type { TicketStatus, TicketPriority } from "@/lib/types";

const statusLabels: Record<TicketStatus, string> = { open: "待處理", in_progress: "處理中", resolved: "已解決", closed: "已關閉" };
const statusColors: Record<TicketStatus, string> = {
  open: "bg-red-100 text-red-700",
  in_progress: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};
const priorityLabels: Record<TicketPriority, string> = { urgent: "緊急", high: "高", medium: "中", low: "低" };
const priorityColors: Record<TicketPriority, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

export default function TicketsPage() {
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");

  const filtered = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">工單列表</h1>

        {/* Status Tabs */}
        <div className="flex gap-2 mb-4">
          {(["all", "open", "in_progress", "resolved", "closed"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={\`px-4 py-2 rounded-lg text-sm font-medium \${statusFilter === s ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100 shadow-sm"}\`}>
              {s === "all" ? "全部" : statusLabels[s]}
            </button>
          ))}
        </div>

        {/* Priority Filter */}
        <div className="flex gap-2 mb-6">
          {(["all", "urgent", "high", "medium", "low"] as const).map((p) => (
            <button key={p} onClick={() => setPriorityFilter(p)} className={\`px-3 py-1 rounded-full text-xs font-medium \${priorityFilter === p ? "bg-gray-800 text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-300"}\`}>
              {p === "all" ? "全部優先度" : priorityLabels[p]}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">單號</th>
                <th className="px-4 py-3 font-medium">標題</th>
                <th className="px-4 py-3 font-medium">類別</th>
                <th className="px-4 py-3 font-medium">優先度</th>
                <th className="px-4 py-3 font-medium">負責人</th>
                <th className="px-4 py-3 font-medium">建立時間</th>
                <th className="px-4 py-3 font-medium">SLA 期限</th>
                <th className="px-4 py-3 font-medium">狀態</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={\`/tickets/\${t.id}\`} className="text-blue-600 hover:underline">{t.id}</Link>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[240px] truncate">{t.title}</td>
                  <td className="px-4 py-3 text-gray-600">{t.category}</td>
                  <td className="px-4 py-3">
                    <span className={\`px-2 py-0.5 rounded-full text-xs \${priorityColors[t.priority]}\`}>{priorityLabels[t.priority]}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.assignee}</td>
                  <td className="px-4 py-3 text-gray-500">{t.createdAt}</td>
                  <td className="px-4 py-3 text-gray-500">{t.slaDeadline}</td>
                  <td className="px-4 py-3">
                    <span className={\`px-2 py-0.5 rounded-full text-xs \${statusColors[t.status]}\`}>{statusLabels[t.status]}</span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">沒有符合條件的工單</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
`;

/* ===== src/app/tickets/[id]/page.tsx ===== */
const PAGE_TICKET_DETAIL = `"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getTicketById, getTicketComments } from "@/lib/mock-data";
import type { TicketStatus, TicketPriority } from "@/lib/types";

const statusLabels: Record<TicketStatus, string> = { open: "待處理", in_progress: "處理中", resolved: "已解決", closed: "已關閉" };
const statusColors: Record<TicketStatus, string> = {
  open: "bg-red-100 text-red-700",
  in_progress: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};
const priorityLabels: Record<TicketPriority, string> = { urgent: "緊急", high: "高", medium: "中", low: "低" };
const priorityColors: Record<TicketPriority, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;
  const ticket = getTicketById(ticketId);
  const initialComments = getTicketComments(ticketId);
  const [commentList, setCommentList] = useState(initialComments);
  const [newComment, setNewComment] = useState("");
  const [status, setStatus] = useState<TicketStatus>(ticket?.status || "open");
  const [priority, setPriority] = useState<TicketPriority>(ticket?.priority || "medium");

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">找不到此工單</p>
          <Link href="/tickets" className="text-blue-600 hover:underline">返回工單列表</Link>
        </div>
      </div>
    );
  }

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    setCommentList([...commentList, {
      id: \`C-\${Date.now()}\`,
      ticketId,
      author: "IT 支援-小王",
      content: newComment,
      isAgent: true,
      createdAt: new Date().toLocaleString("zh-TW"),
    }]);
    setNewComment("");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/tickets" className="text-gray-400 hover:text-gray-600 text-sm mb-4 inline-block">&larr; 返回工單列表</Link>

        {/* Ticket Info */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-gray-400">{ticket.id}</span>
                <span className={\`px-2 py-0.5 rounded-full text-xs \${priorityColors[priority]}\`}>{priorityLabels[priority]}</span>
                <span className={\`px-2 py-0.5 rounded-full text-xs \${statusColors[status]}\`}>{statusLabels[status]}</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">{ticket.title}</h1>
            </div>
          </div>
          <p className="text-gray-600 mb-4">{ticket.description}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-gray-400">類別</p><p className="font-medium">{ticket.category}</p></div>
            <div><p className="text-gray-400">報修人</p><p className="font-medium">{ticket.reporter}</p></div>
            <div><p className="text-gray-400">負責人</p><p className="font-medium">{ticket.assignee}</p></div>
            <div><p className="text-gray-400">SLA 期限</p><p className="font-medium">{ticket.slaDeadline}</p></div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6 pt-4 border-t">
            <div>
              <label className="block text-xs text-gray-400 mb-1">變更狀態</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as TicketStatus)} className="border rounded-lg px-3 py-1.5 text-sm">
                {(Object.keys(statusLabels) as TicketStatus[]).map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">變更優先度</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)} className="border rounded-lg px-3 py-1.5 text-sm">
                {(Object.keys(priorityLabels) as TicketPriority[]).map((p) => <option key={p} value={p}>{priorityLabels[p]}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Conversation */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">對話紀錄</h2>
          <div className="space-y-4 mb-6">
            {commentList.map((c) => (
              <div key={c.id} className={\`flex \${c.isAgent ? "justify-end" : "justify-start"}\`}>
                <div className={\`max-w-[75%] rounded-xl p-4 \${c.isAgent ? "bg-blue-50 text-blue-900" : "bg-gray-100 text-gray-900"}\`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{c.author}</span>
                    <span className="text-xs text-gray-400">{c.createdAt}</span>
                  </div>
                  <p className="text-sm">{c.content}</p>
                </div>
              </div>
            ))}
            {commentList.length === 0 && <p className="text-center text-gray-400 text-sm">尚無對話紀錄</p>}
          </div>

          {/* Reply */}
          <div className="flex gap-2">
            <input type="text" placeholder="輸入回覆..." value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddComment()} className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={handleAddComment} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">送出</button>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

/* ===== src/app/knowledge/page.tsx ===== */
const PAGE_KNOWLEDGE = `"use client";
import { useState } from "react";
import { articles, categories } from "@/lib/mock-data";
import type { TicketCategory } from "@/lib/types";

export default function KnowledgePage() {
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = articles.filter((a) => {
    const matchCategory = selectedCategory === "all" || a.category === selectedCategory;
    const matchSearch = a.title.includes(search) || a.summary.includes(search);
    return matchCategory && matchSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">知識庫</h1>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full lg:w-56 shrink-0">
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold text-gray-700 text-sm mb-3">分類</h3>
              <ul className="space-y-1">
                <li>
                  <button onClick={() => setSelectedCategory("all")} className={\`w-full text-left px-3 py-2 rounded-lg text-sm \${selectedCategory === "all" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-50"}\`}>
                    全部分類
                  </button>
                </li>
                {categories.map((c) => (
                  <li key={c}>
                    <button onClick={() => setSelectedCategory(c)} className={\`w-full text-left px-3 py-2 rounded-lg text-sm \${selectedCategory === c ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-50"}\`}>
                      {c}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜尋知識庫文章..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((a) => (
                <div key={a.id} className="bg-white rounded-xl shadow p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{a.title}</h3>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 shrink-0 ml-2">{a.category}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{a.summary}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{a.createdAt}</span>
                    <span>{a.helpfulCount} 人覺得有幫助</span>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-gray-400 text-sm col-span-2 text-center py-8">找不到相關文章</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

export const INTERNAL_HELPDESK: PresetOverlay = {
  templateId: "internal",
  files: [
    { path: "src/lib/types.ts", content: TYPES_FILE },
    { path: "src/lib/mock-data.ts", content: MOCK_DATA_FILE },
    { path: "src/app/page.tsx", content: PAGE_DASHBOARD },
    { path: "src/app/tickets/page.tsx", content: PAGE_TICKETS },
    { path: "src/app/tickets/[id]/page.tsx", content: PAGE_TICKET_DETAIL },
    { path: "src/app/knowledge/page.tsx", content: PAGE_KNOWLEDGE },
  ],
  requiredServices: [
    { category: "database", suggestedTypes: ["built_in_pg", "postgresql"], purpose: "儲存工單資料" },
    { category: "email", suggestedTypes: ["sendgrid", "ses"], purpose: "工單通知郵件", optional: true },
  ],
};
