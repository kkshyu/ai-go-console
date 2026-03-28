import type { ServiceResponse } from "../builtin-industry";

// ── Restaurant-specific types ──────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
  description: string;
}

interface OrderItem {
  menuItemId: string;
  qty: number;
}

interface Order {
  id: string;
  tableId: string;
  items: OrderItem[];
  total: number;
  status: string;
  createdAt: string;
}

interface Table {
  id: string;
  name: string;
  seats: number;
  status: string;
}

// ── Mock Data ──────────────────────────────────────────────────────────────

const categories: Category[] = [
  { id: "cat-1", name: "主食", sortOrder: 1 },
  { id: "cat-2", name: "小吃", sortOrder: 2 },
  { id: "cat-3", name: "湯品", sortOrder: 3 },
  { id: "cat-4", name: "飲料", sortOrder: 4 },
];

const menuItems: MenuItem[] = [
  {
    id: "mi-1",
    name: "滷肉飯",
    category: "cat-1",
    price: 55,
    available: true,
    description: "古早味滷肉飯，肥瘦各半，淋上濃郁滷汁",
  },
  {
    id: "mi-2",
    name: "雞腿便當",
    category: "cat-1",
    price: 120,
    available: true,
    description: "酥脆炸雞腿搭配三樣配菜與白飯",
  },
  {
    id: "mi-3",
    name: "蚵仔煎",
    category: "cat-2",
    price: 70,
    available: true,
    description: "新鮮蚵仔搭配雞蛋與地瓜粉煎製，附甜辣醬",
  },
  {
    id: "mi-4",
    name: "臭豆腐",
    category: "cat-2",
    price: 60,
    available: false,
    description: "外酥內嫩炸臭豆腐，搭配台式泡菜",
  },
  {
    id: "mi-5",
    name: "豬血湯",
    category: "cat-3",
    price: 35,
    available: true,
    description: "鮮嫩豬血搭配酸菜，清甜湯頭",
  },
  {
    id: "mi-6",
    name: "珍珠奶茶",
    category: "cat-4",
    price: 50,
    available: true,
    description: "手搖珍珠奶茶，Q彈珍珠配濃郁奶茶",
  },
];

const orders: Order[] = [
  {
    id: "ord-1",
    tableId: "tbl-1",
    items: [
      { menuItemId: "mi-1", qty: 2 },
      { menuItemId: "mi-5", qty: 2 },
    ],
    total: 180,
    status: "preparing",
    createdAt: "2026-03-28T11:30:00",
  },
  {
    id: "ord-2",
    tableId: "tbl-2",
    items: [
      { menuItemId: "mi-2", qty: 1 },
      { menuItemId: "mi-3", qty: 1 },
      { menuItemId: "mi-6", qty: 1 },
    ],
    total: 240,
    status: "served",
    createdAt: "2026-03-28T12:00:00",
  },
  {
    id: "ord-3",
    tableId: "tbl-3",
    items: [{ menuItemId: "mi-1", qty: 3 }],
    total: 165,
    status: "pending",
    createdAt: "2026-03-28T12:15:00",
  },
  {
    id: "ord-4",
    tableId: "tbl-1",
    items: [
      { menuItemId: "mi-2", qty: 2 },
      { menuItemId: "mi-6", qty: 2 },
    ],
    total: 340,
    status: "paid",
    createdAt: "2026-03-28T10:45:00",
  },
];

const tables: Table[] = [
  { id: "tbl-1", name: "A1", seats: 4, status: "occupied" },
  { id: "tbl-2", name: "A2", seats: 4, status: "occupied" },
  { id: "tbl-3", name: "B1", seats: 2, status: "occupied" },
  { id: "tbl-4", name: "B2", seats: 2, status: "available" },
  { id: "tbl-5", name: "C1", seats: 6, status: "reserved" },
];

// ── Handlers ───────────────────────────────────────────────────────────────

function listMenuItems(filters?: Record<string, unknown>) {
  let items = [...menuItems];
  if (filters?.category)
    items = items.filter((i) => i.category === filters.category);
  if (filters?.available !== undefined)
    items = items.filter((i) => i.available === filters.available);
  return { items, total: items.length };
}

function getMenuItem(id: string) {
  return menuItems.find((m) => m.id === id) ?? null;
}

function listOrders(filters?: Record<string, unknown>) {
  let result = [...orders];
  if (filters?.status)
    result = result.filter((o) => o.status === filters.status);
  if (filters?.tableId)
    result = result.filter((o) => o.tableId === filters.tableId);
  return { orders: result, total: result.length };
}

function createOrder(tableId: string, items: OrderItem[]) {
  let total = 0;
  for (const item of items) {
    const mi = menuItems.find((m) => m.id === item.menuItemId);
    if (mi) total += mi.price * item.qty;
  }
  const newOrder: Order = {
    id: `ord-${orders.length + 1}`,
    tableId,
    items,
    total,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  orders.push(newOrder);
  return newOrder;
}

function listTables(filters?: Record<string, unknown>) {
  let result = [...tables];
  if (filters?.status)
    result = result.filter((t) => t.status === filters.status);
  return { tables: result, total: result.length };
}

function listCategories() {
  return { categories: [...categories], total: categories.length };
}

// ── Main Request Handler ───────────────────────────────────────────────────

/**
 * Restaurant Service API
 *
 * Actions:
 *   { action: "listMenuItems", filters?: { category?, available? } }
 *   { action: "getMenuItem", id: string }
 *   { action: "createOrder", tableId: string, items: { menuItemId, qty }[] }
 *   { action: "listOrders", filters?: { status?, tableId? } }
 *   { action: "listTables", filters?: { status? } }
 *   { action: "listCategories" }
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
          "Missing 'action' field. Available: listMenuItems, getMenuItem, createOrder, listOrders, listTables, listCategories",
      },
    };

  switch (action) {
    case "listMenuItems":
      return {
        status: 200,
        body: listMenuItems(body.filters as Record<string, unknown>),
      };
    case "getMenuItem": {
      const id = body.id as string;
      if (!id)
        return { status: 400, body: { error: "Missing 'id' field" } };
      const item = getMenuItem(id);
      if (!item)
        return { status: 404, body: { error: `Menu item not found: ${id}` } };
      return { status: 200, body: item };
    }
    case "createOrder": {
      const tableId = body.tableId as string;
      const items = body.items as OrderItem[];
      if (!tableId || !items)
        return {
          status: 400,
          body: { error: "Missing 'tableId' or 'items' field" },
        };
      return { status: 201, body: createOrder(tableId, items) };
    }
    case "listOrders":
      return {
        status: 200,
        body: listOrders(body.filters as Record<string, unknown>),
      };
    case "listTables":
      return {
        status: 200,
        body: listTables(body.filters as Record<string, unknown>),
      };
    case "listCategories":
      return { status: 200, body: listCategories() };
    default:
      return {
        status: 400,
        body: {
          error: `Unknown action: ${action}. Available: listMenuItems, getMenuItem, createOrder, listOrders, listTables, listCategories`,
        },
      };
  }
}
