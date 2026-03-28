import type { PresetOverlay } from "../index";

export const LINEBOT_BOOKING: PresetOverlay = {
  templateId: "linebot",
  files: [
    {
      path: "src/index.ts",
      content: `import express from "express";
import cors from "cors";
import { messagingApi, middleware, webhook, HTTPFetchError } from "@line/bot-sdk";

const PORT = parseInt(process.env.PORT || "3000", 10);
const config = { channelSecret: process.env.LINE_CHANNEL_SECRET || "" };
const clientConfig = { channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "" };
const client = new messagingApi.MessagingApiClient(clientConfig);
const app = express();

// ===== Mock 服務項目 =====
interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // 分鐘
  description: string;
}

const services: Service[] = [
  { id: "S001", name: "經典洗剪", price: 600, duration: 60, description: "洗髮＋專業剪髮造型" },
  { id: "S002", name: "質感染髮", price: 2500, duration: 120, description: "全頭染髮含護色護髮" },
  { id: "S003", name: "柔霧燙髮", price: 3000, duration: 150, description: "溫塑燙＋造型剪裁" },
  { id: "S004", name: "深層護髮", price: 1200, duration: 45, description: "頂級沙龍護髮療程" },
  { id: "S005", name: "美甲基礎款", price: 800, duration: 60, description: "單色凝膠美甲" },
  { id: "S006", name: "美甲設計款", price: 1500, duration: 90, description: "手繪設計款凝膠美甲" },
  { id: "S007", name: "全身精油按摩", price: 1800, duration: 90, description: "全身舒壓精油推拿" },
  { id: "S008", name: "肩頸舒壓按摩", price: 800, duration: 40, description: "針對肩頸痠痛重點舒緩" },
  { id: "S009", name: "保濕亮白臉部護理", price: 1500, duration: 60, description: "深層保濕＋亮白導入" },
  { id: "S010", name: "抗老緊緻臉部護理", price: 2200, duration: 75, description: "膠原蛋白導入＋拉提" },
];

// ===== Mock 可預約時段 =====
function getAvailableSlots(date: string, serviceId: string): string[] {
  const dayOfWeek = new Date(date).getDay();
  // 週日公休
  if (dayOfWeek === 0) return [];

  const allSlots = [
    "10:00", "10:30", "11:00", "11:30",
    "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30",
    "17:00", "17:30", "18:00", "18:30",
  ];

  // 模擬部分時段已被預約
  const hash = (date + serviceId).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return allSlots.filter((_, i) => (hash + i * 7) % 3 !== 0);
}

// ===== Mock 預約記錄 =====
interface Booking {
  id: string;
  name: string;
  phone: string;
  serviceId: string;
  date: string;
  time: string;
  status: "confirmed" | "cancelled" | "completed";
  createdAt: string;
}

const bookings: Booking[] = [
  { id: "B20260301001", name: "林小美", phone: "0912-345-678", serviceId: "S001", date: "2026-04-02", time: "10:30", status: "confirmed", createdAt: "2026-03-25T14:30:00" },
  { id: "B20260301002", name: "王大明", phone: "0923-456-789", serviceId: "S003", date: "2026-04-03", time: "14:00", status: "confirmed", createdAt: "2026-03-26T09:15:00" },
  { id: "B20260301003", name: "陳美玲", phone: "0934-567-890", serviceId: "S007", date: "2026-03-30", time: "15:00", status: "completed", createdAt: "2026-03-20T11:00:00" },
  { id: "B20260301004", name: "張家豪", phone: "0945-678-901", serviceId: "S005", date: "2026-04-05", time: "11:00", status: "confirmed", createdAt: "2026-03-27T16:45:00" },
  { id: "B20260301005", name: "李雅婷", phone: "0956-789-012", serviceId: "S009", date: "2026-03-29", time: "13:30", status: "cancelled", createdAt: "2026-03-22T10:20:00" },
];

let nextBookingId = 6;

// ===== 訊息處理邏輯 =====
function handleMessage(text: string): string {
  const lowerText = text.trim();

  // 查看服務項目
  if (["服務", "項目", "menu", "選單", "價目"].some(k => lowerText.includes(k))) {
    const hairServices = services.filter(s => ["S001", "S002", "S003", "S004"].includes(s.id));
    const nailServices = services.filter(s => ["S005", "S006"].includes(s.id));
    const bodyServices = services.filter(s => ["S007", "S008"].includes(s.id));
    const faceServices = services.filter(s => ["S009", "S010"].includes(s.id));

    let msg = "✨ 璀璨美學沙龍｜服務項目\\n\\n";
    msg += "💇 【美髮】\\n";
    hairServices.forEach(s => { msg += \`  \${s.id} \${s.name} - NT$\${s.price.toLocaleString()}（\${s.duration}分鐘）\\n\`; });
    msg += "\\n💅 【美甲】\\n";
    nailServices.forEach(s => { msg += \`  \${s.id} \${s.name} - NT$\${s.price.toLocaleString()}（\${s.duration}分鐘）\\n\`; });
    msg += "\\n💆 【按摩】\\n";
    bodyServices.forEach(s => { msg += \`  \${s.id} \${s.name} - NT$\${s.price.toLocaleString()}（\${s.duration}分鐘）\\n\`; });
    msg += "\\n🧖 【臉部護理】\\n";
    faceServices.forEach(s => { msg += \`  \${s.id} \${s.name} - NT$\${s.price.toLocaleString()}（\${s.duration}分鐘）\\n\`; });
    msg += "\\n📅 輸入【預約 服務編號 日期】查看可預約時段\\n範例：預約 S001 2026-04-05";
    return msg;
  }

  // 查看可預約時段：預約 S001 2026-04-05
  const slotMatch = lowerText.match(/預約\\s+(S\\d{3})\\s+(\\d{4}-\\d{2}-\\d{2})/i);
  if (slotMatch) {
    const serviceId = slotMatch[1].toUpperCase();
    const date = slotMatch[2];
    const service = services.find(s => s.id === serviceId);
    if (!service) return "❌ 找不到該服務編號，請輸入【服務】查看完整項目。";

    const slots = getAvailableSlots(date, serviceId);
    if (slots.length === 0) return \`😔 \${date} 為公休日或已無可預約時段，請選擇其他日期。\`;

    let msg = \`📅 \${service.name} - \${date} 可預約時段\\n\\n\`;
    slots.forEach(s => { msg += \`  🕐 \${s}\\n\`; });
    msg += \`\\n確認預約請輸入：\\n【確認預約 姓名 電話 \${serviceId} \${date} 時段】\\n範例：確認預約 王小明 0912345678 \${serviceId} \${date} \${slots[0]}\`;
    return msg;
  }

  // 確認預約：確認預約 王小明 0912345678 S001 2026-04-05 10:00
  const bookMatch = lowerText.match(/確認預約\\s+(\\S+)\\s+(\\d{4}[\\-]?\\d{3}[\\-]?\\d{3})\\s+(S\\d{3})\\s+(\\d{4}-\\d{2}-\\d{2})\\s+(\\d{2}:\\d{2})/);
  if (bookMatch) {
    const [, name, phone, serviceId, date, time] = bookMatch;
    const service = services.find(s => s.id === serviceId.toUpperCase());
    if (!service) return "❌ 服務編號錯誤，請重新確認。";

    const id = \`B\${date.replace(/-/g, "")}\${String(nextBookingId++).padStart(3, "0")}\`;
    const newBooking: Booking = {
      id,
      name,
      phone,
      serviceId: serviceId.toUpperCase(),
      date,
      time,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    bookings.push(newBooking);

    return \`✅ 預約成功！\\n\\n🆔 預約編號：\${id}\\n👤 姓名：\${name}\\n📞 電話：\${phone}\\n💇 服務：\${service.name}\\n📅 日期：\${date}\\n🕐 時間：\${time}\\n💰 費用：NT$\${service.price.toLocaleString()}\\n\\n⚠️ 請於預約時間前 10 分鐘到場\\n如需取消請輸入【取消 \${id}】\`;
  }

  // 取消預約
  const cancelMatch = lowerText.match(/取消\\s+(B\\d+)/i);
  if (cancelMatch) {
    const bookingId = cancelMatch[1];
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return "❌ 找不到此預約編號，請確認後重試。";
    if (booking.status === "cancelled") return "⚠️ 此預約已經取消過了。";
    if (booking.status === "completed") return "⚠️ 此預約已完成，無法取消。";

    booking.status = "cancelled";
    const service = services.find(s => s.id === booking.serviceId);
    return \`✅ 預約已取消\\n\\n🆔 預約編號：\${booking.id}\\n💇 服務：\${service?.name || booking.serviceId}\\n📅 原預約日期：\${booking.date} \${booking.time}\\n\\n期待下次為您服務！\`;
  }

  // 查詢預約：查詢 0912345678 或 查詢 B20260301001
  const queryMatch = lowerText.match(/查詢\\s+(\\S+)/);
  if (queryMatch) {
    const keyword = queryMatch[1];
    const results = bookings.filter(
      b => b.id === keyword || b.phone.replace(/-/g, "") === keyword.replace(/-/g, "") || b.name === keyword
    );
    if (results.length === 0) return "🔍 查無預約記錄，請確認輸入資訊是否正確。";

    let msg = \`📋 查詢結果（共 \${results.length} 筆）\\n\\n\`;
    results.forEach(b => {
      const service = services.find(s => s.id === b.serviceId);
      const statusMap = { confirmed: "✅ 已確認", cancelled: "❌ 已取消", completed: "✔️ 已完成" };
      msg += \`🆔 \${b.id}\\n   \${service?.name || b.serviceId} | \${b.date} \${b.time}\\n   狀態：\${statusMap[b.status]}\\n\\n\`;
    });
    return msg.trim();
  }

  // 問候語
  if (["你好", "hi", "hello", "哈囉", "嗨"].some(g => lowerText.includes(g))) {
    return "💈 歡迎光臨璀璨美學沙龍！\\n\\n我是您的預約小幫手，可以協助您：\\n\\n📋 【服務】查看服務項目與價格\\n📅 【預約 服務編號 日期】查看時段\\n🔍 【查詢 電話/姓名/預約編號】查看預約\\n❌ 【取消 預約編號】取消預約\\n\\n營業時間：週一至週六 10:00-19:00（週日公休）\\n📍 地址：台北市中山區南京東路二段 88 號 2F";
  }

  // 預設回覆
  return "💈 璀璨美學沙龍預約系統\\n\\n請選擇以下功能：\\n\\n📋 【服務】查看服務項目\\n📅 【預約 服務編號 日期】查看時段\\n🔍 【查詢 電話或預約編號】查看預約\\n❌ 【取消 預約編號】取消預約\\n\\n範例：\\n  預約 S001 2026-04-05\\n  查詢 0912345678\\n  取消 B20260301001";
}

// ===== Express 路由設定 =====
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (_req, res) => {
  res.json({
    name: "璀璨美學沙龍預約機器人",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

app.post("/webhook", middleware(config), async (req, res) => {
  const events: webhook.Event[] = (req.body as webhook.CallbackRequest).events;

  await Promise.all(
    events
      .filter(
        (e): e is webhook.MessageEvent & { message: webhook.TextMessageContent } =>
          e.type === "message" && e.message.type === "text"
      )
      .map(async (event) => {
        const replyText = handleMessage(event.message.text);
        if (event.replyToken) {
          try {
            await client.replyMessage({
              replyToken: event.replyToken,
              messages: [{ type: "text", text: replyText }],
            });
          } catch (err) {
            if (err instanceof HTTPFetchError) {
              console.error("LINE API Error:", err.status, err.body);
            }
          }
        }
      })
  );

  res.json({ received: true });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(\`璀璨美學沙龍預約機器人已啟動：http://localhost:\${PORT}\`);
});
`,
    },
  ],
  requiredServices: [
    {
      category: "line_bot",
      suggestedTypes: ["line_bot"],
      purpose: "LINE Bot 訊息收發",
    },
    {
      category: "built_in_beauty",
      suggestedTypes: ["built_in_beauty"],
      purpose: "美容沙龍預約管理系統",
      optional: true,
    },
  ],
};
