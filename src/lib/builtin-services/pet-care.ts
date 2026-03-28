import type { ServiceResponse } from "../builtin-industry";

// --- Domain types ---

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  ownerName: string;
  ownerPhone: string;
  weight: number;
}

interface Appointment {
  id: string;
  petId: string;
  service: string;
  date: string;
  time: string;
  groomer?: string;
  vet?: string;
  status: string;
  price: number;
}

interface HealthRecord {
  id: string;
  petId: string;
  date: string;
  type: string;
  description: string;
  vet: string;
  nextDue: string;
}

interface Boarding {
  id: string;
  petId: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  dailyRate: number;
  total: number;
  status: string;
  specialNeeds: string;
}

// --- Mock data ---

const pets: Pet[] = [
  {
    id: "pet-1",
    name: "小柴",
    species: "狗",
    breed: "柴犬",
    age: 3,
    ownerName: "李雅婷",
    ownerPhone: "0911-222-333",
    weight: 10.5,
  },
  {
    id: "pet-2",
    name: "咪咪",
    species: "貓",
    breed: "英國短毛貓",
    age: 2,
    ownerName: "張文豪",
    ownerPhone: "0922-333-444",
    weight: 4.8,
  },
  {
    id: "pet-3",
    name: "旺財",
    species: "狗",
    breed: "黃金獵犬",
    age: 5,
    ownerName: "陳淑芬",
    ownerPhone: "0933-444-555",
    weight: 28.3,
  },
  {
    id: "pet-4",
    name: "橘子",
    species: "貓",
    breed: "米克斯",
    age: 1,
    ownerName: "李雅婷",
    ownerPhone: "0911-222-333",
    weight: 3.2,
  },
];

const appointments: Appointment[] = [
  {
    id: "apt-1",
    petId: "pet-1",
    service: "美容洗澡",
    date: "2026-03-28",
    time: "10:00",
    groomer: "小美",
    status: "confirmed",
    price: 800,
  },
  {
    id: "apt-2",
    petId: "pet-2",
    service: "健康檢查",
    date: "2026-03-29",
    time: "14:00",
    vet: "王醫師",
    status: "confirmed",
    price: 1200,
  },
  {
    id: "apt-3",
    petId: "pet-3",
    service: "美容洗澡",
    date: "2026-03-28",
    time: "14:00",
    groomer: "阿華",
    status: "in_progress",
    price: 1200,
  },
];

const healthRecords: HealthRecord[] = [
  {
    id: "hr-1",
    petId: "pet-1",
    date: "2026-02-15",
    type: "疫苗",
    description: "八合一疫苗第三劑",
    vet: "王醫師",
    nextDue: "2027-02-15",
  },
  {
    id: "hr-2",
    petId: "pet-2",
    date: "2026-01-20",
    type: "驅蟲",
    description: "體內外驅蟲（滴劑）",
    vet: "林醫師",
    nextDue: "2026-04-20",
  },
  {
    id: "hr-3",
    petId: "pet-3",
    date: "2026-03-01",
    type: "健檢",
    description: "年度健康檢查，血液與X光皆正常",
    vet: "王醫師",
    nextDue: "2027-03-01",
  },
  {
    id: "hr-4",
    petId: "pet-4",
    date: "2026-03-10",
    type: "疫苗",
    description: "三合一疫苗第二劑",
    vet: "林醫師",
    nextDue: "2026-06-10",
  },
];

const boardings: Boarding[] = [
  {
    id: "bd-1",
    petId: "pet-1",
    checkIn: "2026-04-01",
    checkOut: "2026-04-05",
    roomType: "標準犬房",
    dailyRate: 600,
    total: 2400,
    status: "reserved",
    specialNeeds: "每日需散步兩次，飼料自備",
  },
  {
    id: "bd-2",
    petId: "pet-2",
    checkIn: "2026-03-20",
    checkOut: "2026-03-25",
    roomType: "豪華貓房",
    dailyRate: 500,
    total: 2500,
    status: "completed",
    specialNeeds: "需要獨立空間，對其他貓緊張",
  },
  {
    id: "bd-3",
    petId: "pet-3",
    checkIn: "2026-04-10",
    checkOut: "2026-04-14",
    roomType: "大型犬房",
    dailyRate: 800,
    total: 3200,
    status: "reserved",
    specialNeeds: "需每日服用關節保健品",
  },
];

// --- Action handlers ---

function listPets(filters?: Record<string, unknown>) {
  let items = [...pets];
  if (filters?.species) items = items.filter((p) => p.species === filters.species);
  if (filters?.ownerName)
    items = items.filter((p) => p.ownerName === filters.ownerName);
  return { items, total: items.length };
}

function getPet(id: unknown) {
  return pets.find((p) => p.id === id) ?? null;
}

function listAppointments(filters?: Record<string, unknown>) {
  let items = [...appointments];
  if (filters?.petId) items = items.filter((a) => a.petId === filters.petId);
  if (filters?.status) items = items.filter((a) => a.status === filters.status);
  if (filters?.date) items = items.filter((a) => a.date === filters.date);
  return { items, total: items.length };
}

function bookAppointment(data: Record<string, unknown>) {
  const newApt: Appointment = {
    id: `apt-${appointments.length + 1}`,
    petId: (data.petId as string) ?? "",
    service: (data.service as string) ?? "",
    date: (data.date as string) ?? "",
    time: (data.time as string) ?? "",
    groomer: data.groomer as string | undefined,
    vet: data.vet as string | undefined,
    status: "confirmed",
    price: (data.price as number) ?? 0,
  };
  appointments.push(newApt);
  return newApt;
}

function listHealthRecords(filters?: Record<string, unknown>) {
  let items = [...healthRecords];
  if (filters?.petId) items = items.filter((r) => r.petId === filters.petId);
  if (filters?.type) items = items.filter((r) => r.type === filters.type);
  return { items, total: items.length };
}

function listBoardings(filters?: Record<string, unknown>) {
  let items = [...boardings];
  if (filters?.petId) items = items.filter((b) => b.petId === filters.petId);
  if (filters?.status) items = items.filter((b) => b.status === filters.status);
  return { items, total: items.length };
}

function createBoarding(data: Record<string, unknown>) {
  const newBoarding: Boarding = {
    id: `bd-${boardings.length + 1}`,
    petId: (data.petId as string) ?? "",
    checkIn: (data.checkIn as string) ?? "",
    checkOut: (data.checkOut as string) ?? "",
    roomType: (data.roomType as string) ?? "",
    dailyRate: (data.dailyRate as number) ?? 0,
    total: (data.total as number) ?? 0,
    status: "reserved",
    specialNeeds: (data.specialNeeds as string) ?? "",
  };
  boardings.push(newBoarding);
  return newBoarding;
}

// --- Main handler ---

const ACTIONS =
  "listPets, getPet, listAppointments, bookAppointment, listHealthRecords, listBoardings, createBoarding";

/**
 * Pet Care Service API
 *
 * Actions:
 * - listPets(filters?: { species?, ownerName? }) — list all pets, optionally filtered
 * - getPet(id) — get a single pet by ID
 * - listAppointments(filters?: { petId?, status?, date? }) — list appointments, optionally filtered
 * - bookAppointment(data: { petId, service, date, time, groomer?, vet?, price }) — book a new appointment
 * - listHealthRecords(filters?: { petId?, type? }) — list health records, optionally filtered
 * - listBoardings(filters?: { petId?, status? }) — list boardings, optionally filtered
 * - createBoarding(data: { petId, checkIn, checkOut, roomType, dailyRate, total, specialNeeds }) — create a new boarding reservation
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
    case "listPets":
      return {
        status: 200,
        body: listPets(body.filters as Record<string, unknown>),
      };

    case "getPet": {
      const item = getPet(body.id);
      if (!item)
        return { status: 404, body: { error: `Pet not found: ${body.id}` } };
      return { status: 200, body: item };
    }

    case "listAppointments":
      return {
        status: 200,
        body: listAppointments(body.filters as Record<string, unknown>),
      };

    case "bookAppointment":
      return {
        status: 201,
        body: bookAppointment(body.data as Record<string, unknown> ?? {}),
      };

    case "listHealthRecords":
      return {
        status: 200,
        body: listHealthRecords(body.filters as Record<string, unknown>),
      };

    case "listBoardings":
      return {
        status: 200,
        body: listBoardings(body.filters as Record<string, unknown>),
      };

    case "createBoarding":
      return {
        status: 201,
        body: createBoarding(body.data as Record<string, unknown> ?? {}),
      };

    default:
      return {
        status: 400,
        body: { error: `Unknown action: ${action}. Available: ${ACTIONS}` },
      };
  }
}
