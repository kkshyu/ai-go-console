import type { ServiceResponse } from "../builtin-industry";

// ── Education-specific types ───────────────────────────────────────────────

interface Course {
  id: string;
  name: string;
  instructor: string;
  maxStudents: number;
  enrolled: number;
  startDate: string;
  schedule: string;
  price: number;
}

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  enrolledCourses: string[];
}

interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  enrollDate: string;
  status: string;
  paidAmount: number;
}

interface Attendance {
  id: string;
  studentId: string;
  courseId: string;
  date: string;
  status: string;
}

// ── Mock Data ──────────────────────────────────────────────────────────────

const courses: Course[] = [
  {
    id: "crs-1",
    name: "兒童美語初級班",
    instructor: "王雅琪",
    maxStudents: 12,
    enrolled: 10,
    startDate: "2026-03-01",
    schedule: "每週二、四 16:00-17:30",
    price: 8000,
  },
  {
    id: "crs-2",
    name: "成人日文 N3 班",
    instructor: "田中翔太",
    maxStudents: 15,
    enrolled: 13,
    startDate: "2026-03-10",
    schedule: "每週一、三 19:00-21:00",
    price: 12000,
  },
  {
    id: "crs-3",
    name: "Python 程式設計入門",
    instructor: "林柏宏",
    maxStudents: 20,
    enrolled: 18,
    startDate: "2026-04-01",
    schedule: "每週六 10:00-12:00",
    price: 15000,
  },
  {
    id: "crs-4",
    name: "水彩畫基礎班",
    instructor: "陳思涵",
    maxStudents: 10,
    enrolled: 7,
    startDate: "2026-03-15",
    schedule: "每週日 14:00-16:00",
    price: 6000,
  },
];

const students: Student[] = [
  {
    id: "stu-1",
    name: "黃小明",
    email: "xiaoming@example.com",
    phone: "0911-111-222",
    enrolledCourses: ["crs-1"],
  },
  {
    id: "stu-2",
    name: "李佳穎",
    email: "jiaying@example.com",
    phone: "0922-222-333",
    enrolledCourses: ["crs-2", "crs-4"],
  },
  {
    id: "stu-3",
    name: "張育翔",
    email: "yuxiang@example.com",
    phone: "0933-333-444",
    enrolledCourses: ["crs-3"],
  },
  {
    id: "stu-4",
    name: "陳怡安",
    email: "yian@example.com",
    phone: "0944-444-555",
    enrolledCourses: ["crs-1", "crs-3"],
  },
  {
    id: "stu-5",
    name: "周大衛",
    email: "david.chou@example.com",
    phone: "0955-555-666",
    enrolledCourses: ["crs-2"],
  },
];

const enrollments: Enrollment[] = [
  {
    id: "enr-1",
    studentId: "stu-1",
    courseId: "crs-1",
    enrollDate: "2026-02-20",
    status: "active",
    paidAmount: 8000,
  },
  {
    id: "enr-2",
    studentId: "stu-2",
    courseId: "crs-2",
    enrollDate: "2026-03-01",
    status: "active",
    paidAmount: 12000,
  },
  {
    id: "enr-3",
    studentId: "stu-2",
    courseId: "crs-4",
    enrollDate: "2026-03-10",
    status: "active",
    paidAmount: 6000,
  },
  {
    id: "enr-4",
    studentId: "stu-3",
    courseId: "crs-3",
    enrollDate: "2026-03-20",
    status: "active",
    paidAmount: 15000,
  },
  {
    id: "enr-5",
    studentId: "stu-4",
    courseId: "crs-1",
    enrollDate: "2026-02-25",
    status: "active",
    paidAmount: 8000,
  },
  {
    id: "enr-6",
    studentId: "stu-4",
    courseId: "crs-3",
    enrollDate: "2026-03-22",
    status: "pending",
    paidAmount: 0,
  },
];

const attendanceRecords: Attendance[] = [
  {
    id: "att-1",
    studentId: "stu-1",
    courseId: "crs-1",
    date: "2026-03-25",
    status: "present",
  },
  {
    id: "att-2",
    studentId: "stu-4",
    courseId: "crs-1",
    date: "2026-03-25",
    status: "present",
  },
  {
    id: "att-3",
    studentId: "stu-1",
    courseId: "crs-1",
    date: "2026-03-27",
    status: "late",
  },
  {
    id: "att-4",
    studentId: "stu-4",
    courseId: "crs-1",
    date: "2026-03-27",
    status: "absent",
  },
  {
    id: "att-5",
    studentId: "stu-3",
    courseId: "crs-3",
    date: "2026-03-22",
    status: "present",
  },
];

// ── Handlers ───────────────────────────────────────────────────────────────

function listCourses(filters?: Record<string, unknown>) {
  let result = [...courses];
  if (filters?.instructor)
    result = result.filter((c) => c.instructor === filters.instructor);
  return { courses: result, total: result.length };
}

function getCourse(id: string) {
  return courses.find((c) => c.id === id) ?? null;
}

function listStudents(filters?: Record<string, unknown>) {
  let result = [...students];
  if (filters?.courseId)
    result = result.filter((s) =>
      s.enrolledCourses.includes(filters.courseId as string),
    );
  return { students: result, total: result.length };
}

function enrollStudent(studentId: string, courseId: string) {
  const student = students.find((s) => s.id === studentId);
  const course = courses.find((c) => c.id === courseId);
  if (!student || !course) return null;
  if (course.enrolled >= course.maxStudents)
    return { error: "Course is full" };

  const newEnrollment: Enrollment = {
    id: `enr-${enrollments.length + 1}`,
    studentId,
    courseId,
    enrollDate: new Date().toISOString().split("T")[0],
    status: "pending",
    paidAmount: 0,
  };
  enrollments.push(newEnrollment);
  student.enrolledCourses.push(courseId);
  course.enrolled += 1;
  return newEnrollment;
}

function listAttendance(filters?: Record<string, unknown>) {
  let result = [...attendanceRecords];
  if (filters?.studentId)
    result = result.filter((a) => a.studentId === filters.studentId);
  if (filters?.courseId)
    result = result.filter((a) => a.courseId === filters.courseId);
  if (filters?.date) result = result.filter((a) => a.date === filters.date);
  if (filters?.status)
    result = result.filter((a) => a.status === filters.status);
  return { attendance: result, total: result.length };
}

function markAttendance(
  studentId: string,
  courseId: string,
  date: string,
  status: string,
) {
  const newRecord: Attendance = {
    id: `att-${attendanceRecords.length + 1}`,
    studentId,
    courseId,
    date,
    status,
  };
  attendanceRecords.push(newRecord);
  return newRecord;
}

function listEnrollments(filters?: Record<string, unknown>) {
  let result = [...enrollments];
  if (filters?.studentId)
    result = result.filter((e) => e.studentId === filters.studentId);
  if (filters?.courseId)
    result = result.filter((e) => e.courseId === filters.courseId);
  if (filters?.status)
    result = result.filter((e) => e.status === filters.status);
  return { enrollments: result, total: result.length };
}

// ── Main Request Handler ───────────────────────────────────────────────────

/**
 * Education Service API
 *
 * Actions:
 *   { action: "listCourses", filters?: { instructor? } }
 *   { action: "getCourse", id: string }
 *   { action: "listStudents", filters?: { courseId? } }
 *   { action: "enrollStudent", studentId: string, courseId: string }
 *   { action: "listAttendance", filters?: { studentId?, courseId?, date?, status? } }
 *   { action: "markAttendance", studentId: string, courseId: string, date: string, status: string }
 *   { action: "listEnrollments", filters?: { studentId?, courseId?, status? } }
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
          "Missing 'action' field. Available: listCourses, getCourse, listStudents, enrollStudent, listAttendance, markAttendance, listEnrollments",
      },
    };

  switch (action) {
    case "listCourses":
      return {
        status: 200,
        body: listCourses(body.filters as Record<string, unknown>),
      };
    case "getCourse": {
      const id = body.id as string;
      if (!id)
        return { status: 400, body: { error: "Missing 'id' field" } };
      const course = getCourse(id);
      if (!course)
        return { status: 404, body: { error: `Course not found: ${id}` } };
      return { status: 200, body: course };
    }
    case "listStudents":
      return {
        status: 200,
        body: listStudents(body.filters as Record<string, unknown>),
      };
    case "enrollStudent": {
      const studentId = body.studentId as string;
      const courseId = body.courseId as string;
      if (!studentId || !courseId)
        return {
          status: 400,
          body: { error: "Missing required fields: studentId, courseId" },
        };
      const result = enrollStudent(studentId, courseId);
      if (!result)
        return {
          status: 404,
          body: { error: "Student or course not found" },
        };
      if ("error" in result) return { status: 409, body: result };
      return { status: 201, body: result };
    }
    case "listAttendance":
      return {
        status: 200,
        body: listAttendance(body.filters as Record<string, unknown>),
      };
    case "markAttendance": {
      const studentId = body.studentId as string;
      const courseId = body.courseId as string;
      const date = body.date as string;
      const status = body.status as string;
      if (!studentId || !courseId || !date || !status)
        return {
          status: 400,
          body: {
            error:
              "Missing required fields: studentId, courseId, date, status",
          },
        };
      return {
        status: 201,
        body: markAttendance(studentId, courseId, date, status),
      };
    }
    case "listEnrollments":
      return {
        status: 200,
        body: listEnrollments(body.filters as Record<string, unknown>),
      };
    default:
      return {
        status: 400,
        body: {
          error: `Unknown action: ${action}. Available: listCourses, getCourse, listStudents, enrollStudent, listAttendance, markAttendance, listEnrollments`,
        },
      };
  }
}
