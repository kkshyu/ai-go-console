import type { ServiceResponse } from "../builtin-industry";

// ── Medical-specific types ─────────────────────────────────────────────────

interface Patient {
  id: string;
  name: string;
  gender: string;
  birthDate: string;
  phone: string;
  bloodType: string;
  allergies: string[];
}

interface Appointment {
  id: string;
  patientId: string;
  doctorName: string;
  department: string;
  date: string;
  time: string;
  status: string;
}

interface MedicalRecord {
  id: string;
  patientId: string;
  doctorName: string;
  date: string;
  diagnosis: string;
  prescription: string;
  notes: string;
}

interface Schedule {
  id: string;
  doctorName: string;
  department: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  maxPatients: number;
}

// ── Mock Data ──────────────────────────────────────────────────────────────

const patients: Patient[] = [
  {
    id: "pat-1",
    name: "陳美玲",
    gender: "女",
    birthDate: "1985-04-12",
    phone: "0912-345-678",
    bloodType: "A",
    allergies: ["盤尼西林"],
  },
  {
    id: "pat-2",
    name: "林志明",
    gender: "男",
    birthDate: "1972-08-25",
    phone: "0923-456-789",
    bloodType: "O",
    allergies: [],
  },
  {
    id: "pat-3",
    name: "王淑芬",
    gender: "女",
    birthDate: "1990-11-03",
    phone: "0934-567-890",
    bloodType: "B",
    allergies: ["阿斯匹靈", "磺胺類藥物"],
  },
  {
    id: "pat-4",
    name: "張大偉",
    gender: "男",
    birthDate: "1968-02-18",
    phone: "0945-678-901",
    bloodType: "AB",
    allergies: [],
  },
];

const appointments: Appointment[] = [
  {
    id: "apt-1",
    patientId: "pat-1",
    doctorName: "李文華醫師",
    department: "內科",
    date: "2026-03-29",
    time: "09:30",
    status: "confirmed",
  },
  {
    id: "apt-2",
    patientId: "pat-2",
    doctorName: "黃建國醫師",
    department: "骨科",
    date: "2026-03-29",
    time: "10:00",
    status: "confirmed",
  },
  {
    id: "apt-3",
    patientId: "pat-3",
    doctorName: "李文華醫師",
    department: "內科",
    date: "2026-03-30",
    time: "14:00",
    status: "pending",
  },
  {
    id: "apt-4",
    patientId: "pat-4",
    doctorName: "陳怡君醫師",
    department: "心臟科",
    date: "2026-03-28",
    time: "11:00",
    status: "completed",
  },
  {
    id: "apt-5",
    patientId: "pat-1",
    doctorName: "陳怡君醫師",
    department: "心臟科",
    date: "2026-04-02",
    time: "15:30",
    status: "pending",
  },
];

const medicalRecords: MedicalRecord[] = [
  {
    id: "mr-1",
    patientId: "pat-1",
    doctorName: "李文華醫師",
    date: "2026-03-15",
    diagnosis: "上呼吸道感染",
    prescription: "Amoxicillin 500mg tid x 5 days",
    notes: "建議多休息、多喝水，一週後回診",
  },
  {
    id: "mr-2",
    patientId: "pat-2",
    doctorName: "黃建國醫師",
    date: "2026-03-20",
    diagnosis: "左膝退化性關節炎",
    prescription: "Celecoxib 200mg bid, 葡萄糖胺 1500mg qd",
    notes: "安排物理治療，避免長時間站立",
  },
  {
    id: "mr-3",
    patientId: "pat-4",
    doctorName: "陳怡君醫師",
    date: "2026-03-28",
    diagnosis: "高血壓",
    prescription: "Amlodipine 5mg qd",
    notes: "血壓 145/92，建議低鈉飲食，定期追蹤",
  },
];

const schedules: Schedule[] = [
  {
    id: "sch-1",
    doctorName: "李文華醫師",
    department: "內科",
    dayOfWeek: "一",
    startTime: "09:00",
    endTime: "12:00",
    maxPatients: 20,
  },
  {
    id: "sch-2",
    doctorName: "李文華醫師",
    department: "內科",
    dayOfWeek: "三",
    startTime: "14:00",
    endTime: "17:00",
    maxPatients: 20,
  },
  {
    id: "sch-3",
    doctorName: "黃建國醫師",
    department: "骨科",
    dayOfWeek: "二",
    startTime: "09:00",
    endTime: "12:00",
    maxPatients: 15,
  },
  {
    id: "sch-4",
    doctorName: "陳怡君醫師",
    department: "心臟科",
    dayOfWeek: "四",
    startTime: "09:00",
    endTime: "12:00",
    maxPatients: 12,
  },
  {
    id: "sch-5",
    doctorName: "陳怡君醫師",
    department: "心臟科",
    dayOfWeek: "五",
    startTime: "14:00",
    endTime: "17:00",
    maxPatients: 12,
  },
];

// ── Handlers ───────────────────────────────────────────────────────────────

function listPatients(filters?: Record<string, unknown>) {
  let result = [...patients];
  if (filters?.gender)
    result = result.filter((p) => p.gender === filters.gender);
  if (filters?.bloodType)
    result = result.filter((p) => p.bloodType === filters.bloodType);
  return { patients: result, total: result.length };
}

function getPatient(id: string) {
  return patients.find((p) => p.id === id) ?? null;
}

function listAppointments(filters?: Record<string, unknown>) {
  let result = [...appointments];
  if (filters?.patientId)
    result = result.filter((a) => a.patientId === filters.patientId);
  if (filters?.doctorName)
    result = result.filter((a) => a.doctorName === filters.doctorName);
  if (filters?.department)
    result = result.filter((a) => a.department === filters.department);
  if (filters?.status)
    result = result.filter((a) => a.status === filters.status);
  if (filters?.date) result = result.filter((a) => a.date === filters.date);
  return { appointments: result, total: result.length };
}

function bookAppointment(
  patientId: string,
  doctorName: string,
  department: string,
  date: string,
  time: string,
) {
  const newApt: Appointment = {
    id: `apt-${appointments.length + 1}`,
    patientId,
    doctorName,
    department,
    date,
    time,
    status: "pending",
  };
  appointments.push(newApt);
  return newApt;
}

function listMedicalRecords(filters?: Record<string, unknown>) {
  let result = [...medicalRecords];
  if (filters?.patientId)
    result = result.filter((r) => r.patientId === filters.patientId);
  if (filters?.doctorName)
    result = result.filter((r) => r.doctorName === filters.doctorName);
  return { records: result, total: result.length };
}

function listSchedules(filters?: Record<string, unknown>) {
  let result = [...schedules];
  if (filters?.doctorName)
    result = result.filter((s) => s.doctorName === filters.doctorName);
  if (filters?.department)
    result = result.filter((s) => s.department === filters.department);
  if (filters?.dayOfWeek)
    result = result.filter((s) => s.dayOfWeek === filters.dayOfWeek);
  return { schedules: result, total: result.length };
}

// ── Main Request Handler ───────────────────────────────────────────────────

/**
 * Medical Service API
 *
 * Actions:
 *   { action: "listPatients", filters?: { gender?, bloodType? } }
 *   { action: "getPatient", id: string }
 *   { action: "listAppointments", filters?: { patientId?, doctorName?, department?, status?, date? } }
 *   { action: "bookAppointment", patientId: string, doctorName: string, department: string, date: string, time: string }
 *   { action: "listMedicalRecords", filters?: { patientId?, doctorName? } }
 *   { action: "listSchedules", filters?: { doctorName?, department?, dayOfWeek? } }
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
          "Missing 'action' field. Available: listPatients, getPatient, listAppointments, bookAppointment, listMedicalRecords, listSchedules",
      },
    };

  switch (action) {
    case "listPatients":
      return {
        status: 200,
        body: listPatients(body.filters as Record<string, unknown>),
      };
    case "getPatient": {
      const id = body.id as string;
      if (!id)
        return { status: 400, body: { error: "Missing 'id' field" } };
      const patient = getPatient(id);
      if (!patient)
        return { status: 404, body: { error: `Patient not found: ${id}` } };
      return { status: 200, body: patient };
    }
    case "listAppointments":
      return {
        status: 200,
        body: listAppointments(body.filters as Record<string, unknown>),
      };
    case "bookAppointment": {
      const patientId = body.patientId as string;
      const doctorName = body.doctorName as string;
      const department = body.department as string;
      const date = body.date as string;
      const time = body.time as string;
      if (!patientId || !doctorName || !department || !date || !time)
        return {
          status: 400,
          body: {
            error:
              "Missing required fields: patientId, doctorName, department, date, time",
          },
        };
      return {
        status: 201,
        body: bookAppointment(patientId, doctorName, department, date, time),
      };
    }
    case "listMedicalRecords":
      return {
        status: 200,
        body: listMedicalRecords(body.filters as Record<string, unknown>),
      };
    case "listSchedules":
      return {
        status: 200,
        body: listSchedules(body.filters as Record<string, unknown>),
      };
    default:
      return {
        status: 400,
        body: {
          error: `Unknown action: ${action}. Available: listPatients, getPatient, listAppointments, bookAppointment, listMedicalRecords, listSchedules`,
        },
      };
  }
}
