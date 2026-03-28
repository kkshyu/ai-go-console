import type { ServiceResponse } from "../builtin-industry";

// --- Domain types ---

interface Schedule {
  id: string;
  clientId: string;
  date: string;
  time: string;
  duration: number;
  type: string;
  workers: string[];
  status: string;
}

interface ClientContract {
  id: string;
  clientName: string;
  address: string;
  type: string;
  frequency: string;
  monthlyFee?: number;
  totalFee?: number;
  startDate: string;
  endDate: string;
  status: string;
}

interface ServiceItem {
  id: string;
  name: string;
  pricePerHour: number;
  description: string;
}

interface Dispatch {
  id: string;
  scheduleId: string;
  worker: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

// --- Mock data ---

const schedules: Schedule[] = [
  {
    id: "sch-1",
    clientId: "cc-1",
    date: "2026-03-28",
    time: "09:00",
    duration: 3,
    type: "定期",
    workers: ["王大明", "李小華"],
    status: "confirmed",
  },
  {
    id: "sch-2",
    clientId: "cc-2",
    date: "2026-03-29",
    time: "13:00",
    duration: 5,
    type: "深層",
    workers: ["王大明", "陳志偉", "林美君"],
    status: "confirmed",
  },
  {
    id: "sch-3",
    clientId: "cc-3",
    date: "2026-03-30",
    time: "08:00",
    duration: 8,
    type: "裝潢後",
    workers: ["王大明", "李小華", "陳志偉", "林美君"],
    status: "pending",
  },
];

const clientContracts: ClientContract[] = [
  {
    id: "cc-1",
    clientName: "台北101大樓管委會",
    address: "台北市信義區信義路五段7號",
    type: "定期",
    frequency: "每週一次",
    monthlyFee: 25000,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    status: "active",
  },
  {
    id: "cc-2",
    clientName: "陳先生住家",
    address: "新北市板橋區文化路一段100號12樓",
    type: "深層",
    frequency: "單次",
    totalFee: 8000,
    startDate: "2026-03-29",
    endDate: "2026-03-29",
    status: "active",
  },
  {
    id: "cc-3",
    clientName: "幸福建設新建案",
    address: "台中市西屯區市政北二路168號",
    type: "裝潢後",
    frequency: "單次",
    totalFee: 35000,
    startDate: "2026-03-30",
    endDate: "2026-03-30",
    status: "pending",
  },
];

const serviceItems: ServiceItem[] = [
  {
    id: "si-1",
    name: "居家定期清潔",
    pricePerHour: 500,
    description: "一般居家環境清潔，含地板、廚房、浴室",
  },
  {
    id: "si-2",
    name: "深層清潔",
    pricePerHour: 700,
    description: "深層去污與消毒，含沙發、床墊、窗簾清洗",
  },
  {
    id: "si-3",
    name: "裝潢後清潔",
    pricePerHour: 800,
    description: "新屋或裝修後粉塵清除、玻璃除膠、全面清潔",
  },
  {
    id: "si-4",
    name: "辦公室清潔",
    pricePerHour: 550,
    description: "辦公空間日常清潔，含公共區域與洗手間",
  },
];

const dispatches: Dispatch[] = [
  {
    id: "dp-1",
    scheduleId: "sch-1",
    worker: "王大明",
    date: "2026-03-28",
    startTime: "09:00",
    endTime: "12:00",
    status: "dispatched",
  },
  {
    id: "dp-2",
    scheduleId: "sch-1",
    worker: "李小華",
    date: "2026-03-28",
    startTime: "09:00",
    endTime: "12:00",
    status: "dispatched",
  },
  {
    id: "dp-3",
    scheduleId: "sch-2",
    worker: "陳志偉",
    date: "2026-03-29",
    startTime: "13:00",
    endTime: "18:00",
    status: "pending",
  },
  {
    id: "dp-4",
    scheduleId: "sch-2",
    worker: "林美君",
    date: "2026-03-29",
    startTime: "13:00",
    endTime: "18:00",
    status: "pending",
  },
];

// --- Action handlers ---

function listSchedules(filters?: Record<string, unknown>) {
  let items = [...schedules];
  if (filters?.clientId)
    items = items.filter((s) => s.clientId === filters.clientId);
  if (filters?.date) items = items.filter((s) => s.date === filters.date);
  if (filters?.type) items = items.filter((s) => s.type === filters.type);
  if (filters?.status) items = items.filter((s) => s.status === filters.status);
  return { items, total: items.length };
}

function createSchedule(data: Record<string, unknown>) {
  const newSchedule: Schedule = {
    id: `sch-${schedules.length + 1}`,
    clientId: (data.clientId as string) ?? "",
    date: (data.date as string) ?? "",
    time: (data.time as string) ?? "",
    duration: (data.duration as number) ?? 0,
    type: (data.type as string) ?? "",
    workers: (data.workers as string[]) ?? [],
    status: "pending",
  };
  schedules.push(newSchedule);
  return newSchedule;
}

function listContracts(filters?: Record<string, unknown>) {
  let items = [...clientContracts];
  if (filters?.status) items = items.filter((c) => c.status === filters.status);
  if (filters?.type) items = items.filter((c) => c.type === filters.type);
  return { items, total: items.length };
}

function getContract(id: unknown) {
  return clientContracts.find((c) => c.id === id) ?? null;
}

function listServiceItems() {
  return { items: [...serviceItems], total: serviceItems.length };
}

function listDispatches(filters?: Record<string, unknown>) {
  let items = [...dispatches];
  if (filters?.scheduleId)
    items = items.filter((d) => d.scheduleId === filters.scheduleId);
  if (filters?.worker) items = items.filter((d) => d.worker === filters.worker);
  if (filters?.status) items = items.filter((d) => d.status === filters.status);
  if (filters?.date) items = items.filter((d) => d.date === filters.date);
  return { items, total: items.length };
}

// --- Main handler ---

const ACTIONS =
  "listSchedules, createSchedule, listContracts, getContract, listServiceItems, listDispatches";

/**
 * Cleaning Service API
 *
 * Actions:
 * - listSchedules(filters?: { clientId?, date?, type?, status? }) — list cleaning schedules, optionally filtered
 * - createSchedule(data: { clientId, date, time, duration, type, workers }) — create a new cleaning schedule
 * - listContracts(filters?: { status?, type? }) — list client contracts, optionally filtered
 * - getContract(id) — get a single contract by ID
 * - listServiceItems() — list all available cleaning service items with pricing
 * - listDispatches(filters?: { scheduleId?, worker?, status?, date? }) — list worker dispatches, optionally filtered
 */
export function handleRequest(body: Record<string, unknown>): ServiceResponse {
  const action = body.action as string | undefined;

  if (!action) {
    return {
      status: 400,
      body: { error: `Missing 'action' field. Available: ${ACTIONS}` },
    };
  }

  switch (action) {
    case "listSchedules":
      return {
        status: 200,
        body: listSchedules(body.filters as Record<string, unknown>),
      };

    case "createSchedule":
      return {
        status: 201,
        body: createSchedule(body.data as Record<string, unknown> ?? {}),
      };

    case "listContracts":
      return {
        status: 200,
        body: listContracts(body.filters as Record<string, unknown>),
      };

    case "getContract": {
      const item = getContract(body.id);
      if (!item)
        return { status: 404, body: { error: `Contract not found: ${body.id}` } };
      return { status: 200, body: item };
    }

    case "listServiceItems":
      return { status: 200, body: listServiceItems() };

    case "listDispatches":
      return {
        status: 200,
        body: listDispatches(body.filters as Record<string, unknown>),
      };

    default:
      return {
        status: 400,
        body: { error: `Unknown action: ${action}. Available: ${ACTIONS}` },
      };
  }
}
