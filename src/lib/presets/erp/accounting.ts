import type { PresetOverlay } from "../index";

const TYPES_FILE = `export interface Transaction {
  id: number;
  date: string;
  description: string;
  account: string;
  debit: number;
  credit: number;
  category: "income" | "expense";
}

export interface Account {
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  counterparty: string;
  type: "receivable" | "payable";
  date: string;
  amountBeforeTax: number;
  tax: number;
  totalAmount: number;
  status: "draft" | "issued" | "paid" | "overdue";
}

export interface ReportData {
  month: string;
  revenue: number;
  expense: number;
  profit: number;
}
`;

const MOCK_DATA_FILE = `import { Transaction, Account, Invoice, ReportData } from "./types";

export const accounts: Account[] = [
  { code: "1101", name: "現金", type: "asset" },
  { code: "1102", name: "銀行存款", type: "asset" },
  { code: "1103", name: "應收帳款", type: "asset" },
  { code: "2101", name: "應付帳款", type: "liability" },
  { code: "2102", name: "應付薪資", type: "liability" },
  { code: "2103", name: "應付營業稅", type: "liability" },
  { code: "3101", name: "業主資本", type: "equity" },
  { code: "4101", name: "銷貨收入", type: "revenue" },
  { code: "4102", name: "服務收入", type: "revenue" },
  { code: "4103", name: "利息收入", type: "revenue" },
  { code: "5101", name: "銷貨成本", type: "expense" },
  { code: "5201", name: "薪資費用", type: "expense" },
  { code: "5202", name: "租金費用", type: "expense" },
  { code: "5203", name: "水電費", type: "expense" },
  { code: "5204", name: "辦公用品", type: "expense" },
  { code: "5205", name: "交通費", type: "expense" },
  { code: "5206", name: "廣告費", type: "expense" },
  { code: "5207", name: "保險費", type: "expense" },
  { code: "5208", name: "折舊費用", type: "expense" },
  { code: "5209", name: "雜費", type: "expense" },
];

export const transactions: Transaction[] = [
  { id: 1, date: "2024-10-01", description: "10月份辦公室租金", account: "租金費用", debit: 45000, credit: 0, category: "expense" },
  { id: 2, date: "2024-10-03", description: "客戶A - 網站開發案收入", account: "服務收入", debit: 0, credit: 180000, category: "income" },
  { id: 3, date: "2024-10-05", description: "員工薪資(5人)", account: "薪資費用", debit: 320000, credit: 0, category: "expense" },
  { id: 4, date: "2024-10-08", description: "辦公室文具採購", account: "辦公用品", debit: 3500, credit: 0, category: "expense" },
  { id: 5, date: "2024-10-10", description: "客戶B - 系統維護費", account: "服務收入", debit: 0, credit: 50000, category: "income" },
  { id: 6, date: "2024-10-12", description: "台電電費", account: "水電費", debit: 8200, credit: 0, category: "expense" },
  { id: 7, date: "2024-10-15", description: "Google Ads 廣告費", account: "廣告費", debit: 25000, credit: 0, category: "expense" },
  { id: 8, date: "2024-10-18", description: "計程車交通費", account: "交通費", debit: 2800, credit: 0, category: "expense" },
  { id: 9, date: "2024-10-22", description: "客戶C - APP開發第一期款", account: "服務收入", debit: 0, credit: 250000, category: "income" },
  { id: 10, date: "2024-10-25", description: "勞健保費用", account: "保險費", debit: 48000, credit: 0, category: "expense" },
  { id: 11, date: "2024-10-28", description: "銀行存款利息", account: "利息收入", debit: 0, credit: 1200, category: "income" },
  { id: 12, date: "2024-11-01", description: "11月份辦公室租金", account: "租金費用", debit: 45000, credit: 0, category: "expense" },
  { id: 13, date: "2024-11-03", description: "客戶D - 顧問諮詢費", account: "服務收入", debit: 0, credit: 80000, category: "income" },
  { id: 14, date: "2024-11-05", description: "員工薪資(5人)", account: "薪資費用", debit: 320000, credit: 0, category: "expense" },
  { id: 15, date: "2024-11-08", description: "印表機碳粉匣", account: "辦公用品", debit: 4200, credit: 0, category: "expense" },
  { id: 16, date: "2024-11-10", description: "客戶A - 網站維護費", account: "服務收入", debit: 0, credit: 30000, category: "income" },
  { id: 17, date: "2024-11-12", description: "台電電費", account: "水電費", debit: 7800, credit: 0, category: "expense" },
  { id: 18, date: "2024-11-15", description: "Facebook 廣告費", account: "廣告費", debit: 18000, credit: 0, category: "expense" },
  { id: 19, date: "2024-11-20", description: "客戶C - APP開發第二期款", account: "服務收入", debit: 0, credit: 250000, category: "income" },
  { id: 20, date: "2024-11-22", description: "高鐵交通費(台北-台中出差)", account: "交通費", debit: 5600, credit: 0, category: "expense" },
  { id: 21, date: "2024-11-25", description: "勞健保費用", account: "保險費", debit: 48000, credit: 0, category: "expense" },
  { id: 22, date: "2024-11-28", description: "影印機維修", account: "雜費", debit: 3500, credit: 0, category: "expense" },
  { id: 23, date: "2024-12-01", description: "12月份辦公室租金", account: "租金費用", debit: 45000, credit: 0, category: "expense" },
  { id: 24, date: "2024-12-03", description: "客戶E - 電商平台開發", account: "服務收入", debit: 0, credit: 350000, category: "income" },
  { id: 25, date: "2024-12-05", description: "員工薪資(5人)", account: "薪資費用", debit: 320000, credit: 0, category: "expense" },
  { id: 26, date: "2024-12-08", description: "年終尾牙餐費", account: "雜費", debit: 35000, credit: 0, category: "expense" },
  { id: 27, date: "2024-12-10", description: "客戶B - 年度維護合約", account: "服務收入", debit: 0, credit: 120000, category: "income" },
  { id: 28, date: "2024-12-12", description: "台電電費", account: "水電費", debit: 9100, credit: 0, category: "expense" },
  { id: 29, date: "2024-12-15", description: "Google Ads 廣告費", account: "廣告費", debit: 30000, credit: 0, category: "expense" },
  { id: 30, date: "2024-12-18", description: "銀行存款利息", account: "利息收入", debit: 0, credit: 1500, category: "income" },
  { id: 31, date: "2024-12-20", description: "辦公室清潔費", account: "雜費", debit: 6000, credit: 0, category: "expense" },
  { id: 32, date: "2024-12-25", description: "勞健保費用", account: "保險費", debit: 48000, credit: 0, category: "expense" },
];

export const invoices: Invoice[] = [
  { id: 1, invoiceNumber: "INV-2024-001", counterparty: "客戶A - 台灣數位科技", type: "receivable", date: "2024-10-03", amountBeforeTax: 171429, tax: 8571, totalAmount: 180000, status: "paid" },
  { id: 2, invoiceNumber: "INV-2024-002", counterparty: "客戶B - 元氣生活館", type: "receivable", date: "2024-10-10", amountBeforeTax: 47619, tax: 2381, totalAmount: 50000, status: "paid" },
  { id: 3, invoiceNumber: "INV-2024-003", counterparty: "客戶C - 創新移動科技", type: "receivable", date: "2024-10-22", amountBeforeTax: 238095, tax: 11905, totalAmount: 250000, status: "paid" },
  { id: 4, invoiceNumber: "INV-2024-004", counterparty: "客戶D - 永豐顧問", type: "receivable", date: "2024-11-03", amountBeforeTax: 76190, tax: 3810, totalAmount: 80000, status: "paid" },
  { id: 5, invoiceNumber: "INV-2024-005", counterparty: "客戶C - 創新移動科技", type: "receivable", date: "2024-11-20", amountBeforeTax: 238095, tax: 11905, totalAmount: 250000, status: "paid" },
  { id: 6, invoiceNumber: "INV-2024-006", counterparty: "客戶E - 購物天堂", type: "receivable", date: "2024-12-03", amountBeforeTax: 333333, tax: 16667, totalAmount: 350000, status: "issued" },
  { id: 7, invoiceNumber: "INV-2024-007", counterparty: "客戶B - 元氣生活館", type: "receivable", date: "2024-12-10", amountBeforeTax: 114286, tax: 5714, totalAmount: 120000, status: "issued" },
  { id: 8, invoiceNumber: "BIL-2024-001", counterparty: "房東 - 信義商辦", type: "payable", date: "2024-12-01", amountBeforeTax: 42857, tax: 2143, totalAmount: 45000, status: "paid" },
  { id: 9, invoiceNumber: "BIL-2024-002", counterparty: "Google Taiwan", type: "payable", date: "2024-12-15", amountBeforeTax: 28571, tax: 1429, totalAmount: 30000, status: "issued" },
  { id: 10, invoiceNumber: "BIL-2024-003", counterparty: "台灣電力公司", type: "payable", date: "2024-12-12", amountBeforeTax: 8667, tax: 433, totalAmount: 9100, status: "overdue" },
];

export const monthlyReportData: ReportData[] = [
  { month: "2024-10", revenue: 481200, expense: 452500, profit: 28700 },
  { month: "2024-11", revenue: 360000, expense: 452100, profit: -92100 },
  { month: "2024-12", revenue: 471500, expense: 493100, profit: -21600 },
];
`;

const DASHBOARD_PAGE = `"use client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const trendData = [
  { month: "10月", revenue: 481200, expense: 452500 },
  { month: "11月", revenue: 360000, expense: 452100 },
  { month: "12月", revenue: 471500, expense: 493100 },
];

const plSummary = {
  totalRevenue: 1312700,
  totalExpense: 1397700,
  netProfit: -85000,
};

const cashBalance = 2850000;

const arTotal = 470000;
const apTotal = 84100;

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">會計總帳系統</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">累計營收</p>
            <p className="text-2xl font-bold text-blue-600">NT$ {plSummary.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">累計費用</p>
            <p className="text-2xl font-bold text-orange-600">NT$ {plSummary.totalExpense.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">現金餘額</p>
            <p className="text-2xl font-bold text-green-600">NT$ {cashBalance.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">淨利</p>
            <p className={\`text-2xl font-bold \${plSummary.netProfit >= 0 ? "text-green-600" : "text-red-600"}\`}>
              NT$ {plSummary.netProfit.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">應收帳款 (AR)</p>
            <p className="text-2xl font-bold text-blue-600">NT$ {arTotal.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">2 張未收發票</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">應付帳款 (AP)</p>
            <p className="text-2xl font-bold text-orange-600">NT$ {apTotal.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">2 張未付帳單</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">營收與費用趨勢</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => \`\${(v / 1000).toFixed(0)}K\`} />
              <Tooltip formatter={(v: number) => \`NT$ \${v.toLocaleString()}\`} />
              <Legend />
              <Bar dataKey="revenue" name="營收" fill="#3b82f6" />
              <Bar dataKey="expense" name="費用" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
`;

const TRANSACTIONS_PAGE = `"use client";
import { useState } from "react";

const initialTransactions = [
  { id: 1, date: "2024-10-01", description: "10月份辦公室租金", account: "租金費用", debit: 45000, credit: 0, category: "expense" },
  { id: 2, date: "2024-10-03", description: "客戶A - 網站開發案收入", account: "服務收入", debit: 0, credit: 180000, category: "income" },
  { id: 3, date: "2024-10-05", description: "員工薪資(5人)", account: "薪資費用", debit: 320000, credit: 0, category: "expense" },
  { id: 4, date: "2024-10-08", description: "辦公室文具採購", account: "辦公用品", debit: 3500, credit: 0, category: "expense" },
  { id: 5, date: "2024-10-10", description: "客戶B - 系統維護費", account: "服務收入", debit: 0, credit: 50000, category: "income" },
  { id: 6, date: "2024-10-12", description: "台電電費", account: "水電費", debit: 8200, credit: 0, category: "expense" },
  { id: 7, date: "2024-10-15", description: "Google Ads 廣告費", account: "廣告費", debit: 25000, credit: 0, category: "expense" },
  { id: 8, date: "2024-10-18", description: "計程車交通費", account: "交通費", debit: 2800, credit: 0, category: "expense" },
  { id: 9, date: "2024-10-22", description: "客戶C - APP開發第一期款", account: "服務收入", debit: 0, credit: 250000, category: "income" },
  { id: 10, date: "2024-10-25", description: "勞健保費用", account: "保險費", debit: 48000, credit: 0, category: "expense" },
  { id: 11, date: "2024-11-01", description: "11月份辦公室租金", account: "租金費用", debit: 45000, credit: 0, category: "expense" },
  { id: 12, date: "2024-11-05", description: "員工薪資(5人)", account: "薪資費用", debit: 320000, credit: 0, category: "expense" },
  { id: 13, date: "2024-11-10", description: "客戶A - 網站維護費", account: "服務收入", debit: 0, credit: 30000, category: "income" },
  { id: 14, date: "2024-11-20", description: "客戶C - APP開發第二期款", account: "服務收入", debit: 0, credit: 250000, category: "income" },
  { id: 15, date: "2024-12-01", description: "12月份辦公室租金", account: "租金費用", debit: 45000, credit: 0, category: "expense" },
  { id: 16, date: "2024-12-03", description: "客戶E - 電商平台開發", account: "服務收入", debit: 0, credit: 350000, category: "income" },
  { id: 17, date: "2024-12-05", description: "員工薪資(5人)", account: "薪資費用", debit: 320000, credit: 0, category: "expense" },
  { id: 18, date: "2024-12-08", description: "年終尾牙餐費", account: "雜費", debit: 35000, credit: 0, category: "expense" },
  { id: 19, date: "2024-12-10", description: "客戶B - 年度維護合約", account: "服務收入", debit: 0, credit: 120000, category: "income" },
  { id: 20, date: "2024-12-15", description: "Google Ads 廣告費", account: "廣告費", debit: 30000, credit: 0, category: "expense" },
];

const months = ["全部", "2024-10", "2024-11", "2024-12"];
const categories = ["全部", "income", "expense"];
const categoryLabels: Record<string, string> = { income: "收入", expense: "支出" };

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [filterMonth, setFilterMonth] = useState("全部");
  const [filterCat, setFilterCat] = useState("全部");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: "", description: "", account: "", debit: "", credit: "", category: "expense" });

  const filtered = transactions
    .filter((t) => filterMonth === "全部" || t.date.startsWith(filterMonth))
    .filter((t) => filterCat === "全部" || t.category === filterCat);

  const totalDebit = filtered.reduce((sum, t) => sum + t.debit, 0);
  const totalCredit = filtered.reduce((sum, t) => sum + t.credit, 0);

  const handleAdd = () => {
    if (!form.date || !form.description || !form.account) return;
    setTransactions([...transactions, {
      id: transactions.length + 1,
      date: form.date,
      description: form.description,
      account: form.account,
      debit: Number(form.debit) || 0,
      credit: Number(form.credit) || 0,
      category: form.category as "income" | "expense",
    }]);
    setForm({ date: "", description: "", account: "", debit: "", credit: "", category: "expense" });
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">傳票分錄</h1>
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            {showForm ? "取消" : "新增分錄"}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="border rounded px-2 py-1.5 text-sm" />
              <input placeholder="摘要" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border rounded px-2 py-1.5 text-sm col-span-2" />
              <input placeholder="科目" value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} className="border rounded px-2 py-1.5 text-sm" />
              <input placeholder="借方" type="number" value={form.debit} onChange={(e) => setForm({ ...form, debit: e.target.value })} className="border rounded px-2 py-1.5 text-sm" />
              <input placeholder="貸方" type="number" value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} className="border rounded px-2 py-1.5 text-sm" />
            </div>
            <div className="flex items-center gap-3 mt-3">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="border rounded px-2 py-1.5 text-sm">
                <option value="expense">支出</option>
                <option value="income">收入</option>
              </select>
              <button onClick={handleAdd} className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700">儲存</button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mb-4">
          <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            {months.map((m) => <option key={m} value={m}>{m === "全部" ? "全部月份" : m}</option>)}
          </select>
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            {categories.map((c) => <option key={c} value={c}>{c === "全部" ? "全部類型" : categoryLabels[c]}</option>)}
          </select>
          <div className="ml-auto text-sm text-gray-500">
            借方合計: <span className="font-medium text-gray-900">NT$ {totalDebit.toLocaleString()}</span>
            {" | "}
            貸方合計: <span className="font-medium text-gray-900">NT$ {totalCredit.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">摘要</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">科目</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">借方 NT$</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">貸方 NT$</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">類別</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{t.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{t.description}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{t.account}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">{t.debit > 0 ? \`NT$ \${t.debit.toLocaleString()}\` : ""}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">{t.credit > 0 ? \`NT$ \${t.credit.toLocaleString()}\` : ""}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={\`px-2 py-1 rounded-full text-xs font-medium \${t.category === "income" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}\`}>
                      {categoryLabels[t.category]}
                    </span>
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

const INVOICES_PAGE = `"use client";
import { useState } from "react";

const statusLabels: Record<string, string> = { draft: "草稿", issued: "已開立", paid: "已收付", overdue: "逾期" };
const statusColors: Record<string, string> = { draft: "bg-gray-100 text-gray-800", issued: "bg-blue-100 text-blue-800", paid: "bg-green-100 text-green-800", overdue: "bg-red-100 text-red-800" };
const typeLabels: Record<string, string> = { receivable: "應收", payable: "應付" };

const invoices = [
  { id: 1, invoiceNumber: "INV-2024-001", counterparty: "客戶A - 台灣數位科技", type: "receivable", date: "2024-10-03", amountBeforeTax: 171429, tax: 8571, totalAmount: 180000, status: "paid" },
  { id: 2, invoiceNumber: "INV-2024-002", counterparty: "客戶B - 元氣生活館", type: "receivable", date: "2024-10-10", amountBeforeTax: 47619, tax: 2381, totalAmount: 50000, status: "paid" },
  { id: 3, invoiceNumber: "INV-2024-003", counterparty: "客戶C - 創新移動科技", type: "receivable", date: "2024-10-22", amountBeforeTax: 238095, tax: 11905, totalAmount: 250000, status: "paid" },
  { id: 4, invoiceNumber: "INV-2024-004", counterparty: "客戶D - 永豐顧問", type: "receivable", date: "2024-11-03", amountBeforeTax: 76190, tax: 3810, totalAmount: 80000, status: "paid" },
  { id: 5, invoiceNumber: "INV-2024-005", counterparty: "客戶C - 創新移動科技", type: "receivable", date: "2024-11-20", amountBeforeTax: 238095, tax: 11905, totalAmount: 250000, status: "paid" },
  { id: 6, invoiceNumber: "INV-2024-006", counterparty: "客戶E - 購物天堂", type: "receivable", date: "2024-12-03", amountBeforeTax: 333333, tax: 16667, totalAmount: 350000, status: "issued" },
  { id: 7, invoiceNumber: "INV-2024-007", counterparty: "客戶B - 元氣生活館", type: "receivable", date: "2024-12-10", amountBeforeTax: 114286, tax: 5714, totalAmount: 120000, status: "issued" },
  { id: 8, invoiceNumber: "BIL-2024-001", counterparty: "房東 - 信義商辦", type: "payable", date: "2024-12-01", amountBeforeTax: 42857, tax: 2143, totalAmount: 45000, status: "paid" },
  { id: 9, invoiceNumber: "BIL-2024-002", counterparty: "Google Taiwan", type: "payable", date: "2024-12-15", amountBeforeTax: 28571, tax: 1429, totalAmount: 30000, status: "issued" },
  { id: 10, invoiceNumber: "BIL-2024-003", counterparty: "台灣電力公司", type: "payable", date: "2024-12-12", amountBeforeTax: 8667, tax: 433, totalAmount: 9100, status: "overdue" },
];

export default function InvoicesPage() {
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = invoices
    .filter((inv) => filterType === "all" || inv.type === filterType)
    .filter((inv) => filterStatus === "all" || inv.status === filterStatus);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">發票管理</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">未收應收帳款</p>
            <p className="text-2xl font-bold text-blue-600">NT$ 470,000</p>
            <p className="text-xs text-gray-400">2 張未收發票</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">未付應付帳款</p>
            <p className="text-2xl font-bold text-orange-600">NT$ 39,100</p>
            <p className="text-xs text-gray-400">2 張未付帳單</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">營業稅稅率</p>
            <p className="text-2xl font-bold text-gray-900">5%</p>
            <p className="text-xs text-gray-400">依統一發票法規</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="all">全部類型</option>
            <option value="receivable">應收</option>
            <option value="payable">應付</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="all">全部狀態</option>
            <option value="draft">草稿</option>
            <option value="issued">已開立</option>
            <option value="paid">已收付</option>
            <option value="overdue">逾期</option>
          </select>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">發票號碼</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">對象</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">收/付</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">未稅金額</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">稅額(5%)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">含稅總額</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">狀態</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-blue-600">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{inv.counterparty}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={\`px-2 py-1 rounded-full text-xs font-medium \${inv.type === "receivable" ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}\`}>
                      {typeLabels[inv.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{inv.date}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">NT$ {inv.amountBeforeTax.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-500">NT$ {inv.tax.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">NT$ {inv.totalAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={\`px-2 py-1 rounded-full text-xs font-medium \${statusColors[inv.status]}\`}>{statusLabels[inv.status]}</span>
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

const REPORTS_PAGE = `"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const monthlyPL = [
  { month: "10月", revenue: 481200, expense: 452500, profit: 28700 },
  { month: "11月", revenue: 360000, expense: 452100, profit: -92100 },
  { month: "12月", revenue: 471500, expense: 493100, profit: -21600 },
];

const expenseByCategory = [
  { category: "薪資費用", amount: 960000 },
  { category: "租金費用", amount: 135000 },
  { category: "保險費", amount: 144000 },
  { category: "廣告費", amount: 73000 },
  { category: "雜費", amount: 44500 },
  { category: "水電費", amount: 25100 },
  { category: "交通費", amount: 8400 },
  { category: "辦公用品", amount: 7700 },
];

export default function ReportsPage() {
  const latestMonth = monthlyPL[monthlyPL.length - 1];
  const prevMonth = monthlyPL[monthlyPL.length - 2];
  const revenueChange = latestMonth.revenue - prevMonth.revenue;
  const revenueChangePercent = ((revenueChange / prevMonth.revenue) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">財務報表</h1>

        <div className="bg-white rounded-lg shadow p-5 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">月度損益摘要</h2>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">月份</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">營收</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">費用</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">淨利</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">利潤率</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {monthlyPL.map((m) => (
                  <tr key={m.month}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.month}</td>
                    <td className="px-4 py-3 text-sm text-right text-blue-600">NT$ {m.revenue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right text-orange-600">NT$ {m.expense.toLocaleString()}</td>
                    <td className={\`px-4 py-3 text-sm text-right font-medium \${m.profit >= 0 ? "text-green-600" : "text-red-600"}\`}>
                      NT$ {m.profit.toLocaleString()}
                    </td>
                    <td className={\`px-4 py-3 text-sm text-right \${m.profit >= 0 ? "text-green-600" : "text-red-600"}\`}>
                      {((m.profit / m.revenue) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">營收比較（vs 上月）</h2>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-2xl font-bold text-gray-900">NT$ {latestMonth.revenue.toLocaleString()}</span>
              <span className={\`text-sm font-medium \${revenueChange >= 0 ? "text-green-600" : "text-red-600"}\`}>
                {revenueChange >= 0 ? "+" : ""}{revenueChangePercent}%
              </span>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyPL}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => \`\${(v / 1000).toFixed(0)}K\`} />
                <Tooltip formatter={(v: number) => \`NT$ \${v.toLocaleString()}\`} />
                <Bar dataKey="revenue" name="營收" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">費用分類統計</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={expenseByCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => \`\${(v / 1000).toFixed(0)}K\`} />
                <YAxis type="category" dataKey="category" width={80} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => \`NT$ \${v.toLocaleString()}\`} />
                <Bar dataKey="amount" name="費用" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

export const ERP_ACCOUNTING: PresetOverlay = {
  templateId: "erp",
  files: [
    { path: "src/app/page.tsx", content: DASHBOARD_PAGE },
    { path: "src/app/transactions/page.tsx", content: TRANSACTIONS_PAGE },
    { path: "src/app/invoices/page.tsx", content: INVOICES_PAGE },
    { path: "src/app/reports/page.tsx", content: REPORTS_PAGE },
    { path: "src/lib/types.ts", content: TYPES_FILE },
    { path: "src/lib/mock-data.ts", content: MOCK_DATA_FILE },
  ],
  requiredServices: [
    { category: "database", suggestedTypes: ["built_in_supabase", "postgresql"], purpose: "儲存帳務資料" },
  ],
};
