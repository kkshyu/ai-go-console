import type { ServiceResponse } from "../builtin-industry";

interface Member {
  id: string;
  name: string;
  phone: string;
  plan: string;
  startDate: string;
  endDate: string;
  status: string;
  checkins: number;
}

interface ClassSchedule {
  id: string;
  name: string;
  trainer: string;
  dayOfWeek: string;
  time: string;
  duration: number;
  maxCapacity: number;
  enrolled: number;
}

interface Checkin {
  id: string;
  memberId: string;
  date: string;
  time: string;
  type: string;
  classId: string | null;
}

interface Trainer {
  id: string;
  name: string;
  specialties: string[];
  phone: string;
  schedule: string;
}

const members: Member[] = [
  {
    id: "mem-1",
    name: "陳志明",
    phone: "0912-345-678",
    plan: "年費",
    startDate: "2025-06-01",
    endDate: "2026-05-31",
    status: "active",
    checkins: 142,
  },
  {
    id: "mem-2",
    name: "林美玲",
    phone: "0923-456-789",
    plan: "月費",
    startDate: "2026-03-01",
    endDate: "2026-03-31",
    status: "active",
    checkins: 18,
  },
  {
    id: "mem-3",
    name: "張偉傑",
    phone: "0934-567-890",
    plan: "年費",
    startDate: "2025-01-15",
    endDate: "2026-01-14",
    status: "expired",
    checkins: 205,
  },
  {
    id: "mem-4",
    name: "王雅婷",
    phone: "0945-678-901",
    plan: "月費",
    startDate: "2026-03-01",
    endDate: "2026-03-31",
    status: "active",
    checkins: 12,
  },
];

const classSchedules: ClassSchedule[] = [
  {
    id: "cls-1",
    name: "瑜珈初階",
    trainer: "tr-1",
    dayOfWeek: "一",
    time: "09:00",
    duration: 60,
    maxCapacity: 20,
    enrolled: 15,
  },
  {
    id: "cls-2",
    name: "飛輪有氧",
    trainer: "tr-2",
    dayOfWeek: "三",
    time: "18:30",
    duration: 45,
    maxCapacity: 25,
    enrolled: 23,
  },
  {
    id: "cls-3",
    name: "拳擊體適能",
    trainer: "tr-3",
    dayOfWeek: "五",
    time: "19:00",
    duration: 50,
    maxCapacity: 15,
    enrolled: 15,
  },
  {
    id: "cls-4",
    name: "皮拉提斯",
    trainer: "tr-1",
    dayOfWeek: "四",
    time: "10:00",
    duration: 55,
    maxCapacity: 18,
    enrolled: 10,
  },
];

const checkins: Checkin[] = [
  {
    id: "ck-1",
    memberId: "mem-1",
    date: "2026-03-28",
    time: "07:15",
    type: "gym",
    classId: null,
  },
  {
    id: "ck-2",
    memberId: "mem-2",
    date: "2026-03-28",
    time: "09:00",
    type: "class",
    classId: "cls-1",
  },
  {
    id: "ck-3",
    memberId: "mem-4",
    date: "2026-03-28",
    time: "17:45",
    type: "gym",
    classId: null,
  },
];

const trainers: Trainer[] = [
  {
    id: "tr-1",
    name: "劉佳慧",
    specialties: ["瑜珈", "皮拉提斯"],
    phone: "0911-222-333",
    schedule: "週一至週五",
  },
  {
    id: "tr-2",
    name: "黃建宏",
    specialties: ["飛輪", "重量訓練"],
    phone: "0922-333-444",
    schedule: "週一、三、五",
  },
  {
    id: "tr-3",
    name: "蔡宗翰",
    specialties: ["拳擊", "體適能", "TRX"],
    phone: "0933-444-555",
    schedule: "週二至週六",
  },
];

function listMembers(filters?: Record<string, unknown>) {
  let items = [...members];
  if (filters?.plan) items = items.filter((m) => m.plan === filters.plan);
  if (filters?.status) items = items.filter((m) => m.status === filters.status);
  return { items, total: items.length };
}

function getMember(id: string) {
  const member = members.find((m) => m.id === id);
  if (!member) return null;
  const memberCheckins = checkins.filter((c) => c.memberId === id);
  return { ...member, recentCheckins: memberCheckins };
}

function listClassSchedule(filters?: Record<string, unknown>) {
  let items = [...classSchedules];
  if (filters?.dayOfWeek)
    items = items.filter((c) => c.dayOfWeek === filters.dayOfWeek);
  if (filters?.trainer)
    items = items.filter((c) => c.trainer === filters.trainer);
  return { items, total: items.length };
}

function listCheckins(filters?: Record<string, unknown>) {
  let items = [...checkins];
  if (filters?.memberId)
    items = items.filter((c) => c.memberId === filters.memberId);
  if (filters?.date) items = items.filter((c) => c.date === filters.date);
  if (filters?.type) items = items.filter((c) => c.type === filters.type);
  return { items, total: items.length };
}

function checkinMember(memberId: string, type: string, classId?: string) {
  const member = members.find((m) => m.id === memberId);
  if (!member) return { error: "Member not found" };
  if (member.status !== "active") return { error: "Member is not active" };
  const newCheckin: Checkin = {
    id: `ck-${checkins.length + 1}`,
    memberId,
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
    type,
    classId: classId ?? null,
  };
  checkins.push(newCheckin);
  return { checkin: newCheckin };
}

function listTrainers(filters?: Record<string, unknown>) {
  let items = [...trainers];
  if (filters?.specialty)
    items = items.filter((t) =>
      t.specialties.includes(filters.specialty as string)
    );
  return { items, total: items.length };
}

/**
 * Fitness Service API
 * Actions: listMembers, getMember, listClassSchedule, listCheckins, checkinMember, listTrainers
 */
export function handleRequest(body: Record<string, unknown>): ServiceResponse {
  const action = body.action as string;
  if (!action) {
    return {
      status: 400,
      body: {
        error:
          "Missing 'action' field. Available: listMembers, getMember, listClassSchedule, listCheckins, checkinMember, listTrainers",
      },
    };
  }

  switch (action) {
    case "listMembers":
      return {
        status: 200,
        body: listMembers(body.filters as Record<string, unknown>),
      };
    case "getMember": {
      const result = getMember(body.id as string);
      if (!result)
        return { status: 404, body: { error: "Member not found" } };
      return { status: 200, body: result };
    }
    case "listClassSchedule":
      return {
        status: 200,
        body: listClassSchedule(body.filters as Record<string, unknown>),
      };
    case "listCheckins":
      return {
        status: 200,
        body: listCheckins(body.filters as Record<string, unknown>),
      };
    case "checkinMember": {
      const result = checkinMember(
        body.memberId as string,
        (body.type as string) ?? "gym",
        body.classId as string | undefined
      );
      if ("error" in result)
        return { status: 400, body: { error: result.error } };
      return { status: 201, body: result };
    }
    case "listTrainers":
      return {
        status: 200,
        body: listTrainers(body.filters as Record<string, unknown>),
      };
    default:
      return { status: 400, body: { error: `Unknown action: ${action}` } };
  }
}
