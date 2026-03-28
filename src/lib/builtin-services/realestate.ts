import type { ServiceResponse } from "../builtin-industry";

// ── Real Estate-specific types ─────────────────────────────────────────────

interface Property {
  id: string;
  title: string;
  type: string;
  address: string;
  area: number;
  rooms: number;
  floor: number;
  price: number;
  status: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  budget: number;
  preferArea: string;
  preferType: string;
  needs: string;
}

interface Viewing {
  id: string;
  propertyId: string;
  clientId: string;
  date: string;
  time: string;
  status: string;
  agentNote: string;
}

interface Transaction {
  id: string;
  propertyId: string;
  clientId: string;
  type: string;
  amount: number;
  commission: number;
  status: string;
  closingDate: string | null;
}

// ── Mock Data ──────────────────────────────────────────────────────────────

const properties: Property[] = [
  {
    id: "prop-1",
    title: "信義區豪華三房",
    type: "出售",
    address: "台北市信義區松仁路 88 號 15 樓",
    area: 45.2,
    rooms: 3,
    floor: 15,
    price: 38000000,
    status: "available",
  },
  {
    id: "prop-2",
    title: "中山區精緻套房",
    type: "出租",
    address: "台北市中山區南京東路二段 120 號 8 樓",
    area: 15.8,
    rooms: 1,
    floor: 8,
    price: 18000,
    status: "available",
  },
  {
    id: "prop-3",
    title: "板橋新埔捷運宅",
    type: "出售",
    address: "新北市板橋區文化路一段 200 號 12 樓",
    area: 32.5,
    rooms: 2,
    floor: 12,
    price: 18500000,
    status: "reserved",
  },
  {
    id: "prop-4",
    title: "大安區辦公室",
    type: "出租",
    address: "台北市大安區敦化南路一段 55 號 3 樓",
    area: 60.0,
    rooms: 4,
    floor: 3,
    price: 45000,
    status: "available",
  },
  {
    id: "prop-5",
    title: "內湖科技園區透天",
    type: "出售",
    address: "台北市內湖區瑞光路 300 巷 10 號",
    area: 85.0,
    rooms: 5,
    floor: 4,
    price: 52000000,
    status: "sold",
  },
];

const clients: Client[] = [
  {
    id: "rcli-1",
    name: "鄭雅文",
    phone: "0911-888-999",
    budget: 25000000,
    preferArea: "信義區",
    preferType: "出售",
    needs: "三房兩廳，近捷運站，有停車位",
  },
  {
    id: "rcli-2",
    name: "黃俊傑",
    phone: "0922-777-888",
    budget: 20000,
    preferArea: "中山區",
    preferType: "出租",
    needs: "套房或一房，生活機能佳",
  },
  {
    id: "rcli-3",
    name: "林淑惠",
    phone: "0933-666-777",
    budget: 20000000,
    preferArea: "板橋區",
    preferType: "出售",
    needs: "兩房以上，近學區",
  },
  {
    id: "rcli-4",
    name: "吳明達",
    phone: "0944-555-666",
    budget: 50000,
    preferArea: "大安區",
    preferType: "出租",
    needs: "辦公室用途，30坪以上，近捷運",
  },
];

const viewings: Viewing[] = [
  {
    id: "vw-1",
    propertyId: "prop-1",
    clientId: "rcli-1",
    date: "2026-03-29",
    time: "10:00",
    status: "scheduled",
    agentNote: "客戶很有興趣，價格可議",
  },
  {
    id: "vw-2",
    propertyId: "prop-2",
    clientId: "rcli-2",
    date: "2026-03-28",
    time: "14:00",
    status: "completed",
    agentNote: "客戶覺得坪數偏小，考慮中",
  },
  {
    id: "vw-3",
    propertyId: "prop-3",
    clientId: "rcli-3",
    date: "2026-03-30",
    time: "11:00",
    status: "scheduled",
    agentNote: "客戶指定看此物件，已事先提供格局圖",
  },
  {
    id: "vw-4",
    propertyId: "prop-4",
    clientId: "rcli-4",
    date: "2026-03-27",
    time: "16:00",
    status: "completed",
    agentNote: "客戶滿意，準備進入議價階段",
  },
];

const transactions: Transaction[] = [
  {
    id: "txn-1",
    propertyId: "prop-5",
    clientId: "rcli-1",
    type: "出售",
    amount: 51000000,
    commission: 2040000,
    status: "closed",
    closingDate: "2026-03-10",
  },
  {
    id: "txn-2",
    propertyId: "prop-3",
    clientId: "rcli-3",
    type: "出售",
    amount: 18200000,
    commission: 728000,
    status: "pending",
    closingDate: "2026-04-15",
  },
  {
    id: "txn-3",
    propertyId: "prop-4",
    clientId: "rcli-4",
    type: "出租",
    amount: 45000,
    commission: 45000,
    status: "negotiating",
    closingDate: null,
  },
];

// ── Handlers ───────────────────────────────────────────────────────────────

function listProperties(filters?: Record<string, unknown>) {
  let result = [...properties];
  if (filters?.type) result = result.filter((p) => p.type === filters.type);
  if (filters?.status)
    result = result.filter((p) => p.status === filters.status);
  if (filters?.minPrice)
    result = result.filter((p) => p.price >= (filters.minPrice as number));
  if (filters?.maxPrice)
    result = result.filter((p) => p.price <= (filters.maxPrice as number));
  if (filters?.minRooms)
    result = result.filter((p) => p.rooms >= (filters.minRooms as number));
  return { properties: result, total: result.length };
}

function getProperty(id: string) {
  return properties.find((p) => p.id === id) ?? null;
}

function listClients(filters?: Record<string, unknown>) {
  let result = [...clients];
  if (filters?.preferType)
    result = result.filter((c) => c.preferType === filters.preferType);
  if (filters?.preferArea)
    result = result.filter((c) => c.preferArea === filters.preferArea);
  return { clients: result, total: result.length };
}

function scheduleViewing(
  propertyId: string,
  clientId: string,
  date: string,
  time: string,
  agentNote?: string,
) {
  const newViewing: Viewing = {
    id: `vw-${viewings.length + 1}`,
    propertyId,
    clientId,
    date,
    time,
    status: "scheduled",
    agentNote: agentNote ?? "",
  };
  viewings.push(newViewing);
  return newViewing;
}

function listViewings(filters?: Record<string, unknown>) {
  let result = [...viewings];
  if (filters?.propertyId)
    result = result.filter((v) => v.propertyId === filters.propertyId);
  if (filters?.clientId)
    result = result.filter((v) => v.clientId === filters.clientId);
  if (filters?.status)
    result = result.filter((v) => v.status === filters.status);
  if (filters?.date) result = result.filter((v) => v.date === filters.date);
  return { viewings: result, total: result.length };
}

function listTransactions(filters?: Record<string, unknown>) {
  let result = [...transactions];
  if (filters?.propertyId)
    result = result.filter((t) => t.propertyId === filters.propertyId);
  if (filters?.clientId)
    result = result.filter((t) => t.clientId === filters.clientId);
  if (filters?.status)
    result = result.filter((t) => t.status === filters.status);
  if (filters?.type) result = result.filter((t) => t.type === filters.type);
  return { transactions: result, total: result.length };
}

// ── Main Request Handler ───────────────────────────────────────────────────

/**
 * Real Estate Service API
 *
 * Actions:
 *   { action: "listProperties", filters?: { type?, status?, minPrice?, maxPrice?, minRooms? } }
 *   { action: "getProperty", id: string }
 *   { action: "listClients", filters?: { preferType?, preferArea? } }
 *   { action: "scheduleViewing", propertyId: string, clientId: string, date: string, time: string, agentNote?: string }
 *   { action: "listViewings", filters?: { propertyId?, clientId?, status?, date? } }
 *   { action: "listTransactions", filters?: { propertyId?, clientId?, status?, type? } }
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
          "Missing 'action' field. Available: listProperties, getProperty, listClients, scheduleViewing, listViewings, listTransactions",
      },
    };

  switch (action) {
    case "listProperties":
      return {
        status: 200,
        body: listProperties(body.filters as Record<string, unknown>),
      };
    case "getProperty": {
      const id = body.id as string;
      if (!id)
        return { status: 400, body: { error: "Missing 'id' field" } };
      const property = getProperty(id);
      if (!property)
        return { status: 404, body: { error: `Property not found: ${id}` } };
      return { status: 200, body: property };
    }
    case "listClients":
      return {
        status: 200,
        body: listClients(body.filters as Record<string, unknown>),
      };
    case "scheduleViewing": {
      const propertyId = body.propertyId as string;
      const clientId = body.clientId as string;
      const date = body.date as string;
      const time = body.time as string;
      const agentNote = body.agentNote as string | undefined;
      if (!propertyId || !clientId || !date || !time)
        return {
          status: 400,
          body: {
            error:
              "Missing required fields: propertyId, clientId, date, time",
          },
        };
      return {
        status: 201,
        body: scheduleViewing(propertyId, clientId, date, time, agentNote),
      };
    }
    case "listViewings":
      return {
        status: 200,
        body: listViewings(body.filters as Record<string, unknown>),
      };
    case "listTransactions":
      return {
        status: 200,
        body: listTransactions(body.filters as Record<string, unknown>),
      };
    default:
      return {
        status: 400,
        body: {
          error: `Unknown action: ${action}. Available: listProperties, getProperty, listClients, scheduleViewing, listViewings, listTransactions`,
        },
      };
  }
}
