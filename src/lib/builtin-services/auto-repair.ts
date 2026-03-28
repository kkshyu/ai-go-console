import type { ServiceResponse } from "../builtin-industry";

// --- Domain types ---

interface WorkOrder {
  id: string;
  vehicleId: string;
  customerName: string;
  description: string;
  status: string;
  estimatedCost: number;
  mechanic: string;
  createdAt: string;
}

interface Vehicle {
  id: string;
  plate: string;
  make: string;
  model: string;
  year: number;
  ownerName: string;
  phone: string;
  lastService: string;
}

interface Part {
  id: string;
  name: string;
  sku: string;
  stock: number;
  price: number;
  minStock: number;
}

interface Schedule {
  id: string;
  mechanic: string;
  date: string;
  slots: { time: string; workOrderId: string | null }[];
}

// --- Mock data ---

const workOrders: WorkOrder[] = [
  {
    id: "wo-1",
    vehicleId: "veh-1",
    customerName: "林志明",
    description: "引擎異音檢修，疑似正時皮帶老化",
    status: "in_progress",
    estimatedCost: 8500,
    mechanic: "陳師傅",
    createdAt: "2026-03-25T09:00:00",
  },
  {
    id: "wo-2",
    vehicleId: "veh-2",
    customerName: "王美玲",
    description: "定期保養，更換機油與機油濾芯",
    status: "completed",
    estimatedCost: 3200,
    mechanic: "張師傅",
    createdAt: "2026-03-24T14:00:00",
  },
  {
    id: "wo-3",
    vehicleId: "veh-3",
    customerName: "黃國華",
    description: "冷氣不冷，需檢查冷媒與壓縮機",
    status: "pending",
    estimatedCost: 6000,
    mechanic: "陳師傅",
    createdAt: "2026-03-27T10:30:00",
  },
];

const vehicles: Vehicle[] = [
  {
    id: "veh-1",
    plate: "ABC-1234",
    make: "Toyota",
    model: "Camry",
    year: 2021,
    ownerName: "林志明",
    phone: "0912-345-678",
    lastService: "2025-12-10",
  },
  {
    id: "veh-2",
    plate: "DEF-5678",
    make: "Honda",
    model: "CR-V",
    year: 2023,
    ownerName: "王美玲",
    phone: "0923-456-789",
    lastService: "2026-03-24",
  },
  {
    id: "veh-3",
    plate: "GHI-9012",
    make: "Mazda",
    model: "CX-5",
    year: 2022,
    ownerName: "黃國華",
    phone: "0934-567-890",
    lastService: "2025-09-15",
  },
];

const parts: Part[] = [
  {
    id: "part-1",
    name: "正時皮帶",
    sku: "TB-TOY-2021",
    stock: 5,
    price: 2800,
    minStock: 2,
  },
  {
    id: "part-2",
    name: "機油濾芯",
    sku: "OF-UNI-001",
    stock: 30,
    price: 250,
    minStock: 10,
  },
  {
    id: "part-3",
    name: "冷媒 R134a",
    sku: "AC-R134A-500",
    stock: 12,
    price: 450,
    minStock: 5,
  },
  {
    id: "part-4",
    name: "來令片（前輪）",
    sku: "BP-FRT-003",
    stock: 8,
    price: 1600,
    minStock: 4,
  },
];

const schedules: Schedule[] = [
  {
    id: "sch-1",
    mechanic: "陳師傅",
    date: "2026-03-28",
    slots: [
      { time: "09:00", workOrderId: "wo-1" },
      { time: "14:00", workOrderId: "wo-3" },
    ],
  },
  {
    id: "sch-2",
    mechanic: "張師傅",
    date: "2026-03-28",
    slots: [
      { time: "09:00", workOrderId: null },
      { time: "14:00", workOrderId: null },
    ],
  },
  {
    id: "sch-3",
    mechanic: "陳師傅",
    date: "2026-03-29",
    slots: [
      { time: "09:00", workOrderId: null },
      { time: "14:00", workOrderId: null },
    ],
  },
];

// --- Action handlers ---

function listWorkOrders(filters?: Record<string, unknown>) {
  let items = [...workOrders];
  if (filters?.status) items = items.filter((w) => w.status === filters.status);
  if (filters?.mechanic)
    items = items.filter((w) => w.mechanic === filters.mechanic);
  return { items, total: items.length };
}

function getWorkOrder(id: unknown) {
  const item = workOrders.find((w) => w.id === id);
  if (!item) return null;
  return item;
}

function createWorkOrder(data: Record<string, unknown>) {
  const newOrder: WorkOrder = {
    id: `wo-${workOrders.length + 1}`,
    vehicleId: (data.vehicleId as string) ?? "",
    customerName: (data.customerName as string) ?? "",
    description: (data.description as string) ?? "",
    status: "pending",
    estimatedCost: (data.estimatedCost as number) ?? 0,
    mechanic: (data.mechanic as string) ?? "",
    createdAt: new Date().toISOString(),
  };
  workOrders.push(newOrder);
  return newOrder;
}

function listVehicles(filters?: Record<string, unknown>) {
  let items = [...vehicles];
  if (filters?.make) items = items.filter((v) => v.make === filters.make);
  return { items, total: items.length };
}

function getVehicle(id: unknown) {
  const item = vehicles.find((v) => v.id === id);
  if (!item) return null;
  return item;
}

function listParts(filters?: Record<string, unknown>) {
  let items = [...parts];
  if (filters?.lowStock) items = items.filter((p) => p.stock <= p.minStock);
  return { items, total: items.length };
}

function listSchedules(filters?: Record<string, unknown>) {
  let items = [...schedules];
  if (filters?.mechanic)
    items = items.filter((s) => s.mechanic === filters.mechanic);
  if (filters?.date) items = items.filter((s) => s.date === filters.date);
  return { items, total: items.length };
}

// --- Main handler ---

const ACTIONS =
  "listWorkOrders, getWorkOrder, createWorkOrder, listVehicles, getVehicle, listParts, listSchedules";

/**
 * Auto Repair Service API
 *
 * Actions:
 * - listWorkOrders(filters?: { status?, mechanic? }) — list all work orders, optionally filtered
 * - getWorkOrder(id) — get a single work order by ID
 * - createWorkOrder(data: { vehicleId, customerName, description, estimatedCost, mechanic }) — create a new work order
 * - listVehicles(filters?: { make? }) — list all vehicles, optionally filtered
 * - getVehicle(id) — get a single vehicle by ID
 * - listParts(filters?: { lowStock? }) — list parts inventory, optionally only low-stock items
 * - listSchedules(filters?: { mechanic?, date? }) — list mechanic schedules, optionally filtered
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
    case "listWorkOrders":
      return {
        status: 200,
        body: listWorkOrders(body.filters as Record<string, unknown>),
      };

    case "getWorkOrder": {
      const item = getWorkOrder(body.id);
      if (!item)
        return { status: 404, body: { error: `Work order not found: ${body.id}` } };
      return { status: 200, body: item };
    }

    case "createWorkOrder":
      return {
        status: 201,
        body: createWorkOrder(body.data as Record<string, unknown> ?? {}),
      };

    case "listVehicles":
      return {
        status: 200,
        body: listVehicles(body.filters as Record<string, unknown>),
      };

    case "getVehicle": {
      const item = getVehicle(body.id);
      if (!item)
        return { status: 404, body: { error: `Vehicle not found: ${body.id}` } };
      return { status: 200, body: item };
    }

    case "listParts":
      return {
        status: 200,
        body: listParts(body.filters as Record<string, unknown>),
      };

    case "listSchedules":
      return {
        status: 200,
        body: listSchedules(body.filters as Record<string, unknown>),
      };

    default:
      return {
        status: 400,
        body: { error: `Unknown action: ${action}. Available: ${ACTIONS}` },
      };
  }
}
