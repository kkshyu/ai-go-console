import type { ServiceResponse } from "../builtin-industry";

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  barcode: string;
}

interface OrderItem {
  productId: string;
  qty: number;
  unitPrice: number;
}

interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  total: number;
  status: string;
  createdAt: string;
  paymentMethod: string;
}

interface InventoryRecord {
  id: string;
  productId: string;
  type: string;
  quantity: number;
  date: string;
  note: string;
}

interface Promotion {
  id: string;
  name: string;
  type: string;
  value: number;
  startDate: string;
  endDate: string;
  active: boolean;
}

const products: Product[] = [
  {
    id: "prod-1",
    name: "有機綠茶隨身包",
    sku: "TEA-GRN-001",
    category: "茶飲",
    price: 320,
    stock: 85,
    barcode: "4710001000011",
  },
  {
    id: "prod-2",
    name: "手工黑糖薑母茶",
    sku: "TEA-BRN-002",
    category: "茶飲",
    price: 280,
    stock: 42,
    barcode: "4710001000028",
  },
  {
    id: "prod-3",
    name: "台灣龍眼蜂蜜",
    sku: "HNY-LGN-001",
    category: "食品",
    price: 580,
    stock: 30,
    barcode: "4710001000035",
  },
  {
    id: "prod-4",
    name: "天然竹炭皂禮盒",
    sku: "SOP-CHR-001",
    category: "日用品",
    price: 450,
    stock: 0,
    barcode: "4710001000042",
  },
];

const orders: Order[] = [
  {
    id: "ord-1",
    customerId: "cust-1",
    items: [
      { productId: "prod-1", qty: 2, unitPrice: 320 },
      { productId: "prod-3", qty: 1, unitPrice: 580 },
    ],
    total: 1220,
    status: "completed",
    createdAt: "2026-03-27T14:30:00",
    paymentMethod: "信用卡",
  },
  {
    id: "ord-2",
    customerId: "cust-2",
    items: [{ productId: "prod-2", qty: 3, unitPrice: 280 }],
    total: 840,
    status: "shipping",
    createdAt: "2026-03-28T09:15:00",
    paymentMethod: "Line Pay",
  },
  {
    id: "ord-3",
    customerId: "cust-3",
    items: [
      { productId: "prod-1", qty: 1, unitPrice: 320 },
      { productId: "prod-2", qty: 1, unitPrice: 280 },
    ],
    total: 600,
    status: "pending",
    createdAt: "2026-03-28T11:00:00",
    paymentMethod: "貨到付款",
  },
];

const inventoryRecords: InventoryRecord[] = [
  {
    id: "inv-1",
    productId: "prod-1",
    type: "入庫",
    quantity: 100,
    date: "2026-03-20",
    note: "廠商進貨",
  },
  {
    id: "inv-2",
    productId: "prod-1",
    type: "出庫",
    quantity: 15,
    date: "2026-03-25",
    note: "門市銷售出貨",
  },
  {
    id: "inv-3",
    productId: "prod-4",
    type: "出庫",
    quantity: 20,
    date: "2026-03-22",
    note: "特價促銷出清",
  },
  {
    id: "inv-4",
    productId: "prod-3",
    type: "入庫",
    quantity: 30,
    date: "2026-03-15",
    note: "產地直送補貨",
  },
];

const promotions: Promotion[] = [
  {
    id: "promo-1",
    name: "春季茶飲八折優惠",
    type: "折扣",
    value: 0.8,
    startDate: "2026-03-01",
    endDate: "2026-03-31",
    active: true,
  },
  {
    id: "promo-2",
    name: "滿千折百",
    type: "滿額折扣",
    value: 100,
    startDate: "2026-03-15",
    endDate: "2026-04-15",
    active: true,
  },
  {
    id: "promo-3",
    name: "會員日全館九折",
    type: "折扣",
    value: 0.9,
    startDate: "2026-04-01",
    endDate: "2026-04-01",
    active: false,
  },
];

function listProducts(filters?: Record<string, unknown>) {
  let items = [...products];
  if (filters?.category)
    items = items.filter((p) => p.category === filters.category);
  if (filters?.inStock) items = items.filter((p) => p.stock > 0);
  return { items, total: items.length };
}

function getProduct(id: string) {
  const product = products.find((p) => p.id === id);
  if (!product) return null;
  const history = inventoryRecords.filter((r) => r.productId === id);
  return { ...product, inventoryHistory: history };
}

function listOrders(filters?: Record<string, unknown>) {
  let items = [...orders];
  if (filters?.status)
    items = items.filter((o) => o.status === filters.status);
  if (filters?.customerId)
    items = items.filter((o) => o.customerId === filters.customerId);
  return { items, total: items.length };
}

function createOrder(
  customerId: string,
  items: { productId: string; qty: number }[],
  paymentMethod: string
) {
  const orderItems: OrderItem[] = items.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    return {
      productId: item.productId,
      qty: item.qty,
      unitPrice: product?.price ?? 0,
    };
  });
  const total = orderItems.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const newOrder: Order = {
    id: `ord-${orders.length + 1}`,
    customerId,
    items: orderItems,
    total,
    status: "pending",
    createdAt: new Date().toISOString(),
    paymentMethod,
  };
  orders.push(newOrder);
  return { order: newOrder };
}

function listInventory(filters?: Record<string, unknown>) {
  let items = [...inventoryRecords];
  if (filters?.productId)
    items = items.filter((r) => r.productId === filters.productId);
  if (filters?.type) items = items.filter((r) => r.type === filters.type);
  return { items, total: items.length };
}

function addInventory(
  productId: string,
  type: string,
  quantity: number,
  note: string
) {
  const product = products.find((p) => p.id === productId);
  if (!product) return { error: "Product not found" };
  const newRecord: InventoryRecord = {
    id: `inv-${inventoryRecords.length + 1}`,
    productId,
    type,
    quantity,
    date: new Date().toISOString().split("T")[0],
    note,
  };
  inventoryRecords.push(newRecord);
  if (type === "入庫") product.stock += quantity;
  else if (type === "出庫") product.stock -= quantity;
  return { record: newRecord, currentStock: product.stock };
}

function listPromotions(filters?: Record<string, unknown>) {
  let items = [...promotions];
  if (filters?.active !== undefined)
    items = items.filter((p) => p.active === filters.active);
  if (filters?.type) items = items.filter((p) => p.type === filters.type);
  return { items, total: items.length };
}

/**
 * Retail Service API
 * Actions: listProducts, getProduct, listOrders, createOrder, listInventory, addInventory, listPromotions
 */
export function handleRequest(body: Record<string, unknown>): ServiceResponse {
  const action = body.action as string;
  if (!action) {
    return {
      status: 400,
      body: {
        error:
          "Missing 'action' field. Available: listProducts, getProduct, listOrders, createOrder, listInventory, addInventory, listPromotions",
      },
    };
  }

  switch (action) {
    case "listProducts":
      return {
        status: 200,
        body: listProducts(body.filters as Record<string, unknown>),
      };
    case "getProduct": {
      const result = getProduct(body.id as string);
      if (!result)
        return { status: 404, body: { error: "Product not found" } };
      return { status: 200, body: result };
    }
    case "listOrders":
      return {
        status: 200,
        body: listOrders(body.filters as Record<string, unknown>),
      };
    case "createOrder": {
      const result = createOrder(
        body.customerId as string,
        body.items as { productId: string; qty: number }[],
        (body.paymentMethod as string) ?? "現金"
      );
      return { status: 201, body: result };
    }
    case "listInventory":
      return {
        status: 200,
        body: listInventory(body.filters as Record<string, unknown>),
      };
    case "addInventory": {
      const result = addInventory(
        body.productId as string,
        body.type as string,
        body.quantity as number,
        (body.note as string) ?? ""
      );
      if ("error" in result)
        return { status: 400, body: { error: result.error } };
      return { status: 201, body: result };
    }
    case "listPromotions":
      return {
        status: 200,
        body: listPromotions(body.filters as Record<string, unknown>),
      };
    default:
      return { status: 400, body: { error: `Unknown action: ${action}` } };
  }
}
