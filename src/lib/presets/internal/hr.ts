import type { PresetOverlay } from "../index";

/* ===== src/lib/types.ts ===== */
const TYPES_FILE = `export type Department = "工程部" | "行銷部" | "業務部" | "人資部" | "財務部";

export type LeaveType = "特休" | "事假" | "病假" | "公假";

export type LeaveStatus = "pending" | "approved" | "rejected";

export interface Employee {
  id: string;
  name: string;
  employeeId: string;
  department: Department;
  title: string;
  hireDate: string;
  phone: string;
  email: string;
  birthday: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  createdAt: string;
}

export interface LeaveBalance {
  type: LeaveType;
  total: number;
  used: number;
  remaining: number;
}

export interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  clockIn: string;
  clockOut: string;
  isLate: boolean;
  isEarlyLeave: boolean;
  totalHours: number;
}
`;

/* ===== src/lib/mock-data.ts ===== */
const MOCK_DATA_FILE = `import type { Employee, LeaveRequest, LeaveBalance, Attendance, Department } from "./types";

export const departments: Department[] = ["工程部", "行銷部", "業務部", "人資部", "財務部"];

export const employees: Employee[] = [
  { id: "1", name: "陳志明", employeeId: "EMP-001", department: "工程部", title: "資深工程師", hireDate: "2020-03-15", phone: "0912-345-678", email: "zhiming.chen@company.com", birthday: "1990-04-12" },
  { id: "2", name: "林美玲", employeeId: "EMP-002", department: "行銷部", title: "行銷經理", hireDate: "2019-07-01", phone: "0923-456-789", email: "meiling.lin@company.com", birthday: "1988-08-25" },
  { id: "3", name: "王建宏", employeeId: "EMP-003", department: "業務部", title: "業務主任", hireDate: "2021-01-10", phone: "0934-567-890", email: "jianhong.wang@company.com", birthday: "1992-12-03" },
  { id: "4", name: "張雅婷", employeeId: "EMP-004", department: "人資部", title: "人資專員", hireDate: "2022-05-20", phone: "0945-678-901", email: "yating.zhang@company.com", birthday: "1995-06-18" },
  { id: "5", name: "李國豪", employeeId: "EMP-005", department: "工程部", title: "前端工程師", hireDate: "2023-02-14", phone: "0956-789-012", email: "guohao.li@company.com", birthday: "1996-01-30" },
  { id: "6", name: "黃淑芬", employeeId: "EMP-006", department: "財務部", title: "會計師", hireDate: "2018-11-05", phone: "0967-890-123", email: "shufen.huang@company.com", birthday: "1987-09-14" },
  { id: "7", name: "吳宗翰", employeeId: "EMP-007", department: "工程部", title: "後端工程師", hireDate: "2021-08-22", phone: "0978-901-234", email: "zonghan.wu@company.com", birthday: "1993-03-07" },
  { id: "8", name: "劉怡君", employeeId: "EMP-008", department: "行銷部", title: "社群行銷專員", hireDate: "2023-06-01", phone: "0989-012-345", email: "yijun.liu@company.com", birthday: "1997-11-22" },
  { id: "9", name: "蔡明哲", employeeId: "EMP-009", department: "業務部", title: "業務經理", hireDate: "2017-04-18", phone: "0910-123-456", email: "mingzhe.cai@company.com", birthday: "1985-07-09" },
  { id: "10", name: "許雅惠", employeeId: "EMP-010", department: "人資部", title: "人資主管", hireDate: "2016-09-12", phone: "0921-234-567", email: "yahui.xu@company.com", birthday: "1984-02-28" },
  { id: "11", name: "楊子翔", employeeId: "EMP-011", department: "財務部", title: "財務分析師", hireDate: "2022-10-03", phone: "0932-345-678", email: "zixiang.yang@company.com", birthday: "1994-05-16" },
  { id: "12", name: "鄭佳蓉", employeeId: "EMP-012", department: "工程部", title: "QA 工程師", hireDate: "2023-09-15", phone: "0943-456-789", email: "jiarong.zheng@company.com", birthday: "1998-10-01" },
];

export const leaveRequests: LeaveRequest[] = [
  { id: "LR-001", employeeId: "1", employeeName: "陳志明", type: "特休", startDate: "2024-04-01", endDate: "2024-04-03", reason: "家庭旅遊", status: "approved", createdAt: "2024-03-20" },
  { id: "LR-002", employeeId: "3", employeeName: "王建宏", type: "事假", startDate: "2024-04-05", endDate: "2024-04-05", reason: "搬家", status: "pending", createdAt: "2024-03-28" },
  { id: "LR-003", employeeId: "5", employeeName: "李國豪", type: "病假", startDate: "2024-03-25", endDate: "2024-03-26", reason: "感冒發燒", status: "approved", createdAt: "2024-03-25" },
  { id: "LR-004", employeeId: "8", employeeName: "劉怡君", type: "特休", startDate: "2024-04-10", endDate: "2024-04-12", reason: "出國旅遊", status: "pending", createdAt: "2024-03-29" },
  { id: "LR-005", employeeId: "2", employeeName: "林美玲", type: "公假", startDate: "2024-04-08", endDate: "2024-04-08", reason: "外訓研習", status: "approved", createdAt: "2024-03-27" },
  { id: "LR-006", employeeId: "9", employeeName: "蔡明哲", type: "事假", startDate: "2024-04-15", endDate: "2024-04-16", reason: "私人事務", status: "rejected", createdAt: "2024-03-30" },
  { id: "LR-007", employeeId: "6", employeeName: "黃淑芬", type: "病假", startDate: "2024-03-28", endDate: "2024-03-28", reason: "身體不適", status: "pending", createdAt: "2024-03-28" },
];

export const leaveBalances: LeaveBalance[] = [
  { type: "特休", total: 14, used: 5, remaining: 9 },
  { type: "事假", total: 14, used: 2, remaining: 12 },
  { type: "病假", total: 30, used: 3, remaining: 27 },
  { type: "公假", total: 0, used: 1, remaining: 0 },
];

export const departmentCounts: { department: Department; count: number }[] = [
  { department: "工程部", count: 4 },
  { department: "行銷部", count: 2 },
  { department: "業務部", count: 2 },
  { department: "人資部", count: 2 },
  { department: "財務部", count: 2 },
];

export const attendanceRecords: Attendance[] = [
  { id: "A-001", employeeId: "1", employeeName: "陳志明", date: "2024-03-25", clockIn: "08:55", clockOut: "18:10", isLate: false, isEarlyLeave: false, totalHours: 9.25 },
  { id: "A-002", employeeId: "2", employeeName: "林美玲", date: "2024-03-25", clockIn: "09:15", clockOut: "18:00", isLate: true, isEarlyLeave: false, totalHours: 8.75 },
  { id: "A-003", employeeId: "3", employeeName: "王建宏", date: "2024-03-25", clockIn: "08:50", clockOut: "17:30", isLate: false, isEarlyLeave: true, totalHours: 8.67 },
  { id: "A-004", employeeId: "4", employeeName: "張雅婷", date: "2024-03-25", clockIn: "08:58", clockOut: "18:05", isLate: false, isEarlyLeave: false, totalHours: 9.12 },
  { id: "A-005", employeeId: "5", employeeName: "李國豪", date: "2024-03-25", clockIn: "09:20", clockOut: "18:30", isLate: true, isEarlyLeave: false, totalHours: 9.17 },
  { id: "A-006", employeeId: "6", employeeName: "黃淑芬", date: "2024-03-25", clockIn: "08:45", clockOut: "18:00", isLate: false, isEarlyLeave: false, totalHours: 9.25 },
  { id: "A-007", employeeId: "7", employeeName: "吳宗翰", date: "2024-03-25", clockIn: "09:00", clockOut: "18:15", isLate: false, isEarlyLeave: false, totalHours: 9.25 },
  { id: "A-008", employeeId: "8", employeeName: "劉怡君", date: "2024-03-25", clockIn: "08:48", clockOut: "17:45", isLate: false, isEarlyLeave: true, totalHours: 8.95 },
  { id: "A-009", employeeId: "9", employeeName: "蔡明哲", date: "2024-03-25", clockIn: "08:30", clockOut: "18:00", isLate: false, isEarlyLeave: false, totalHours: 9.5 },
  { id: "A-010", employeeId: "10", employeeName: "許雅惠", date: "2024-03-25", clockIn: "09:05", clockOut: "18:20", isLate: true, isEarlyLeave: false, totalHours: 9.25 },
  { id: "A-011", employeeId: "11", employeeName: "楊子翔", date: "2024-03-25", clockIn: "08:52", clockOut: "18:00", isLate: false, isEarlyLeave: false, totalHours: 9.13 },
  { id: "A-012", employeeId: "12", employeeName: "鄭佳蓉", date: "2024-03-25", clockIn: "09:00", clockOut: "18:10", isLate: false, isEarlyLeave: false, totalHours: 9.17 },
  { id: "A-013", employeeId: "1", employeeName: "陳志明", date: "2024-03-26", clockIn: "08:50", clockOut: "18:05", isLate: false, isEarlyLeave: false, totalHours: 9.25 },
  { id: "A-014", employeeId: "2", employeeName: "林美玲", date: "2024-03-26", clockIn: "08:58", clockOut: "18:00", isLate: false, isEarlyLeave: false, totalHours: 9.03 },
  { id: "A-015", employeeId: "3", employeeName: "王建宏", date: "2024-03-26", clockIn: "09:10", clockOut: "18:20", isLate: true, isEarlyLeave: false, totalHours: 9.17 },
];
`;

/* ===== src/app/page.tsx — HR Dashboard ===== */
const PAGE_DASHBOARD = `"use client";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { employees, departmentCounts, leaveRequests } from "@/lib/mock-data";

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "待審核", color: "bg-yellow-100 text-yellow-800" },
  approved: { label: "已核准", color: "bg-green-100 text-green-800" },
  rejected: { label: "已駁回", color: "bg-red-100 text-red-800" },
};

function getUpcomingBirthdays() {
  const today = new Date();
  const month = today.getMonth() + 1;
  return employees
    .filter((e) => {
      const bMonth = parseInt(e.birthday.split("-")[1], 10);
      return bMonth === month || bMonth === month + 1;
    })
    .sort((a, b) => a.birthday.localeCompare(b.birthday))
    .slice(0, 5);
}

export default function Home() {
  const [tab, setTab] = useState<"overview" | "birthdays" | "leave">("overview");
  const pendingLeaves = leaveRequests.filter((l) => l.status === "pending");
  const newHires = employees.filter((e) => {
    const hire = new Date(e.hireDate);
    const now = new Date();
    return hire.getMonth() === now.getMonth() && hire.getFullYear() === now.getFullYear();
  });
  const attendanceRate = 94.5;
  const upcomingBirthdays = getUpcomingBirthdays();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">人資管理系統</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">全體員工</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{employees.length}</p>
            <p className="text-xs text-gray-400 mt-1">位在職員工</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">本月新進</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{newHires.length}</p>
            <p className="text-xs text-gray-400 mt-1">位新進人員</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">待審假單</p>
            <p className="text-3xl font-bold text-orange-500 mt-1">{pendingLeaves.length}</p>
            <p className="text-xs text-gray-400 mt-1">件待處理</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">出勤率</p>
            <p className="text-3xl font-bold text-purple-600 mt-1">{attendanceRate}%</p>
            <p className="text-xs text-gray-400 mt-1">本月平均</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {([["overview", "部門人數"], ["birthdays", "近期生日"], ["leave", "待審假單"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={\`px-4 py-2 rounded-lg text-sm font-medium \${tab === key ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}\`}>
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "overview" && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">各部門人數</h2>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={departmentCounts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {tab === "birthdays" && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">近期壽星</h2>
            {upcomingBirthdays.length === 0 ? (
              <p className="text-gray-400 text-sm">近期沒有壽星</p>
            ) : (
              <ul className="divide-y">
                {upcomingBirthdays.map((e) => (
                  <li key={e.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-gray-900">{e.name}</p>
                      <p className="text-sm text-gray-500">{e.department} ・ {e.title}</p>
                    </div>
                    <span className="text-sm text-gray-500">{e.birthday.slice(5)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "leave" && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">待審核假單</h2>
            {pendingLeaves.length === 0 ? (
              <p className="text-gray-400 text-sm">目前沒有待審核假單</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 font-medium">申請人</th>
                      <th className="pb-2 font-medium">假別</th>
                      <th className="pb-2 font-medium">起始日</th>
                      <th className="pb-2 font-medium">結束日</th>
                      <th className="pb-2 font-medium">事由</th>
                      <th className="pb-2 font-medium">狀態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingLeaves.map((l) => (
                      <tr key={l.id} className="border-b last:border-0">
                        <td className="py-3 font-medium text-gray-900">{l.employeeName}</td>
                        <td className="py-3">{l.type}</td>
                        <td className="py-3">{l.startDate}</td>
                        <td className="py-3">{l.endDate}</td>
                        <td className="py-3 text-gray-600">{l.reason}</td>
                        <td className="py-3">
                          <span className={\`px-2 py-0.5 rounded-full text-xs \${statusMap[l.status].color}\`}>{statusMap[l.status].label}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
`;

/* ===== src/app/employees/page.tsx ===== */
const PAGE_EMPLOYEES = `"use client";
import { useState } from "react";
import { employees, departments } from "@/lib/mock-data";
import type { Department } from "@/lib/types";

const deptColors: Record<string, string> = {
  "工程部": "bg-blue-100 text-blue-800",
  "行銷部": "bg-pink-100 text-pink-800",
  "業務部": "bg-green-100 text-green-800",
  "人資部": "bg-purple-100 text-purple-800",
  "財務部": "bg-orange-100 text-orange-800",
};

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<Department | "all">("all");

  const filtered = employees.filter((e) => {
    const matchSearch = e.name.includes(search) || e.employeeId.includes(search) || e.email.includes(search.toLowerCase());
    const matchDept = deptFilter === "all" || e.department === deptFilter;
    return matchSearch && matchDept;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">員工名冊</h1>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="搜尋姓名、工號或 Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value as Department | "all")}
            className="border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部部門</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">姓名</th>
                <th className="px-4 py-3 font-medium">工號</th>
                <th className="px-4 py-3 font-medium">部門</th>
                <th className="px-4 py-3 font-medium">職稱</th>
                <th className="px-4 py-3 font-medium">到職日</th>
                <th className="px-4 py-3 font-medium">電話</th>
                <th className="px-4 py-3 font-medium">Email</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{e.name}</td>
                  <td className="px-4 py-3 text-gray-600">{e.employeeId}</td>
                  <td className="px-4 py-3">
                    <span className={\`px-2 py-0.5 rounded-full text-xs \${deptColors[e.department] || "bg-gray-100 text-gray-800"}\`}>{e.department}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{e.title}</td>
                  <td className="px-4 py-3 text-gray-600">{e.hireDate}</td>
                  <td className="px-4 py-3 text-gray-600">{e.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{e.email}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">查無符合條件的員工</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
`;

/* ===== src/app/leave/page.tsx ===== */
const PAGE_LEAVE = `"use client";
import { useState } from "react";
import { leaveRequests, leaveBalances } from "@/lib/mock-data";
import type { LeaveRequest, LeaveType, LeaveStatus } from "@/lib/types";

const statusMap: Record<LeaveStatus, { label: string; color: string }> = {
  pending: { label: "待審核", color: "bg-yellow-100 text-yellow-800" },
  approved: { label: "已核准", color: "bg-green-100 text-green-800" },
  rejected: { label: "已駁回", color: "bg-red-100 text-red-800" },
};

const leaveTypes: LeaveType[] = ["特休", "事假", "病假", "公假"];

export default function LeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>(leaveRequests);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<LeaveStatus | "all">("all");
  const [form, setForm] = useState({ type: "特休" as LeaveType, startDate: "", endDate: "", reason: "" });

  const filtered = filterStatus === "all" ? requests : requests.filter((r) => r.status === filterStatus);

  const handleSubmit = () => {
    if (!form.startDate || !form.endDate || !form.reason) return;
    const newRequest: LeaveRequest = {
      id: \`LR-\${String(requests.length + 1).padStart(3, "0")}\`,
      employeeId: "1",
      employeeName: "陳志明",
      type: form.type,
      startDate: form.startDate,
      endDate: form.endDate,
      reason: form.reason,
      status: "pending",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setRequests([newRequest, ...requests]);
    setForm({ type: "特休", startDate: "", endDate: "", reason: "" });
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">請假管理</h1>

        {/* Leave Balance */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {leaveBalances.map((b) => (
            <div key={b.type} className="bg-white rounded-xl shadow p-4">
              <p className="text-sm text-gray-500">{b.type}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{b.remaining} <span className="text-sm font-normal text-gray-400">/ {b.total} 天</span></p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                <div className="bg-blue-500 rounded-full h-1.5" style={{ width: \`\${b.total > 0 ? ((b.total - b.remaining) / b.total) * 100 : 0}%\` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">已使用 {b.used} 天</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {(["all", "pending", "approved", "rejected"] as const).map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)} className={\`px-3 py-1 rounded-full text-sm \${filterStatus === s ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}\`}>
                {s === "all" ? "全部" : statusMap[s].label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            ＋ 申請請假
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow p-5 mb-4">
            <h3 className="font-semibold text-gray-900 mb-4">新增請假申請</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">假別</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as LeaveType })} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {leaveTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">開始日期</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">結束日期</label>
                <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">事由</label>
                <input type="text" placeholder="請輸入請假事由" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">取消</button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">送出申請</button>
            </div>
          </div>
        )}

        {/* Requests Table */}
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">單號</th>
                <th className="px-4 py-3 font-medium">申請人</th>
                <th className="px-4 py-3 font-medium">假別</th>
                <th className="px-4 py-3 font-medium">起始日</th>
                <th className="px-4 py-3 font-medium">結束日</th>
                <th className="px-4 py-3 font-medium">事由</th>
                <th className="px-4 py-3 font-medium">狀態</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{r.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.employeeName}</td>
                  <td className="px-4 py-3">{r.type}</td>
                  <td className="px-4 py-3 text-gray-600">{r.startDate}</td>
                  <td className="px-4 py-3 text-gray-600">{r.endDate}</td>
                  <td className="px-4 py-3 text-gray-600">{r.reason}</td>
                  <td className="px-4 py-3">
                    <span className={\`px-2 py-0.5 rounded-full text-xs \${statusMap[r.status].color}\`}>{statusMap[r.status].label}</span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">沒有符合條件的假單</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
`;

/* ===== src/app/attendance/page.tsx ===== */
const PAGE_ATTENDANCE = `"use client";
import { useState, useMemo } from "react";
import { attendanceRecords } from "@/lib/mock-data";

export default function AttendancePage() {
  const [startDate, setStartDate] = useState("2024-03-25");
  const [endDate, setEndDate] = useState("2024-03-26");

  const filtered = useMemo(() => {
    return attendanceRecords.filter((r) => r.date >= startDate && r.date <= endDate);
  }, [startDate, endDate]);

  const stats = useMemo(() => {
    if (filtered.length === 0) return { avgHours: 0, lateCount: 0, earlyCount: 0, onTimeRate: 0 };
    const lateCount = filtered.filter((r) => r.isLate).length;
    const earlyCount = filtered.filter((r) => r.isEarlyLeave).length;
    const avgHours = filtered.reduce((sum, r) => sum + r.totalHours, 0) / filtered.length;
    const onTimeRate = ((filtered.length - lateCount) / filtered.length) * 100;
    return { avgHours: Math.round(avgHours * 100) / 100, lateCount, earlyCount, onTimeRate: Math.round(onTimeRate * 10) / 10 };
  }, [filtered]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">出勤紀錄</h1>

        {/* Date Range */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div>
            <label className="block text-xs text-gray-500 mb-1">起始日期</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border rounded-lg px-4 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">結束日期</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border rounded-lg px-4 py-2 text-sm" />
          </div>
        </div>

        {/* Monthly Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">平均工時</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.avgHours} <span className="text-sm font-normal text-gray-400">小時</span></p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">遲到次數</p>
            <p className="text-2xl font-bold text-red-500 mt-1">{stats.lateCount} <span className="text-sm font-normal text-gray-400">次</span></p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">早退次數</p>
            <p className="text-2xl font-bold text-orange-500 mt-1">{stats.earlyCount} <span className="text-sm font-normal text-gray-400">次</span></p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">準時率</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.onTimeRate}%</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">日期</th>
                <th className="px-4 py-3 font-medium">員工</th>
                <th className="px-4 py-3 font-medium">上班打卡</th>
                <th className="px-4 py-3 font-medium">下班打卡</th>
                <th className="px-4 py-3 font-medium">遲到</th>
                <th className="px-4 py-3 font-medium">早退</th>
                <th className="px-4 py-3 font-medium">工時</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{r.date}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.employeeName}</td>
                  <td className="px-4 py-3 text-gray-600">{r.clockIn}</td>
                  <td className="px-4 py-3 text-gray-600">{r.clockOut}</td>
                  <td className="px-4 py-3">
                    {r.isLate ? <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">遲到</span> : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.isEarlyLeave ? <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">早退</span> : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.totalHours}h</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">選定範圍內無出勤紀錄</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
`;

export const INTERNAL_HR: PresetOverlay = {
  templateId: "internal",
  files: [
    { path: "src/lib/types.ts", content: TYPES_FILE },
    { path: "src/lib/mock-data.ts", content: MOCK_DATA_FILE },
    { path: "src/app/page.tsx", content: PAGE_DASHBOARD },
    { path: "src/app/employees/page.tsx", content: PAGE_EMPLOYEES },
    { path: "src/app/leave/page.tsx", content: PAGE_LEAVE },
    { path: "src/app/attendance/page.tsx", content: PAGE_ATTENDANCE },
  ],
  requiredServices: [
    { category: "database", suggestedTypes: ["built_in_pg", "postgresql"], purpose: "儲存人事資料" },
  ],
};
