import type { ServiceResponse } from "../builtin-industry";

interface Case {
  id: string;
  title: string;
  client: string;
  type: string;
  status: string;
  attorney: string;
  openDate: string;
  courtDate: string | null;
}

interface Contract {
  id: string;
  title: string;
  client: string;
  type: string;
  status: string;
  dueDate: string;
  value: number;
}

interface TimeEntry {
  id: string;
  caseId: string;
  attorney: string;
  date: string;
  hours: number;
  description: string;
  billable: boolean;
  rate: number;
}

interface Document {
  id: string;
  caseId: string;
  name: string;
  type: string;
  uploadDate: string;
  size: string;
  version: number;
}

const cases: Case[] = [
  {
    id: "case-1",
    title: "智慧財產權侵害訴訟",
    client: "台灣創新科技股份有限公司",
    type: "智財",
    status: "active",
    attorney: "林正義律師",
    openDate: "2026-01-10",
    courtDate: "2026-04-15",
  },
  {
    id: "case-2",
    title: "不當解僱勞資爭議",
    client: "陳美華",
    type: "勞動",
    status: "active",
    attorney: "張文宏律師",
    openDate: "2026-02-20",
    courtDate: "2026-05-08",
  },
  {
    id: "case-3",
    title: "租賃糾紛民事調解",
    client: "王建民",
    type: "民事",
    status: "mediation",
    attorney: "林正義律師",
    openDate: "2026-03-05",
    courtDate: null,
  },
];

const contracts: Contract[] = [
  {
    id: "ctr-1",
    title: "軟體授權合約",
    client: "台灣創新科技股份有限公司",
    type: "授權合約",
    status: "signed",
    dueDate: "2027-01-09",
    value: 1200000,
  },
  {
    id: "ctr-2",
    title: "辦公室租賃合約",
    client: "宏遠不動產有限公司",
    type: "租賃合約",
    status: "draft",
    dueDate: "2026-04-30",
    value: 360000,
  },
  {
    id: "ctr-3",
    title: "顧問服務合約",
    client: "新世紀管理顧問公司",
    type: "服務合約",
    status: "expired",
    dueDate: "2026-02-28",
    value: 480000,
  },
];

const timeEntries: TimeEntry[] = [
  {
    id: "te-1",
    caseId: "case-1",
    attorney: "林正義律師",
    date: "2026-03-27",
    hours: 3.5,
    description: "撰寫智財訴訟書狀",
    billable: true,
    rate: 8000,
  },
  {
    id: "te-2",
    caseId: "case-2",
    attorney: "張文宏律師",
    date: "2026-03-27",
    hours: 2.0,
    description: "與當事人進行案件討論",
    billable: true,
    rate: 6000,
  },
  {
    id: "te-3",
    caseId: "case-1",
    attorney: "林正義律師",
    date: "2026-03-28",
    hours: 1.5,
    description: "研究相關判例",
    billable: true,
    rate: 8000,
  },
  {
    id: "te-4",
    caseId: "case-3",
    attorney: "林正義律師",
    date: "2026-03-28",
    hours: 1.0,
    description: "內部案件會議",
    billable: false,
    rate: 8000,
  },
];

const documents: Document[] = [
  {
    id: "doc-1",
    caseId: "case-1",
    name: "起訴狀_智財侵害.pdf",
    type: "訴訟文件",
    uploadDate: "2026-01-15",
    size: "2.4 MB",
    version: 3,
  },
  {
    id: "doc-2",
    caseId: "case-1",
    name: "證據清單_專利比對.xlsx",
    type: "證據資料",
    uploadDate: "2026-02-10",
    size: "856 KB",
    version: 1,
  },
  {
    id: "doc-3",
    caseId: "case-2",
    name: "勞動調解申請書.pdf",
    type: "訴訟文件",
    uploadDate: "2026-02-22",
    size: "1.1 MB",
    version: 2,
  },
  {
    id: "doc-4",
    caseId: "case-3",
    name: "租賃合約副本.pdf",
    type: "合約",
    uploadDate: "2026-03-06",
    size: "3.2 MB",
    version: 1,
  },
];

function listCases(filters?: Record<string, unknown>) {
  let items = [...cases];
  if (filters?.status)
    items = items.filter((c) => c.status === filters.status);
  if (filters?.type) items = items.filter((c) => c.type === filters.type);
  if (filters?.attorney)
    items = items.filter((c) => c.attorney === filters.attorney);
  return { items, total: items.length };
}

function getCase(id: string) {
  const caseItem = cases.find((c) => c.id === id);
  if (!caseItem) return null;
  const caseTimeEntries = timeEntries.filter((t) => t.caseId === id);
  const caseDocs = documents.filter((d) => d.caseId === id);
  const totalHours = caseTimeEntries.reduce((s, t) => s + t.hours, 0);
  const totalBillable = caseTimeEntries
    .filter((t) => t.billable)
    .reduce((s, t) => s + t.hours * t.rate, 0);
  return {
    ...caseItem,
    timeEntries: caseTimeEntries,
    documents: caseDocs,
    totalHours,
    totalBillable,
  };
}

function listContracts(filters?: Record<string, unknown>) {
  let items = [...contracts];
  if (filters?.status)
    items = items.filter((c) => c.status === filters.status);
  if (filters?.type) items = items.filter((c) => c.type === filters.type);
  if (filters?.client)
    items = items.filter((c) =>
      c.client.includes(filters.client as string)
    );
  return { items, total: items.length };
}

function listTimeEntries(filters?: Record<string, unknown>) {
  let items = [...timeEntries];
  if (filters?.caseId)
    items = items.filter((t) => t.caseId === filters.caseId);
  if (filters?.attorney)
    items = items.filter((t) => t.attorney === filters.attorney);
  if (filters?.date) items = items.filter((t) => t.date === filters.date);
  if (filters?.billable !== undefined)
    items = items.filter((t) => t.billable === filters.billable);
  return { items, total: items.length };
}

function addTimeEntry(
  caseId: string,
  attorney: string,
  hours: number,
  description: string,
  billable: boolean,
  rate: number
) {
  const caseItem = cases.find((c) => c.id === caseId);
  if (!caseItem) return { error: "Case not found" };
  const newEntry: TimeEntry = {
    id: `te-${timeEntries.length + 1}`,
    caseId,
    attorney,
    date: new Date().toISOString().split("T")[0],
    hours,
    description,
    billable,
    rate,
  };
  timeEntries.push(newEntry);
  return { timeEntry: newEntry };
}

function listDocuments(filters?: Record<string, unknown>) {
  let items = [...documents];
  if (filters?.caseId)
    items = items.filter((d) => d.caseId === filters.caseId);
  if (filters?.type) items = items.filter((d) => d.type === filters.type);
  return { items, total: items.length };
}

/**
 * Legal Service API
 * Actions: listCases, getCase, listContracts, listTimeEntries, addTimeEntry, listDocuments
 */
export function handleRequest(body: Record<string, unknown>): ServiceResponse {
  const action = body.action as string;
  if (!action) {
    return {
      status: 400,
      body: {
        error:
          "Missing 'action' field. Available: listCases, getCase, listContracts, listTimeEntries, addTimeEntry, listDocuments",
      },
    };
  }

  switch (action) {
    case "listCases":
      return {
        status: 200,
        body: listCases(body.filters as Record<string, unknown>),
      };
    case "getCase": {
      const result = getCase(body.id as string);
      if (!result)
        return { status: 404, body: { error: "Case not found" } };
      return { status: 200, body: result };
    }
    case "listContracts":
      return {
        status: 200,
        body: listContracts(body.filters as Record<string, unknown>),
      };
    case "listTimeEntries":
      return {
        status: 200,
        body: listTimeEntries(body.filters as Record<string, unknown>),
      };
    case "addTimeEntry": {
      const result = addTimeEntry(
        body.caseId as string,
        body.attorney as string,
        body.hours as number,
        body.description as string,
        (body.billable as boolean) ?? true,
        (body.rate as number) ?? 6000
      );
      if ("error" in result)
        return { status: 400, body: { error: result.error } };
      return { status: 201, body: result };
    }
    case "listDocuments":
      return {
        status: 200,
        body: listDocuments(body.filters as Record<string, unknown>),
      };
    default:
      return { status: 400, body: { error: `Unknown action: ${action}` } };
  }
}
