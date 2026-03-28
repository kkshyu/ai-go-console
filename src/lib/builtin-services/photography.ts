import type { ServiceResponse } from "../builtin-industry";

// --- Domain types ---

interface Booking {
  id: string;
  clientName: string;
  type: string;
  date: string;
  location: string;
  duration: number;
  price: number;
  status: string;
  photographer: string;
}

interface Portfolio {
  id: string;
  title: string;
  category: string;
  photos: number;
  coverUrl: string;
  publishDate: string;
  featured: boolean;
}

interface Contract {
  id: string;
  bookingId: string;
  clientName: string;
  signDate: string | null;
  deposit: number;
  totalAmount: number;
  status: string;
  deliverables: string;
}

interface EditingTask {
  id: string;
  bookingId: string;
  editor: string;
  totalPhotos: number;
  editedPhotos: number;
  status: string;
  dueDate: string;
  priority: string;
}

// --- Mock data ---

const bookings: Booking[] = [
  {
    id: "bk-1",
    clientName: "林佳慧",
    type: "婚紗",
    date: "2026-04-15",
    location: "陽明山擎天崗",
    duration: 6,
    price: 38000,
    status: "confirmed",
    photographer: "Alex",
  },
  {
    id: "bk-2",
    clientName: "鮮味食品有限公司",
    type: "商品",
    date: "2026-03-30",
    location: "攝影棚A",
    duration: 4,
    price: 15000,
    status: "confirmed",
    photographer: "小瑜",
  },
  {
    id: "bk-3",
    clientName: "張雅琪",
    type: "人像",
    date: "2026-04-02",
    location: "華山文創園區",
    duration: 2,
    price: 8000,
    status: "pending",
    photographer: "Alex",
  },
];

const portfolios: Portfolio[] = [
  {
    id: "pf-1",
    title: "春日花嫁系列",
    category: "婚紗",
    photos: 45,
    coverUrl: "/portfolio/spring-wedding-cover.jpg",
    publishDate: "2026-02-14",
    featured: true,
  },
  {
    id: "pf-2",
    title: "都會風格人像",
    category: "人像",
    photos: 30,
    coverUrl: "/portfolio/urban-portrait-cover.jpg",
    publishDate: "2026-01-20",
    featured: false,
  },
  {
    id: "pf-3",
    title: "美食攝影精選",
    category: "商品",
    photos: 60,
    coverUrl: "/portfolio/food-product-cover.jpg",
    publishDate: "2026-03-01",
    featured: true,
  },
];

const contracts: Contract[] = [
  {
    id: "ct-1",
    bookingId: "bk-1",
    clientName: "林佳慧",
    signDate: "2026-03-10",
    deposit: 12000,
    totalAmount: 38000,
    status: "signed",
    deliverables: "精修照片50張、相冊一本、原始檔USB",
  },
  {
    id: "ct-2",
    bookingId: "bk-2",
    clientName: "鮮味食品有限公司",
    signDate: "2026-03-20",
    deposit: 5000,
    totalAmount: 15000,
    status: "signed",
    deliverables: "商品去背照40張、情境照20張、原始檔雲端交付",
  },
  {
    id: "ct-3",
    bookingId: "bk-3",
    clientName: "張雅琪",
    signDate: null,
    deposit: 0,
    totalAmount: 8000,
    status: "draft",
    deliverables: "精修照片20張、數位檔案雲端交付",
  },
];

const editingTasks: EditingTask[] = [
  {
    id: "et-1",
    bookingId: "bk-1",
    editor: "小瑜",
    totalPhotos: 320,
    editedPhotos: 0,
    status: "pending",
    dueDate: "2026-05-15",
    priority: "high",
  },
  {
    id: "et-2",
    bookingId: "bk-2",
    editor: "Alex",
    totalPhotos: 150,
    editedPhotos: 45,
    status: "in_progress",
    dueDate: "2026-04-10",
    priority: "medium",
  },
  {
    id: "et-3",
    bookingId: "bk-3",
    editor: "小瑜",
    totalPhotos: 80,
    editedPhotos: 80,
    status: "completed",
    dueDate: "2026-03-25",
    priority: "low",
  },
];

// --- Action handlers ---

function listBookings(filters?: Record<string, unknown>) {
  let items = [...bookings];
  if (filters?.type) items = items.filter((b) => b.type === filters.type);
  if (filters?.status) items = items.filter((b) => b.status === filters.status);
  if (filters?.photographer)
    items = items.filter((b) => b.photographer === filters.photographer);
  return { items, total: items.length };
}

function getBooking(id: unknown) {
  return bookings.find((b) => b.id === id) ?? null;
}

function createBooking(data: Record<string, unknown>) {
  const newBooking: Booking = {
    id: `bk-${bookings.length + 1}`,
    clientName: (data.clientName as string) ?? "",
    type: (data.type as string) ?? "",
    date: (data.date as string) ?? "",
    location: (data.location as string) ?? "",
    duration: (data.duration as number) ?? 0,
    price: (data.price as number) ?? 0,
    status: "pending",
    photographer: (data.photographer as string) ?? "",
  };
  bookings.push(newBooking);
  return newBooking;
}

function listPortfolios(filters?: Record<string, unknown>) {
  let items = [...portfolios];
  if (filters?.category)
    items = items.filter((p) => p.category === filters.category);
  if (filters?.featured !== undefined)
    items = items.filter((p) => p.featured === filters.featured);
  return { items, total: items.length };
}

function listContracts(filters?: Record<string, unknown>) {
  let items = [...contracts];
  if (filters?.status) items = items.filter((c) => c.status === filters.status);
  if (filters?.bookingId)
    items = items.filter((c) => c.bookingId === filters.bookingId);
  return { items, total: items.length };
}

function listEditingTasks(filters?: Record<string, unknown>) {
  let items = [...editingTasks];
  if (filters?.status) items = items.filter((t) => t.status === filters.status);
  if (filters?.editor) items = items.filter((t) => t.editor === filters.editor);
  if (filters?.priority)
    items = items.filter((t) => t.priority === filters.priority);
  return { items, total: items.length };
}

function updateEditingTask(id: unknown, data: Record<string, unknown>) {
  const task = editingTasks.find((t) => t.id === id);
  if (!task) return null;
  if (data.editedPhotos !== undefined)
    task.editedPhotos = data.editedPhotos as number;
  if (data.status !== undefined) task.status = data.status as string;
  if (data.priority !== undefined) task.priority = data.priority as string;
  return task;
}

// --- Main handler ---

const ACTIONS =
  "listBookings, getBooking, createBooking, listPortfolios, listContracts, listEditingTasks, updateEditingTask";

/**
 * Photography Service API
 *
 * Actions:
 * - listBookings(filters?: { type?, status?, photographer? }) — list all bookings, optionally filtered
 * - getBooking(id) — get a single booking by ID
 * - createBooking(data: { clientName, type, date, location, duration, price, photographer }) — create a new booking
 * - listPortfolios(filters?: { category?, featured? }) — list portfolios, optionally filtered
 * - listContracts(filters?: { status?, bookingId? }) — list contracts, optionally filtered
 * - listEditingTasks(filters?: { status?, editor?, priority? }) — list editing tasks, optionally filtered
 * - updateEditingTask(id, data: { editedPhotos?, status?, priority? }) — update an editing task
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
    case "listBookings":
      return {
        status: 200,
        body: listBookings(body.filters as Record<string, unknown>),
      };

    case "getBooking": {
      const item = getBooking(body.id);
      if (!item)
        return { status: 404, body: { error: `Booking not found: ${body.id}` } };
      return { status: 200, body: item };
    }

    case "createBooking":
      return {
        status: 201,
        body: createBooking(body.data as Record<string, unknown> ?? {}),
      };

    case "listPortfolios":
      return {
        status: 200,
        body: listPortfolios(body.filters as Record<string, unknown>),
      };

    case "listContracts":
      return {
        status: 200,
        body: listContracts(body.filters as Record<string, unknown>),
      };

    case "listEditingTasks":
      return {
        status: 200,
        body: listEditingTasks(body.filters as Record<string, unknown>),
      };

    case "updateEditingTask": {
      const task = updateEditingTask(
        body.id,
        (body.data as Record<string, unknown>) ?? {}
      );
      if (!task)
        return {
          status: 404,
          body: { error: `Editing task not found: ${body.id}` },
        };
      return { status: 200, body: task };
    }

    default:
      return {
        status: 400,
        body: { error: `Unknown action: ${action}. Available: ${ACTIONS}` },
      };
  }
}
