import type { ServiceResponse } from "../builtin-industry";

// ── Beauty-specific types ──────────────────────────────────────────────────

interface ServiceItem {
  id: string;
  name: string;
  duration: number;
  price: number;
  category: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  memberLevel: string;
  points: number;
  lastVisit: string;
}

interface Appointment {
  id: string;
  clientId: string;
  stylist: string;
  service: string;
  date: string;
  time: string;
  duration: number;
  status: string;
  price: number;
}

interface Membership {
  id: string;
  name: string;
  minPoints: number;
  discount: number;
  perks: string;
}

// ── Mock Data ──────────────────────────────────────────────────────────────

const serviceItems: ServiceItem[] = [
  { id: "svc-1", name: "女生洗剪", duration: 60, price: 600, category: "美髮" },
  { id: "svc-2", name: "男生剪髮", duration: 30, price: 350, category: "美髮" },
  {
    id: "svc-3",
    name: "染髮（全頭）",
    duration: 120,
    price: 2500,
    category: "美髮",
  },
  {
    id: "svc-4",
    name: "燙髮（溫塑燙）",
    duration: 150,
    price: 3000,
    category: "美髮",
  },
  { id: "svc-5", name: "凝膠美甲", duration: 90, price: 1200, category: "美甲" },
  {
    id: "svc-6",
    name: "臉部深層保養",
    duration: 60,
    price: 1800,
    category: "美容",
  },
];

const clients: Client[] = [
  {
    id: "cli-1",
    name: "許雅婷",
    phone: "0911-222-333",
    memberLevel: "金卡",
    points: 5200,
    lastVisit: "2026-03-15",
  },
  {
    id: "cli-2",
    name: "蔡宜蓁",
    phone: "0922-333-444",
    memberLevel: "銀卡",
    points: 2800,
    lastVisit: "2026-03-20",
  },
  {
    id: "cli-3",
    name: "劉家豪",
    phone: "0933-444-555",
    memberLevel: "一般",
    points: 600,
    lastVisit: "2026-02-28",
  },
  {
    id: "cli-4",
    name: "吳佩珊",
    phone: "0944-555-666",
    memberLevel: "金卡",
    points: 8900,
    lastVisit: "2026-03-25",
  },
];

const appointments: Appointment[] = [
  {
    id: "bapt-1",
    clientId: "cli-1",
    stylist: "Kelly",
    service: "svc-3",
    date: "2026-03-29",
    time: "10:00",
    duration: 120,
    status: "confirmed",
    price: 2500,
  },
  {
    id: "bapt-2",
    clientId: "cli-2",
    stylist: "Amy",
    service: "svc-1",
    date: "2026-03-29",
    time: "14:00",
    duration: 60,
    status: "confirmed",
    price: 600,
  },
  {
    id: "bapt-3",
    clientId: "cli-3",
    stylist: "Kevin",
    service: "svc-2",
    date: "2026-03-29",
    time: "15:00",
    duration: 30,
    status: "pending",
    price: 350,
  },
  {
    id: "bapt-4",
    clientId: "cli-4",
    stylist: "Kelly",
    service: "svc-4",
    date: "2026-03-30",
    time: "10:00",
    duration: 150,
    status: "confirmed",
    price: 3000,
  },
  {
    id: "bapt-5",
    clientId: "cli-1",
    stylist: "Amy",
    service: "svc-5",
    date: "2026-04-01",
    time: "13:00",
    duration: 90,
    status: "pending",
    price: 1200,
  },
];

const memberships: Membership[] = [
  {
    id: "mem-1",
    name: "一般會員",
    minPoints: 0,
    discount: 1.0,
    perks: "消費累積點數",
  },
  {
    id: "mem-2",
    name: "銀卡會員",
    minPoints: 2000,
    discount: 0.95,
    perks: "消費95折、生日禮",
  },
  {
    id: "mem-3",
    name: "金卡會員",
    minPoints: 5000,
    discount: 0.9,
    perks: "消費9折、生日禮、免費護髮一次",
  },
];

// ── Handlers ───────────────────────────────────────────────────────────────

function listServices(filters?: Record<string, unknown>) {
  let result = [...serviceItems];
  if (filters?.category)
    result = result.filter((s) => s.category === filters.category);
  return { services: result, total: result.length };
}

function listClients(filters?: Record<string, unknown>) {
  let result = [...clients];
  if (filters?.memberLevel)
    result = result.filter((c) => c.memberLevel === filters.memberLevel);
  return { clients: result, total: result.length };
}

function getClient(id: string) {
  return clients.find((c) => c.id === id) ?? null;
}

function listAppointments(filters?: Record<string, unknown>) {
  let result = [...appointments];
  if (filters?.clientId)
    result = result.filter((a) => a.clientId === filters.clientId);
  if (filters?.stylist)
    result = result.filter((a) => a.stylist === filters.stylist);
  if (filters?.status)
    result = result.filter((a) => a.status === filters.status);
  if (filters?.date) result = result.filter((a) => a.date === filters.date);
  return { appointments: result, total: result.length };
}

function bookAppointment(
  clientId: string,
  stylist: string,
  serviceId: string,
  date: string,
  time: string,
) {
  const svc = serviceItems.find((s) => s.id === serviceId);
  if (!svc) return null;
  const newApt: Appointment = {
    id: `bapt-${appointments.length + 1}`,
    clientId,
    stylist,
    service: serviceId,
    date,
    time,
    duration: svc.duration,
    status: "pending",
    price: svc.price,
  };
  appointments.push(newApt);
  return newApt;
}

function listMemberships() {
  return { memberships: [...memberships], total: memberships.length };
}

// ── Main Request Handler ───────────────────────────────────────────────────

/**
 * Beauty Service API
 *
 * Actions:
 *   { action: "listServices", filters?: { category? } }
 *   { action: "listClients", filters?: { memberLevel? } }
 *   { action: "getClient", id: string }
 *   { action: "listAppointments", filters?: { clientId?, stylist?, status?, date? } }
 *   { action: "bookAppointment", clientId: string, stylist: string, serviceId: string, date: string, time: string }
 *   { action: "listMemberships" }
 */
export function handleRequest(
  body: Record<string, unknown>,
): ServiceResponse {
  const action = body.action as string;
  if (!action)
    return {
      status: 400,
      body: {
        error:
          "Missing 'action' field. Available: listServices, listClients, getClient, listAppointments, bookAppointment, listMemberships",
      },
    };

  switch (action) {
    case "listServices":
      return {
        status: 200,
        body: listServices(body.filters as Record<string, unknown>),
      };
    case "listClients":
      return {
        status: 200,
        body: listClients(body.filters as Record<string, unknown>),
      };
    case "getClient": {
      const id = body.id as string;
      if (!id)
        return { status: 400, body: { error: "Missing 'id' field" } };
      const client = getClient(id);
      if (!client)
        return { status: 404, body: { error: `Client not found: ${id}` } };
      return { status: 200, body: client };
    }
    case "listAppointments":
      return {
        status: 200,
        body: listAppointments(body.filters as Record<string, unknown>),
      };
    case "bookAppointment": {
      const clientId = body.clientId as string;
      const stylist = body.stylist as string;
      const serviceId = body.serviceId as string;
      const date = body.date as string;
      const time = body.time as string;
      if (!clientId || !stylist || !serviceId || !date || !time)
        return {
          status: 400,
          body: {
            error:
              "Missing required fields: clientId, stylist, serviceId, date, time",
          },
        };
      const apt = bookAppointment(clientId, stylist, serviceId, date, time);
      if (!apt)
        return {
          status: 404,
          body: { error: `Service not found: ${serviceId}` },
        };
      return { status: 201, body: apt };
    }
    case "listMemberships":
      return { status: 200, body: listMemberships() };
    default:
      return {
        status: 400,
        body: {
          error: `Unknown action: ${action}. Available: listServices, listClients, getClient, listAppointments, bookAppointment, listMemberships`,
        },
      };
  }
}
