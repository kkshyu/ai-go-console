export const FINANCE_EXPENSE_REPORT_PAGE = `"use client";
import { useState } from "react";

interface ExpenseItem {
  id: number;
  date: string;
  description: string;
  category: string;
  amount: number;
  submitter: string;
  status: "approved" | "pending" | "rejected";
}

const initialExpenses: ExpenseItem[] = [
  { id: 1, date: "2024-03-15", description: "客戶拜訪交通費", category: "交通", amount: 1250, submitter: "陳志明", status: "approved" },
  { id: 2, date: "2024-03-14", description: "團隊午餐會議", category: "餐飲", amount: 3600, submitter: "林美玲", status: "pending" },
  { id: 3, date: "2024-03-13", description: "辦公文具採購", category: "辦公用品", amount: 890, submitter: "王建宏", status: "approved" },
  { id: 4, date: "2024-03-12", description: "年度軟體授權費", category: "軟體", amount: 45000, submitter: "張雅婷", status: "pending" },
  { id: 5, date: "2024-03-11", description: "出差住宿費用", category: "住宿", amount: 5200, submitter: "李國華", status: "rejected" },
  { id: 6, date: "2024-03-10", description: "會議室投影機維修", category: "設備維護", amount: 7800, submitter: "陳志明", status: "approved" },
];

const categories = ["全部", "交通", "餐飲", "辦公用品", "軟體", "住宿", "設備維護"];

export default function Home() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>(initialExpenses);
  const [filterCategory, setFilterCategory] = useState("全部");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("交通");
  const [newAmount, setNewAmount] = useState("");
  const [newSubmitter, setNewSubmitter] = useState("");

  const filtered = expenses.filter((e) => {
    const catMatch = filterCategory === "全部" || e.category === filterCategory;
    const statusMatch = filterStatus === "all" || e.status === filterStatus;
    return catMatch && statusMatch;
  });

  const totalAmount = filtered.reduce((sum, e) => sum + e.amount, 0);
  const approvedAmount = filtered.filter((e) => e.status === "approved").reduce((sum, e) => sum + e.amount, 0);
  const pendingAmount = filtered.filter((e) => e.status === "pending").reduce((sum, e) => sum + e.amount, 0);

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      rejected: "bg-red-100 text-red-800",
    };
    const labels: Record<string, string> = { approved: "已核准", pending: "待審核", rejected: "已駁回" };
    return <span className={\`px-2 py-1 rounded-full text-xs font-medium \${styles[status]}\`}>{labels[status]}</span>;
  };

  const addExpense = () => {
    if (!newDesc || !newAmount || !newSubmitter) return;
    const item: ExpenseItem = {
      id: Date.now(),
      date: new Date().toISOString().split("T")[0],
      description: newDesc,
      category: newCategory,
      amount: parseInt(newAmount),
      submitter: newSubmitter,
      status: "pending",
    };
    setExpenses([item, ...expenses]);
    setNewDesc("");
    setNewAmount("");
    setNewSubmitter("");
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">費用報銷系統</h1>
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            {showForm ? "取消" : "＋ 新增報銷"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">篩選總金額</p>
            <p className="text-2xl font-bold text-gray-900">NT$ {totalAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">已核准金額</p>
            <p className="text-2xl font-bold text-green-600">NT$ {approvedAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">待審核金額</p>
            <p className="text-2xl font-bold text-yellow-600">NT$ {pendingAmount.toLocaleString()}</p>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">新增費用報銷</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={newSubmitter} onChange={(e) => setNewSubmitter(e.target.value)} placeholder="申請人姓名" className="border rounded-lg px-3 py-2" />
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="border rounded-lg px-3 py-2">
                {categories.filter((c) => c !== "全部").map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
              <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="費用說明" className="border rounded-lg px-3 py-2" />
              <input value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="金額 (TWD)" type="number" className="border rounded-lg px-3 py-2" />
            </div>
            <button onClick={addExpense} className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition">送出申請</button>
          </div>
        )}

        <div className="flex flex-wrap gap-3 mb-4">
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="all">全部狀態</option>
            <option value="approved">已核准</option>
            <option value="pending">待審核</option>
            <option value="rejected">已駁回</option>
          </select>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">日期</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">申請人</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">說明</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">類別</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">金額</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">{item.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.submitter}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.description}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.category}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">NT$ {item.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">{statusBadge(item.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8">無符合條件的報銷紀錄</p>}
        </div>
      </div>
    </div>
  );
}
`;

export const FINANCE_INVOICE_MANAGER_PAGE = `"use client";
import { useState } from "react";

interface Invoice {
  id: number;
  invoiceNo: string;
  customer: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  status: "paid" | "unpaid" | "overdue" | "draft";
}

const initialInvoices: Invoice[] = [
  { id: 1, invoiceNo: "INV-2024-001", customer: "台灣科技股份有限公司", issueDate: "2024-03-01", dueDate: "2024-03-31", amount: 150000, status: "paid" },
  { id: 2, invoiceNo: "INV-2024-002", customer: "鼎新電腦有限公司", issueDate: "2024-03-05", dueDate: "2024-04-05", amount: 87500, status: "unpaid" },
  { id: 3, invoiceNo: "INV-2024-003", customer: "宏碁資訊服務公司", issueDate: "2024-02-15", dueDate: "2024-03-15", amount: 230000, status: "overdue" },
  { id: 4, invoiceNo: "INV-2024-004", customer: "聯發科技顧問公司", issueDate: "2024-03-10", dueDate: "2024-04-10", amount: 64000, status: "unpaid" },
  { id: 5, invoiceNo: "INV-2024-005", customer: "群暉科技有限公司", issueDate: "2024-03-12", dueDate: "2024-04-12", amount: 195000, status: "draft" },
  { id: 6, invoiceNo: "INV-2024-006", customer: "光寶科技股份有限公司", issueDate: "2024-03-08", dueDate: "2024-04-08", amount: 42000, status: "paid" },
];

export default function Home() {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  const filtered = filterStatus === "all" ? invoices : invoices.filter((inv) => inv.status === filterStatus);

  const totalAmount = invoices.reduce((s, i) => s + i.amount, 0);
  const paidAmount = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const overdueAmount = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const unpaidAmount = invoices.filter((i) => i.status === "unpaid").reduce((s, i) => s + i.amount, 0);

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid: "bg-green-100 text-green-800",
      unpaid: "bg-blue-100 text-blue-800",
      overdue: "bg-red-100 text-red-800",
      draft: "bg-gray-100 text-gray-800",
    };
    const labels: Record<string, string> = { paid: "已付款", unpaid: "未付款", overdue: "已逾期", draft: "草稿" };
    return <span className={\`px-2 py-1 rounded-full text-xs font-medium \${styles[status]}\`}>{labels[status]}</span>;
  };

  const addInvoice = () => {
    if (!newCustomer || !newAmount || !newDueDate) return;
    const inv: Invoice = {
      id: Date.now(),
      invoiceNo: \`INV-2024-\${String(invoices.length + 1).padStart(3, "0")}\`,
      customer: newCustomer,
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: newDueDate,
      amount: parseInt(newAmount),
      status: "draft",
    };
    setInvoices([inv, ...invoices]);
    setNewCustomer("");
    setNewAmount("");
    setNewDueDate("");
    setShowForm(false);
  };

  const togglePaid = (id: number) => {
    setInvoices(invoices.map((inv) => inv.id === id ? { ...inv, status: inv.status === "paid" ? "unpaid" : "paid" } : inv));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">發票管理系統</h1>
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            {showForm ? "取消" : "＋ 建立發票"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">發票總額</p>
            <p className="text-xl font-bold text-gray-900">NT$ {totalAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">已收款</p>
            <p className="text-xl font-bold text-green-600">NT$ {paidAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">未付款</p>
            <p className="text-xl font-bold text-blue-600">NT$ {unpaidAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">已逾期</p>
            <p className="text-xl font-bold text-red-600">NT$ {overdueAmount.toLocaleString()}</p>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">建立新發票</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input value={newCustomer} onChange={(e) => setNewCustomer(e.target.value)} placeholder="客戶名稱" className="border rounded-lg px-3 py-2" />
              <input value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="金額 (TWD)" type="number" className="border rounded-lg px-3 py-2" />
              <input value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} placeholder="到期日" type="date" className="border rounded-lg px-3 py-2" />
            </div>
            <button onClick={addInvoice} className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition">建立發票</button>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          {["all", "paid", "unpaid", "overdue", "draft"].map((s) => {
            const labels: Record<string, string> = { all: "全部", paid: "已付款", unpaid: "未付款", overdue: "已逾期", draft: "草稿" };
            return (
              <button key={s} onClick={() => setFilterStatus(s)} className={\`px-3 py-1 rounded-full text-sm \${filterStatus === s ? "bg-blue-600 text-white" : "bg-white text-gray-600 border"}\`}>
                {labels[s]}
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">發票編號</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">客戶</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">開立日期</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">到期日</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">金額</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">狀態</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-blue-600">{inv.invoiceNo}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{inv.customer}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{inv.issueDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{inv.dueDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">NT$ {inv.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">{statusBadge(inv.status)}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => togglePaid(inv.id)} className="text-xs text-blue-600 hover:underline">
                      {inv.status === "paid" ? "標為未付" : "標為已付"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8">無符合條件的發票</p>}
        </div>
      </div>
    </div>
  );
}
`;

export const FINANCE_BUDGET_TRACKER_PAGE = `"use client";
import { useState } from "react";

interface BudgetCategory {
  id: number;
  category: string;
  budgeted: number;
  actual: number;
  department: string;
}

const initialBudgets: BudgetCategory[] = [
  { id: 1, category: "人事費用", budgeted: 2500000, actual: 2380000, department: "人資部" },
  { id: 2, category: "辦公設備", budgeted: 500000, actual: 620000, department: "總務部" },
  { id: 3, category: "行銷推廣", budgeted: 800000, actual: 750000, department: "行銷部" },
  { id: 4, category: "軟體授權", budgeted: 350000, actual: 410000, department: "資訊部" },
  { id: 5, category: "差旅費用", budgeted: 200000, actual: 185000, department: "業務部" },
  { id: 6, category: "教育訓練", budgeted: 150000, actual: 92000, department: "人資部" },
  { id: 7, category: "水電雜支", budgeted: 120000, actual: 115000, department: "總務部" },
];

export default function Home() {
  const [budgets, setBudgets] = useState<BudgetCategory[]>(initialBudgets);
  const [filterDept, setFilterDept] = useState("全部");
  const [showOver, setShowOver] = useState(false);

  const departments = ["全部", ...Array.from(new Set(budgets.map((b) => b.department)))];

  const filtered = budgets.filter((b) => {
    const deptMatch = filterDept === "全部" || b.department === filterDept;
    const overMatch = !showOver || b.actual > b.budgeted;
    return deptMatch && overMatch;
  });

  const totalBudgeted = filtered.reduce((s, b) => s + b.budgeted, 0);
  const totalActual = filtered.reduce((s, b) => s + b.actual, 0);
  const totalVariance = totalBudgeted - totalActual;
  const usageRate = totalBudgeted > 0 ? ((totalActual / totalBudgeted) * 100).toFixed(1) : "0";

  const getBarWidth = (actual: number, budgeted: number) => {
    const pct = Math.min((actual / budgeted) * 100, 150);
    return pct;
  };

  const getBarColor = (actual: number, budgeted: number) => {
    const ratio = actual / budgeted;
    if (ratio > 1) return "bg-red-500";
    if (ratio > 0.9) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">預算追蹤儀表板</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">總預算</p>
            <p className="text-xl font-bold text-gray-900">NT$ {totalBudgeted.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">實際支出</p>
            <p className="text-xl font-bold text-blue-600">NT$ {totalActual.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">差異</p>
            <p className={\`text-xl font-bold \${totalVariance >= 0 ? "text-green-600" : "text-red-600"}\`}>
              {totalVariance >= 0 ? "+" : ""}NT$ {totalVariance.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">預算使用率</p>
            <p className={\`text-xl font-bold \${parseFloat(usageRate) > 100 ? "text-red-600" : "text-green-600"}\`}>{usageRate}%</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            {departments.map((d) => (<option key={d} value={d}>{d}</option>))}
          </select>
          <button onClick={() => setShowOver(!showOver)} className={\`px-4 py-2 rounded-lg text-sm \${showOver ? "bg-red-600 text-white" : "bg-white border text-gray-600"}\`}>
            {showOver ? "顯示全部" : "僅顯示超支"}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">各類別預算使用狀況</h2>
          <div className="space-y-4">
            {filtered.map((item) => {
              const pct = getBarWidth(item.actual, item.budgeted);
              const color = getBarColor(item.actual, item.budgeted);
              const variance = item.budgeted - item.actual;
              return (
                <div key={item.id} className="border-b pb-4">
                  <div className="flex justify-between items-center mb-1">
                    <div>
                      <span className="font-medium text-gray-800">{item.category}</span>
                      <span className="text-xs text-gray-400 ml-2">{item.department}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-600">NT$ {item.actual.toLocaleString()} / NT$ {item.budgeted.toLocaleString()}</span>
                      <span className={\`ml-2 text-xs font-medium \${variance >= 0 ? "text-green-600" : "text-red-600"}\`}>
                        {variance >= 0 ? "剩餘" : "超支"} NT$ {Math.abs(variance).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className={\`\${color} h-3 rounded-full transition-all\`} style={{ width: \`\${Math.min(pct, 100)}%\` }}></div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-right">{pct.toFixed(1)}%</p>
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8">無符合條件的預算項目</p>}
        </div>
      </div>
    </div>
  );
}
`;

export const FINANCE_ACCOUNTS_RECEIVABLE_PAGE = `"use client";
import { useState } from "react";

interface Receivable {
  id: number;
  customer: string;
  invoiceNo: string;
  amount: number;
  dueDate: string;
  daysPastDue: number;
  status: "current" | "30days" | "60days" | "90days" | "collected";
}

const initialReceivables: Receivable[] = [
  { id: 1, customer: "大同資訊股份有限公司", invoiceNo: "AR-001", amount: 320000, dueDate: "2024-04-15", daysPastDue: 0, status: "current" },
  { id: 2, customer: "華碩電腦有限公司", invoiceNo: "AR-002", amount: 185000, dueDate: "2024-03-01", daysPastDue: 15, status: "30days" },
  { id: 3, customer: "仁寶電腦工業", invoiceNo: "AR-003", amount: 450000, dueDate: "2024-02-10", daysPastDue: 45, status: "60days" },
  { id: 4, customer: "緯創資通股份有限公司", invoiceNo: "AR-004", amount: 92000, dueDate: "2024-01-05", daysPastDue: 80, status: "90days" },
  { id: 5, customer: "和碩聯合科技", invoiceNo: "AR-005", amount: 270000, dueDate: "2024-03-20", daysPastDue: 0, status: "current" },
  { id: 6, customer: "廣達電腦股份有限公司", invoiceNo: "AR-006", amount: 158000, dueDate: "2024-02-28", daysPastDue: 18, status: "30days" },
  { id: 7, customer: "英業達股份有限公司", invoiceNo: "AR-007", amount: 530000, dueDate: "2024-03-25", daysPastDue: 0, status: "collected" },
];

export default function Home() {
  const [receivables, setReceivables] = useState<Receivable[]>(initialReceivables);
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = filterStatus === "all" ? receivables : receivables.filter((r) => r.status === filterStatus);

  const totalOutstanding = receivables.filter((r) => r.status !== "collected").reduce((s, r) => s + r.amount, 0);
  const currentAmount = receivables.filter((r) => r.status === "current").reduce((s, r) => s + r.amount, 0);
  const overdueAmount = receivables.filter((r) => ["30days", "60days", "90days"].includes(r.status)).reduce((s, r) => s + r.amount, 0);
  const collectedAmount = receivables.filter((r) => r.status === "collected").reduce((s, r) => s + r.amount, 0);

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      current: "bg-green-100 text-green-800",
      "30days": "bg-yellow-100 text-yellow-800",
      "60days": "bg-orange-100 text-orange-800",
      "90days": "bg-red-100 text-red-800",
      collected: "bg-blue-100 text-blue-800",
    };
    const labels: Record<string, string> = {
      current: "未到期",
      "30days": "逾期 30 天",
      "60days": "逾期 60 天",
      "90days": "逾期 90 天",
      collected: "已收款",
    };
    return <span className={\`px-2 py-1 rounded-full text-xs font-medium \${styles[status]}\`}>{labels[status]}</span>;
  };

  const markCollected = (id: number) => {
    setReceivables(receivables.map((r) => r.id === id ? { ...r, status: "collected" as const, daysPastDue: 0 } : r));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">應收帳款管理</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">應收總額</p>
            <p className="text-xl font-bold text-gray-900">NT$ {totalOutstanding.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">未到期</p>
            <p className="text-xl font-bold text-green-600">NT$ {currentAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">已逾期</p>
            <p className="text-xl font-bold text-red-600">NT$ {overdueAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">已收款</p>
            <p className="text-xl font-bold text-blue-600">NT$ {collectedAmount.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">帳齡分析</h2>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "未到期", status: "current", color: "bg-green-500" },
              { label: "1-30 天", status: "30days", color: "bg-yellow-500" },
              { label: "31-60 天", status: "60days", color: "bg-orange-500" },
              { label: "61-90 天", status: "90days", color: "bg-red-500" },
            ].map((aging) => {
              const amt = receivables.filter((r) => r.status === aging.status).reduce((s, r) => s + r.amount, 0);
              const pct = totalOutstanding > 0 ? ((amt / totalOutstanding) * 100).toFixed(1) : "0";
              return (
                <div key={aging.status} className="text-center">
                  <div className={\`\${aging.color} h-2 rounded-full mb-1\`} style={{ width: \`\${pct}%\`, minWidth: "4px" }}></div>
                  <p className="text-xs text-gray-500">{aging.label}</p>
                  <p className="text-sm font-medium">NT$ {amt.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {[
            { key: "all", label: "全部" },
            { key: "current", label: "未到期" },
            { key: "30days", label: "逾期 30 天" },
            { key: "60days", label: "逾期 60 天" },
            { key: "90days", label: "逾期 90 天" },
            { key: "collected", label: "已收款" },
          ].map((opt) => (
            <button key={opt.key} onClick={() => setFilterStatus(opt.key)} className={\`px-3 py-1 rounded-full text-sm \${filterStatus === opt.key ? "bg-blue-600 text-white" : "bg-white text-gray-600 border"}\`}>
              {opt.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">發票編號</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">客戶</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">到期日</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">金額</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">逾期天數</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">狀態</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-blue-600">{item.invoiceNo}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.customer}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.dueDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">NT$ {item.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600">{item.daysPastDue > 0 ? item.daysPastDue + " 天" : "-"}</td>
                  <td className="px-4 py-3 text-center">{statusBadge(item.status)}</td>
                  <td className="px-4 py-3 text-center">
                    {item.status !== "collected" && (
                      <button onClick={() => markCollected(item.id)} className="text-xs text-green-600 hover:underline">標為已收</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8">無符合條件的應收帳款</p>}
        </div>
      </div>
    </div>
  );
}
`;

export const FINANCE_ACCOUNTS_PAYABLE_PAGE = `"use client";
import { useState } from "react";

interface Payable {
  id: number;
  vendor: string;
  invoiceNo: string;
  amount: number;
  dueDate: string;
  approver: string;
  status: "scheduled" | "approved" | "pending" | "paid" | "hold";
}

const initialPayables: Payable[] = [
  { id: 1, vendor: "台灣大哥大股份有限公司", invoiceNo: "AP-2024-001", amount: 28500, dueDate: "2024-03-25", approver: "張經理", status: "approved" },
  { id: 2, vendor: "中華電信企業服務", invoiceNo: "AP-2024-002", amount: 156000, dueDate: "2024-03-30", approver: "李副總", status: "pending" },
  { id: 3, vendor: "遠傳電信雲端服務", invoiceNo: "AP-2024-003", amount: 72000, dueDate: "2024-04-05", approver: "張經理", status: "scheduled" },
  { id: 4, vendor: "好市多企業採購", invoiceNo: "AP-2024-004", amount: 45800, dueDate: "2024-03-20", approver: "王主任", status: "paid" },
  { id: 5, vendor: "震旦行辦公設備", invoiceNo: "AP-2024-005", amount: 198000, dueDate: "2024-04-10", approver: "李副總", status: "hold" },
  { id: 6, vendor: "永豐商業銀行", invoiceNo: "AP-2024-006", amount: 85000, dueDate: "2024-03-28", approver: "張經理", status: "approved" },
];

export default function Home() {
  const [payables, setPayables] = useState<Payable[]>(initialPayables);
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = filterStatus === "all" ? payables : payables.filter((p) => p.status === filterStatus);

  const totalPayable = payables.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0);
  const approvedAmount = payables.filter((p) => p.status === "approved").reduce((s, p) => s + p.amount, 0);
  const pendingAmount = payables.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  const paidAmount = payables.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      scheduled: "bg-blue-100 text-blue-800",
      approved: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-gray-100 text-gray-800",
      hold: "bg-red-100 text-red-800",
    };
    const labels: Record<string, string> = { scheduled: "已排程", approved: "已核准", pending: "待核准", paid: "已付款", hold: "暫緩" };
    return <span className={\`px-2 py-1 rounded-full text-xs font-medium \${styles[status]}\`}>{labels[status]}</span>;
  };

  const updateStatus = (id: number, newStatus: Payable["status"]) => {
    setPayables(payables.map((p) => p.id === id ? { ...p, status: newStatus } : p));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">應付帳款管理</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">待付總額</p>
            <p className="text-xl font-bold text-gray-900">NT$ {totalPayable.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">已核准</p>
            <p className="text-xl font-bold text-green-600">NT$ {approvedAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">待核准</p>
            <p className="text-xl font-bold text-yellow-600">NT$ {pendingAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">已付款</p>
            <p className="text-xl font-bold text-blue-600">NT$ {paidAmount.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {[
            { key: "all", label: "全部" },
            { key: "pending", label: "待核准" },
            { key: "approved", label: "已核准" },
            { key: "scheduled", label: "已排程" },
            { key: "paid", label: "已付款" },
            { key: "hold", label: "暫緩" },
          ].map((opt) => (
            <button key={opt.key} onClick={() => setFilterStatus(opt.key)} className={\`px-3 py-1 rounded-full text-sm \${filterStatus === opt.key ? "bg-blue-600 text-white" : "bg-white text-gray-600 border"}\`}>
              {opt.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">發票編號</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">供應商</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">到期日</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">金額</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">核准人</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">狀態</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-blue-600">{item.invoiceNo}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.vendor}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.dueDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">NT$ {item.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.approver}</td>
                  <td className="px-4 py-3 text-center">{statusBadge(item.status)}</td>
                  <td className="px-4 py-3 text-center space-x-2">
                    {item.status === "pending" && (
                      <button onClick={() => updateStatus(item.id, "approved")} className="text-xs text-green-600 hover:underline">核准</button>
                    )}
                    {item.status === "approved" && (
                      <button onClick={() => updateStatus(item.id, "paid")} className="text-xs text-blue-600 hover:underline">付款</button>
                    )}
                    {item.status !== "paid" && item.status !== "hold" && (
                      <button onClick={() => updateStatus(item.id, "hold")} className="text-xs text-red-600 hover:underline">暫緩</button>
                    )}
                    {item.status === "hold" && (
                      <button onClick={() => updateStatus(item.id, "pending")} className="text-xs text-yellow-600 hover:underline">恢復</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8">無符合條件的應付帳款</p>}
        </div>
      </div>
    </div>
  );
}
`;

export const FINANCE_PAYROLL_PAGE = `"use client";
import { useState } from "react";

interface Employee {
  id: number;
  name: string;
  department: string;
  position: string;
  baseSalary: number;
  overtime: number;
  bonus: number;
  deductions: number;
  status: "active" | "onLeave";
}

const initialEmployees: Employee[] = [
  { id: 1, name: "陳志明", department: "工程部", position: "資深工程師", baseSalary: 85000, overtime: 12500, bonus: 5000, deductions: 8200, status: "active" },
  { id: 2, name: "林美玲", department: "行銷部", position: "行銷經理", baseSalary: 72000, overtime: 0, bonus: 8000, deductions: 7100, status: "active" },
  { id: 3, name: "王建宏", department: "業務部", position: "業務主管", baseSalary: 78000, overtime: 6800, bonus: 15000, deductions: 7600, status: "active" },
  { id: 4, name: "張雅婷", department: "人資部", position: "人資專員", baseSalary: 52000, overtime: 3200, bonus: 2000, deductions: 5400, status: "active" },
  { id: 5, name: "李國華", department: "財務部", position: "財務主管", baseSalary: 90000, overtime: 0, bonus: 10000, deductions: 8800, status: "onLeave" },
  { id: 6, name: "吳佳蓉", department: "工程部", position: "前端工程師", baseSalary: 68000, overtime: 9500, bonus: 3000, deductions: 6700, status: "active" },
  { id: 7, name: "黃偉傑", department: "業務部", position: "業務代表", baseSalary: 48000, overtime: 5600, bonus: 12000, deductions: 5000, status: "active" },
];

export default function Home() {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [filterDept, setFilterDept] = useState("全部");

  const departments = ["全部", ...Array.from(new Set(employees.map((e) => e.department)))];

  const filtered = filterDept === "全部" ? employees : employees.filter((e) => e.department === filterDept);

  const getNet = (e: Employee) => e.baseSalary + e.overtime + e.bonus - e.deductions;

  const totalBase = filtered.reduce((s, e) => s + e.baseSalary, 0);
  const totalOvertime = filtered.reduce((s, e) => s + e.overtime, 0);
  const totalBonus = filtered.reduce((s, e) => s + e.bonus, 0);
  const totalDeductions = filtered.reduce((s, e) => s + e.deductions, 0);
  const totalNet = filtered.reduce((s, e) => s + getNet(e), 0);

  const toggleStatus = (id: number) => {
    setEmployees(employees.map((e) => e.id === id ? { ...e, status: e.status === "active" ? "onLeave" as const : "active" as const } : e));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">薪資計算系統</h1>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">底薪總額</p>
            <p className="text-lg font-bold text-gray-900">NT$ {totalBase.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">加班費</p>
            <p className="text-lg font-bold text-blue-600">NT$ {totalOvertime.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">獎金</p>
            <p className="text-lg font-bold text-green-600">NT$ {totalBonus.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">扣繳合計</p>
            <p className="text-lg font-bold text-red-600">NT$ {totalDeductions.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">實發總額</p>
            <p className="text-lg font-bold text-purple-600">NT$ {totalNet.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            {departments.map((d) => (<option key={d} value={d}>{d}</option>))}
          </select>
          <span className="text-sm text-gray-500 self-center">共 {filtered.length} 位員工</span>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">姓名</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">部門</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">職稱</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">底薪</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">加班費</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">獎金</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">扣繳</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">實發金額</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{emp.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{emp.department}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{emp.position}</td>
                  <td className="px-4 py-3 text-sm text-right">NT$ {emp.baseSalary.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-blue-600">{emp.overtime > 0 ? \`NT$ \${emp.overtime.toLocaleString()}\` : "-"}</td>
                  <td className="px-4 py-3 text-sm text-right text-green-600">{emp.bonus > 0 ? \`NT$ \${emp.bonus.toLocaleString()}\` : "-"}</td>
                  <td className="px-4 py-3 text-sm text-right text-red-600">-NT$ {emp.deductions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">NT$ {getNet(emp).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleStatus(emp.id)} className={\`px-2 py-1 rounded-full text-xs font-medium \${emp.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}\`}>
                      {emp.status === "active" ? "在職" : "請假中"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
`;

export const FINANCE_TAX_FILING_PAGE = `"use client";
import { useState } from "react";

interface TaxItem {
  id: number;
  title: string;
  category: string;
  deadline: string;
  responsible: string;
  completed: boolean;
  notes: string;
}

const initialTaxItems: TaxItem[] = [
  { id: 1, title: "營利事業所得稅結算申報", category: "所得稅", deadline: "2024-05-31", responsible: "李國華", completed: false, notes: "需彙整全年營收資料" },
  { id: 2, title: "營業稅申報（1-2月）", category: "營業稅", deadline: "2024-03-15", responsible: "張雅婷", completed: true, notes: "已完成進銷項對帳" },
  { id: 3, title: "各類所得扣繳申報", category: "扣繳", deadline: "2024-01-31", responsible: "李國華", completed: true, notes: "扣繳憑單已寄發" },
  { id: 4, title: "營業稅申報（3-4月）", category: "營業稅", deadline: "2024-05-15", responsible: "張雅婷", completed: false, notes: "待整理進項發票" },
  { id: 5, title: "印花稅繳納", category: "印花稅", deadline: "2024-04-30", responsible: "王建宏", completed: false, notes: "合約金額需確認" },
  { id: 6, title: "員工薪資所得申報", category: "扣繳", deadline: "2024-02-15", responsible: "張雅婷", completed: true, notes: "已完成線上申報" },
  { id: 7, title: "房屋稅繳納", category: "房屋稅", deadline: "2024-05-31", responsible: "李國華", completed: false, notes: "辦公室租賃相關" },
  { id: 8, title: "暫繳稅款申報", category: "所得稅", deadline: "2024-09-30", responsible: "李國華", completed: false, notes: "依上年度稅額計算" },
];

export default function Home() {
  const [taxItems, setTaxItems] = useState<TaxItem[]>(initialTaxItems);
  const [filterCategory, setFilterCategory] = useState("全部");
  const [showCompleted, setShowCompleted] = useState(true);

  const categories = ["全部", ...Array.from(new Set(taxItems.map((t) => t.category)))];

  const filtered = taxItems.filter((t) => {
    const catMatch = filterCategory === "全部" || t.category === filterCategory;
    const completedMatch = showCompleted || !t.completed;
    return catMatch && completedMatch;
  });

  const totalItems = taxItems.length;
  const completedItems = taxItems.filter((t) => t.completed).length;
  const pendingItems = totalItems - completedItems;
  const completionRate = ((completedItems / totalItems) * 100).toFixed(0);

  const upcomingDeadlines = taxItems.filter((t) => !t.completed).sort((a, b) => a.deadline.localeCompare(b.deadline));

  const toggleCompleted = (id: number) => {
    setTaxItems(taxItems.map((t) => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const getDeadlineColor = (deadline: string, completed: boolean) => {
    if (completed) return "text-gray-400";
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return "text-red-600 font-bold";
    if (days <= 14) return "text-orange-600";
    return "text-gray-600";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">稅務申報助手</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">總項目數</p>
            <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">已完成</p>
            <p className="text-2xl font-bold text-green-600">{completedItems}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">待處理</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingItems}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">完成率</p>
            <p className="text-2xl font-bold text-blue-600">{completionRate}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: \`\${completionRate}%\` }}></div>
            </div>
          </div>
        </div>

        {upcomingDeadlines.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h2 className="text-sm font-semibold text-yellow-800 mb-2">即將到期的申報項目</h2>
            <div className="space-y-1">
              {upcomingDeadlines.slice(0, 3).map((t) => (
                <p key={t.id} className="text-sm text-yellow-700">
                  {t.title} - <span className="font-medium">截止日：{t.deadline}</span> （{t.responsible}）
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 mb-4">
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
          <button onClick={() => setShowCompleted(!showCompleted)} className={\`px-4 py-2 rounded-lg text-sm \${showCompleted ? "bg-white border text-gray-600" : "bg-blue-600 text-white"}\`}>
            {showCompleted ? "隱藏已完成" : "顯示已完成"}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600 w-12">完成</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">項目名稱</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">類別</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">截止日期</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">負責人</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">備註</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((item) => (
                <tr key={item.id} className={\`hover:bg-gray-50 \${item.completed ? "opacity-60" : ""}\`}>
                  <td className="px-4 py-3 text-center">
                    <input type="checkbox" checked={item.completed} onChange={() => toggleCompleted(item.id)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                  </td>
                  <td className={\`px-4 py-3 text-sm font-medium \${item.completed ? "line-through text-gray-400" : "text-gray-900"}\`}>{item.title}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">{item.category}</span></td>
                  <td className={\`px-4 py-3 text-sm \${getDeadlineColor(item.deadline, item.completed)}\`}>{item.deadline}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.responsible}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8">無符合條件的稅務項目</p>}
        </div>
      </div>
    </div>
  );
}
`;

export const FINANCE_CASHFLOW_PAGE = `"use client";
import { useState } from "react";

interface CashFlowEntry {
  id: number;
  date: string;
  description: string;
  type: "inflow" | "outflow";
  category: string;
  amount: number;
}

const initialEntries: CashFlowEntry[] = [
  { id: 1, date: "2024-03-01", description: "客戶 A 合約收款", type: "inflow", category: "營業收入", amount: 450000 },
  { id: 2, date: "2024-03-03", description: "辦公室租金", type: "outflow", category: "租金", amount: 85000 },
  { id: 3, date: "2024-03-05", description: "員工薪資發放", type: "outflow", category: "人事費用", amount: 680000 },
  { id: 4, date: "2024-03-08", description: "客戶 B 專案款項", type: "inflow", category: "營業收入", amount: 320000 },
  { id: 5, date: "2024-03-10", description: "雲端服務費用", type: "outflow", category: "營運費用", amount: 42000 },
  { id: 6, date: "2024-03-12", description: "設備採購", type: "outflow", category: "資本支出", amount: 156000 },
  { id: 7, date: "2024-03-15", description: "客戶 C 維護費", type: "inflow", category: "服務收入", amount: 180000 },
  { id: 8, date: "2024-03-18", description: "行銷活動費用", type: "outflow", category: "行銷費用", amount: 95000 },
];

export default function Home() {
  const [entries, setEntries] = useState<CashFlowEntry[]>(initialEntries);
  const [filterType, setFilterType] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState<"inflow" | "outflow">("inflow");
  const [newCategory, setNewCategory] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const filtered = filterType === "all" ? entries : entries.filter((e) => e.type === filterType);

  const totalInflow = entries.filter((e) => e.type === "inflow").reduce((s, e) => s + e.amount, 0);
  const totalOutflow = entries.filter((e) => e.type === "outflow").reduce((s, e) => s + e.amount, 0);
  const netCashFlow = totalInflow - totalOutflow;
  const openingBalance = 1250000;

  const sortedEntries = [...filtered].sort((a, b) => a.date.localeCompare(b.date));

  let runningBalance = openingBalance;
  const entriesWithBalance = sortedEntries.map((entry) => {
    if (entry.type === "inflow") {
      runningBalance += entry.amount;
    } else {
      runningBalance -= entry.amount;
    }
    return { ...entry, balance: runningBalance };
  });

  const addEntry = () => {
    if (!newDesc || !newAmount || !newCategory) return;
    const entry: CashFlowEntry = {
      id: Date.now(),
      date: new Date().toISOString().split("T")[0],
      description: newDesc,
      type: newType,
      category: newCategory,
      amount: parseInt(newAmount),
    };
    setEntries([...entries, entry]);
    setNewDesc("");
    setNewAmount("");
    setNewCategory("");
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">現金流量預測</h1>
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            {showForm ? "取消" : "＋ 新增項目"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">期初餘額</p>
            <p className="text-xl font-bold text-gray-900">NT$ {openingBalance.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">總流入</p>
            <p className="text-xl font-bold text-green-600">NT$ {totalInflow.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">總流出</p>
            <p className="text-xl font-bold text-red-600">NT$ {totalOutflow.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">淨現金流</p>
            <p className={\`text-xl font-bold \${netCashFlow >= 0 ? "text-green-600" : "text-red-600"}\`}>
              {netCashFlow >= 0 ? "+" : ""}NT$ {netCashFlow.toLocaleString()}
            </p>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">新增現金流項目</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="說明" className="border rounded-lg px-3 py-2" />
              <select value={newType} onChange={(e) => setNewType(e.target.value as "inflow" | "outflow")} className="border rounded-lg px-3 py-2">
                <option value="inflow">流入（收入）</option>
                <option value="outflow">流出（支出）</option>
              </select>
              <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="類別" className="border rounded-lg px-3 py-2" />
              <input value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="金額 (TWD)" type="number" className="border rounded-lg px-3 py-2" />
            </div>
            <button onClick={addEntry} className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition">新增</button>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          {[
            { key: "all", label: "全部" },
            { key: "inflow", label: "流入" },
            { key: "outflow", label: "流出" },
          ].map((opt) => (
            <button key={opt.key} onClick={() => setFilterType(opt.key)} className={\`px-3 py-1 rounded-full text-sm \${filterType === opt.key ? "bg-blue-600 text-white" : "bg-white text-gray-600 border"}\`}>
              {opt.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">日期</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">說明</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">類別</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">類型</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">金額</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">累計餘額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {entriesWithBalance.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{entry.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{entry.description}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{entry.category}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={\`px-2 py-1 rounded-full text-xs font-medium \${entry.type === "inflow" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}\`}>
                      {entry.type === "inflow" ? "流入" : "流出"}
                    </span>
                  </td>
                  <td className={\`px-4 py-3 text-sm text-right font-medium \${entry.type === "inflow" ? "text-green-600" : "text-red-600"}\`}>
                    {entry.type === "inflow" ? "+" : "-"}NT$ {entry.amount.toLocaleString()}
                  </td>
                  <td className={\`px-4 py-3 text-sm text-right font-bold \${entry.balance >= 0 ? "text-gray-900" : "text-red-600"}\`}>
                    NT$ {entry.balance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {entriesWithBalance.length === 0 && <p className="text-center text-gray-400 py-8">無現金流紀錄</p>}
        </div>
      </div>
    </div>
  );
}
`;
