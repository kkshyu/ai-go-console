import type { ServiceResponse } from "../builtin-industry";

interface Room {
  id: string;
  name: string;
  type: string;
  floor: number;
  capacity: number;
  price: number;
  amenities: string[];
  status: string;
}

interface Reservation {
  id: string;
  guestName: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  total: number;
  status: string;
  phone: string;
}

interface Guest {
  id: string;
  name: string;
  idNumber: string;
  phone: string;
  email: string;
  visits: number;
  vip: boolean;
}

interface HousekeepingTask {
  id: string;
  roomId: string;
  date: string;
  status: string;
  assignee: string;
  notes: string;
}

const rooms: Room[] = [
  {
    id: "rm-1",
    name: "301",
    type: "double",
    floor: 3,
    capacity: 2,
    price: 3200,
    amenities: ["Wi-Fi", "冷氣", "冰箱", "浴缸"],
    status: "occupied",
  },
  {
    id: "rm-2",
    name: "502",
    type: "suite",
    floor: 5,
    capacity: 4,
    price: 6800,
    amenities: ["Wi-Fi", "冷氣", "冰箱", "浴缸", "客廳", "陽台"],
    status: "available",
  },
  {
    id: "rm-3",
    name: "205",
    type: "single",
    floor: 2,
    capacity: 1,
    price: 1800,
    amenities: ["Wi-Fi", "冷氣", "冰箱"],
    status: "maintenance",
  },
  {
    id: "rm-4",
    name: "401",
    type: "family",
    floor: 4,
    capacity: 4,
    price: 5200,
    amenities: ["Wi-Fi", "冷氣", "冰箱", "浴缸", "兒童遊戲區"],
    status: "available",
  },
];

const reservations: Reservation[] = [
  {
    id: "rsv-1",
    guestName: "李大華",
    roomId: "rm-1",
    checkIn: "2026-03-27",
    checkOut: "2026-03-29",
    nights: 2,
    total: 6400,
    status: "checked_in",
    phone: "0912-111-222",
  },
  {
    id: "rsv-2",
    guestName: "吳佩珊",
    roomId: "rm-2",
    checkIn: "2026-03-30",
    checkOut: "2026-04-02",
    nights: 3,
    total: 20400,
    status: "confirmed",
    phone: "0923-222-333",
  },
  {
    id: "rsv-3",
    guestName: "鄭文凱",
    roomId: "rm-4",
    checkIn: "2026-04-05",
    checkOut: "2026-04-07",
    nights: 2,
    total: 10400,
    status: "confirmed",
    phone: "0934-333-444",
  },
];

const guests: Guest[] = [
  {
    id: "gst-1",
    name: "李大華",
    idNumber: "A1234***89",
    phone: "0912-111-222",
    email: "dahua.li@example.com",
    visits: 5,
    vip: true,
  },
  {
    id: "gst-2",
    name: "吳佩珊",
    idNumber: "B9876***21",
    phone: "0923-222-333",
    email: "peishan.wu@example.com",
    visits: 1,
    vip: false,
  },
  {
    id: "gst-3",
    name: "鄭文凱",
    idNumber: "C5678***45",
    phone: "0934-333-444",
    email: "wenkai.zheng@example.com",
    visits: 12,
    vip: true,
  },
];

const housekeepingTasks: HousekeepingTask[] = [
  {
    id: "hk-1",
    roomId: "rm-1",
    date: "2026-03-28",
    status: "completed",
    assignee: "王小姐",
    notes: "已更換毛巾與備品",
  },
  {
    id: "hk-2",
    roomId: "rm-2",
    date: "2026-03-28",
    status: "in_progress",
    assignee: "陳先生",
    notes: "深度清潔中",
  },
  {
    id: "hk-3",
    roomId: "rm-3",
    date: "2026-03-28",
    status: "pending",
    assignee: "林小姐",
    notes: "等待維修完成後清潔",
  },
  {
    id: "hk-4",
    roomId: "rm-4",
    date: "2026-03-28",
    status: "completed",
    assignee: "王小姐",
    notes: "一般清潔完成",
  },
];

function listRooms(filters?: Record<string, unknown>) {
  let items = [...rooms];
  if (filters?.type) items = items.filter((r) => r.type === filters.type);
  if (filters?.status)
    items = items.filter((r) => r.status === filters.status);
  if (filters?.floor) items = items.filter((r) => r.floor === filters.floor);
  return { items, total: items.length };
}

function getRoom(id: string) {
  const room = rooms.find((r) => r.id === id);
  if (!room) return null;
  const roomReservations = reservations.filter((r) => r.roomId === id);
  const roomHousekeeping = housekeepingTasks.filter((h) => h.roomId === id);
  return { ...room, reservations: roomReservations, housekeeping: roomHousekeeping };
}

function listReservations(filters?: Record<string, unknown>) {
  let items = [...reservations];
  if (filters?.status)
    items = items.filter((r) => r.status === filters.status);
  if (filters?.roomId)
    items = items.filter((r) => r.roomId === filters.roomId);
  if (filters?.guestName)
    items = items.filter((r) => r.guestName.includes(filters.guestName as string));
  return { items, total: items.length };
}

function createReservation(
  guestName: string,
  roomId: string,
  checkIn: string,
  checkOut: string,
  phone: string
) {
  const room = rooms.find((r) => r.id === roomId);
  if (!room) return { error: "Room not found" };
  if (room.status !== "available") return { error: "Room is not available" };
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const nights = Math.ceil(
    (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const newReservation: Reservation = {
    id: `rsv-${reservations.length + 1}`,
    guestName,
    roomId,
    checkIn,
    checkOut,
    nights,
    total: room.price * nights,
    status: "confirmed",
    phone,
  };
  reservations.push(newReservation);
  return { reservation: newReservation };
}

function listGuests(filters?: Record<string, unknown>) {
  let items = [...guests];
  if (filters?.vip !== undefined)
    items = items.filter((g) => g.vip === filters.vip);
  if (filters?.name)
    items = items.filter((g) => g.name.includes(filters.name as string));
  return { items, total: items.length };
}

function listHousekeeping(filters?: Record<string, unknown>) {
  let items = [...housekeepingTasks];
  if (filters?.status)
    items = items.filter((h) => h.status === filters.status);
  if (filters?.roomId)
    items = items.filter((h) => h.roomId === filters.roomId);
  if (filters?.date) items = items.filter((h) => h.date === filters.date);
  return { items, total: items.length };
}

function updateRoomStatus(roomId: string, status: string) {
  const room = rooms.find((r) => r.id === roomId);
  if (!room) return { error: "Room not found" };
  const oldStatus = room.status;
  room.status = status;
  return { room, previousStatus: oldStatus };
}

/**
 * Hospitality Service API
 * Actions: listRooms, getRoom, listReservations, createReservation, listGuests, listHousekeeping, updateRoomStatus
 */
export function handleRequest(body: Record<string, unknown>): ServiceResponse {
  const action = body.action as string;
  if (!action) {
    return {
      status: 400,
      body: {
        error:
          "Missing 'action' field. Available: listRooms, getRoom, listReservations, createReservation, listGuests, listHousekeeping, updateRoomStatus",
      },
    };
  }

  switch (action) {
    case "listRooms":
      return {
        status: 200,
        body: listRooms(body.filters as Record<string, unknown>),
      };
    case "getRoom": {
      const result = getRoom(body.id as string);
      if (!result)
        return { status: 404, body: { error: "Room not found" } };
      return { status: 200, body: result };
    }
    case "listReservations":
      return {
        status: 200,
        body: listReservations(body.filters as Record<string, unknown>),
      };
    case "createReservation": {
      const result = createReservation(
        body.guestName as string,
        body.roomId as string,
        body.checkIn as string,
        body.checkOut as string,
        (body.phone as string) ?? ""
      );
      if ("error" in result)
        return { status: 400, body: { error: result.error } };
      return { status: 201, body: result };
    }
    case "listGuests":
      return {
        status: 200,
        body: listGuests(body.filters as Record<string, unknown>),
      };
    case "listHousekeeping":
      return {
        status: 200,
        body: listHousekeeping(body.filters as Record<string, unknown>),
      };
    case "updateRoomStatus": {
      const result = updateRoomStatus(
        body.roomId as string,
        body.status as string
      );
      if ("error" in result)
        return { status: 400, body: { error: result.error } };
      return { status: 200, body: result };
    }
    default:
      return { status: 400, body: { error: `Unknown action: ${action}` } };
  }
}
