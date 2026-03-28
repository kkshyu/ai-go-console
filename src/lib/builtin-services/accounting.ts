import type { ServiceResponse } from "../builtin-industry";

interface JournalEntry {
  id: string;
  date: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  description: string;
  reference: string;
}

interface Invoice {
  id: string;
  number: string;
  client: string;
  amount: number;
  tax: number;
  total: number;
  issueDate: string;
  dueDate: string;
  status: string;
}

interface Report {
  id: string;
  name: string;
  period: string;
  type: string;
  generatedAt: string;
  revenue?: number;
  expenses?: number;
  netIncome?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  equity?: number;
}

interface TaxRecord {
  id: string;
  type: string;
  period: string;
  salesTax: number;
  inputTax: number;
  payable: number;
  dueDate: string;
  status: string;
}

const journalEntries: JournalEntry[] = [
  {
    id: "je-1",
    date: "2026-03-01",
    debitAccount: "1141 應收帳款",
    creditAccount: "4111 銷貨收入",
    amount: 150000,
    description: "三月份銷貨收入認列",
    reference: "INV-2026-0301",
  },
  {
    id: "je-2",
    date: "2026-03-05",
    debitAccount: "6111 薪資支出",
    creditAccount: "1111 現金",
    amount: 280000,
    description: "三月份員工薪資發放",
    reference: "PAY-2026-03",
  },
  {
    id: "je-3",
    date: "2026-03-10",
    debitAccount: "1111 現金",
    creditAccount: "1141 應收帳款",
    amount: 95000,
    description: "收回二月份應收帳款",
    reference: "RCV-2026-0310",
  },
  {
    id: "je-4",
    date: "2026-03-15",
    debitAccount: "6211 租金支出",
    creditAccount: "1111 現金",
    amount: 45000,
    description: "辦公室三月份租金",
    reference: "RENT-2026-03",
  },
];

const invoices: Invoice[] = [
  {
    id: "inv-1",
    number: "INV-2026-0301",
    client: "大同實業股份有限公司",
    amount: 150000,
    tax: 7500,
    total: 157500,
    issueDate: "2026-03-01",
    dueDate: "2026-04-01",
    status: "sent",
  },
  {
    id: "inv-2",
    number: "INV-2026-0215",
    client: "永豐貿易有限公司",
    amount: 95000,
    tax: 4750,
    total: 99750,
    issueDate: "2026-02-15",
    dueDate: "2026-03-15",
    status: "paid",
  },
  {
    id: "inv-3",
    number: "INV-2026-0120",
    client: "鑫泰國際企業有限公司",
    amount: 68000,
    tax: 3400,
    total: 71400,
    issueDate: "2026-01-20",
    dueDate: "2026-02-20",
    status: "overdue",
  },
];

const reports: Report[] = [
  {
    id: "rpt-1",
    name: "2026年第一季損益表",
    period: "2026-Q1",
    type: "income_statement",
    generatedAt: "2026-03-28T10:00:00",
    revenue: 1250000,
    expenses: 890000,
    netIncome: 360000,
  },
  {
    id: "rpt-2",
    name: "2026年三月資產負債表",
    period: "2026-03",
    type: "balance_sheet",
    generatedAt: "2026-03-28T10:15:00",
    totalAssets: 8500000,
    totalLiabilities: 3200000,
    equity: 5300000,
  },
];

const taxRecords: TaxRecord[] = [
  {
    id: "tax-1",
    type: "營業稅",
    period: "2026-01-02",
    salesTax: 62500,
    inputTax: 38000,
    payable: 24500,
    dueDate: "2026-03-15",
    status: "paid",
  },
  {
    id: "tax-2",
    type: "營業稅",
    period: "2026-03-04",
    salesTax: 71200,
    inputTax: 42800,
    payable: 28400,
    dueDate: "2026-05-15",
    status: "pending",
  },
  {
    id: "tax-3",
    type: "營業稅",
    period: "2025-11-12",
    salesTax: 58000,
    inputTax: 35500,
    payable: 22500,
    dueDate: "2026-01-15",
    status: "paid",
  },
];

function listJournalEntries(filters?: Record<string, unknown>) {
  let items = [...journalEntries];
  if (filters?.date) items = items.filter((j) => j.date === filters.date);
  if (filters?.debitAccount)
    items = items.filter((j) =>
      j.debitAccount.includes(filters.debitAccount as string)
    );
  if (filters?.creditAccount)
    items = items.filter((j) =>
      j.creditAccount.includes(filters.creditAccount as string)
    );
  return { items, total: items.length };
}

function createJournalEntry(
  debitAccount: string,
  creditAccount: string,
  amount: number,
  description: string,
  reference: string
) {
  const newEntry: JournalEntry = {
    id: `je-${journalEntries.length + 1}`,
    date: new Date().toISOString().split("T")[0],
    debitAccount,
    creditAccount,
    amount,
    description,
    reference,
  };
  journalEntries.push(newEntry);
  return { journalEntry: newEntry };
}

function listInvoices(filters?: Record<string, unknown>) {
  let items = [...invoices];
  if (filters?.status)
    items = items.filter((i) => i.status === filters.status);
  if (filters?.client)
    items = items.filter((i) =>
      i.client.includes(filters.client as string)
    );
  return { items, total: items.length };
}

function getInvoice(id: string) {
  const invoice = invoices.find((i) => i.id === id);
  if (!invoice) return null;
  const relatedEntries = journalEntries.filter(
    (j) => j.reference === invoice.number
  );
  return { ...invoice, journalEntries: relatedEntries };
}

function listReports(filters?: Record<string, unknown>) {
  let items = [...reports];
  if (filters?.type) items = items.filter((r) => r.type === filters.type);
  if (filters?.period)
    items = items.filter((r) => r.period === filters.period);
  return { items, total: items.length };
}

function listTaxRecords(filters?: Record<string, unknown>) {
  let items = [...taxRecords];
  if (filters?.status)
    items = items.filter((t) => t.status === filters.status);
  if (filters?.type) items = items.filter((t) => t.type === filters.type);
  return { items, total: items.length };
}

/**
 * Accounting Service API
 * Actions: listJournalEntries, createJournalEntry, listInvoices, getInvoice, listReports, listTaxRecords
 */
export function handleRequest(body: Record<string, unknown>): ServiceResponse {
  const action = body.action as string;
  if (!action) {
    return {
      status: 400,
      body: {
        error:
          "Missing 'action' field. Available: listJournalEntries, createJournalEntry, listInvoices, getInvoice, listReports, listTaxRecords",
      },
    };
  }

  switch (action) {
    case "listJournalEntries":
      return {
        status: 200,
        body: listJournalEntries(body.filters as Record<string, unknown>),
      };
    case "createJournalEntry": {
      const result = createJournalEntry(
        body.debitAccount as string,
        body.creditAccount as string,
        body.amount as number,
        body.description as string,
        (body.reference as string) ?? ""
      );
      return { status: 201, body: result };
    }
    case "listInvoices":
      return {
        status: 200,
        body: listInvoices(body.filters as Record<string, unknown>),
      };
    case "getInvoice": {
      const result = getInvoice(body.id as string);
      if (!result)
        return { status: 404, body: { error: "Invoice not found" } };
      return { status: 200, body: result };
    }
    case "listReports":
      return {
        status: 200,
        body: listReports(body.filters as Record<string, unknown>),
      };
    case "listTaxRecords":
      return {
        status: 200,
        body: listTaxRecords(body.filters as Record<string, unknown>),
      };
    default:
      return { status: 400, body: { error: `Unknown action: ${action}` } };
  }
}
