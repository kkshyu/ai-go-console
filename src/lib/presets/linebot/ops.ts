export const LINEBOT_BOOKING = `import express from "express";
import cors from "cors";
import { messagingApi, middleware, webhook, HTTPFetchError } from "@line/bot-sdk";

const PORT = parseInt(process.env.PORT || "3000", 10);
const config = { channelSecret: process.env.LINE_CHANNEL_SECRET || "" };
const clientConfig = { channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "" };
const client = new messagingApi.MessagingApiClient(clientConfig);
const app = express();

// Mock time slots
const mockTimeSlots: Record<string, Array<{ time: string; available: boolean }>> = {
  "2024-02-01": [
    { time: "09:00", available: true },
    { time: "10:00", available: false },
    { time: "11:00", available: true },
    { time: "13:00", available: true },
    { time: "14:00", available: false },
    { time: "15:00", available: true },
    { time: "16:00", available: true },
  ],
  "2024-02-02": [
    { time: "09:00", available: false },
    { time: "10:00", available: true },
    { time: "11:00", available: true },
    { time: "13:00", available: false },
    { time: "14:00", available: true },
    { time: "15:00", available: false },
    { time: "16:00", available: true },
  ],
  "2024-02-03": [
    { time: "09:00", available: true },
    { time: "10:00", available: true },
    { time: "11:00", available: false },
    { time: "13:00", available: true },
    { time: "14:00", available: true },
    { time: "15:00", available: true },
    { time: "16:00", available: false },
  ],
};

// Mock bookings
const mockBookings = [
  { id: "BK-001", date: "2024-02-01", time: "10:00", service: "一般諮詢", name: "王小明", status: "confirmed" },
  { id: "BK-002", date: "2024-02-01", time: "14:00", service: "健康檢查", name: "李小華", status: "confirmed" },
  { id: "BK-003", date: "2024-02-02", time: "09:00", service: "牙齒保健", name: "陳大文", status: "confirmed" },
  { id: "BK-004", date: "2024-02-02", time: "13:00", service: "視力檢查", name: "王小明", status: "pending" },
];

// Mock services
const mockServices = [
  { id: "S001", name: "一般諮詢", duration: "30 分鐘", price: 500 },
  { id: "S002", name: "健康檢查", duration: "60 分鐘", price: 1500 },
  { id: "S003", name: "牙齒保健", duration: "45 分鐘", price: 1000 },
  { id: "S004", name: "視力檢查", duration: "30 分鐘", price: 800 },
  { id: "S005", name: "皮膚諮詢", duration: "30 分鐘", price: 600 },
];

function handleBookingMessage(text: string): string {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("預約") && !lowerText.includes("取消") && !lowerText.includes("查詢")) {
    let msg = "📅 預約服務\\n\\n請選擇服務項目：\\n\\n";
    mockServices.forEach(s => {
      msg += \`\${s.id} \${s.name}\\n  時長：\${s.duration} | 費用：NT$ \${s.price.toLocaleString()}\\n\\n\`;
    });
    msg += "輸入服務編號（如 S001）選擇服務\\n\\n或輸入「時段」查看可預約時間";
    return msg;
  }

  if (lowerText.includes("時段") || lowerText.includes("時間") || lowerText.includes("可預約")) {
    let msg = "🕐 可預約時段\\n\\n";
    Object.entries(mockTimeSlots).forEach(([date, slots]) => {
      msg += \`📆 \${date}\\n\`;
      slots.forEach(slot => {
        const icon = slot.available ? "🟢" : "🔴";
        const label = slot.available ? "可預約" : "已額滿";
        msg += \`  \${icon} \${slot.time} \${label}\\n\`;
      });
      msg += "\\n";
    });
    msg += "輸入日期與時間預約\\n範例：「預約 2024-02-01 09:00」";
    return msg;
  }

  if (lowerText.includes("我的預約") || (lowerText.includes("查詢") && lowerText.includes("預約"))) {
    const myBookings = mockBookings.filter(b => b.name === "王小明");
    if (myBookings.length === 0) return "📭 您目前沒有預約紀錄。\\n\\n輸入「預約」開始預約服務。";
    let msg = \`📋 我的預約（\${myBookings.length} 筆）\\n\\n\`;
    myBookings.forEach(b => {
      const statusLabel = b.status === "confirmed" ? "✅ 已確認" : "⏳ 待確認";
      msg += \`\${statusLabel} \${b.id}\\n  服務：\${b.service}\\n  日期：\${b.date} \${b.time}\\n\\n\`;
    });
    msg += "輸入預約編號（如 BK-001）查看詳情\\n輸入「取消 BK-001」取消預約";
    return msg;
  }

  if (lowerText.includes("取消")) {
    const bookingMatch = text.match(/BK-\\d{3}/i);
    if (bookingMatch) {
      const bookingId = bookingMatch[0].toUpperCase();
      const booking = mockBookings.find(b => b.id === bookingId);
      if (!booking) return \`❌ 查無預約 \${bookingId}，請確認編號後重新輸入。\`;
      return \`✅ 預約已取消\\n\\n取消的預約：\\n📋 \${booking.id}\\n服務：\${booking.service}\\n原訂日期：\${booking.date} \${booking.time}\\n\\n⚠️ 請注意取消政策：\\n• 24 小時前取消：免收費用\\n• 24 小時內取消：酌收 50% 費用\\n\\n輸入「預約」重新預約。\`;
    }
    return "📝 取消預約說明\\n\\n請輸入「取消」加上預約編號\\n範例：取消 BK-001\\n\\n輸入「我的預約」查看所有預約";
  }

  // Check for service ID
  const serviceMatch = text.match(/S\\d{3}/i);
  if (serviceMatch) {
    const service = mockServices.find(s => s.id === serviceMatch[0].toUpperCase());
    if (service) {
      return \`📋 服務詳情\\n\\n\${service.name}\\n⏱️ 時長：\${service.duration}\\n💰 費用：NT$ \${service.price.toLocaleString()}\\n\\n接下來請選擇預約時段：\\n輸入「時段」查看可預約時間\\n\\n或直接輸入：\\n「預約 2024-02-01 09:00」\`;
    }
  }

  // Check for booking ID
  const bkMatch = text.match(/BK-\\d{3}/i);
  if (bkMatch) {
    const booking = mockBookings.find(b => b.id === bkMatch[0].toUpperCase());
    if (booking) {
      const statusLabel = booking.status === "confirmed" ? "✅ 已確認" : "⏳ 待確認";
      return \`📋 預約詳情\\n\\n預約編號：\${booking.id}\\n服務項目：\${booking.service}\\n預約日期：\${booking.date}\\n預約時間：\${booking.time}\\n預約人：\${booking.name}\\n狀態：\${statusLabel}\\n\\n輸入「取消 \${booking.id}」可取消此預約\`;
    }
    return "❌ 查無此預約編號。輸入「我的預約」查看所有預約。";
  }

  return "📅 預約管理機器人\\n\\n請輸入以下關鍵字：\\n• 「預約」- 預約新服務\\n• 「時段」- 查看可預約時段\\n• 「我的預約」- 查看預約紀錄\\n• 「取消」- 取消預約\\n• 服務編號（如 S001）- 查看服務詳情\\n• 預約編號（如 BK-001）- 查看預約詳情";
}

app.get("/health", (_req, res) => { res.json({ status: "ok" }); });
app.get("/", (_req, res) => { res.json({ name: "Booking Bot", status: "running", timestamp: new Date().toISOString() }); });

app.post("/webhook", middleware(config), async (req, res) => {
  const events: webhook.Event[] = (req.body as webhook.CallbackRequest).events;

  await Promise.all(
    events
      .filter((e): e is webhook.MessageEvent & { message: webhook.TextMessageContent } =>
        e.type === "message" && e.message.type === "text"
      )
      .map(async (event) => {
        const replyText = handleBookingMessage(event.message.text);
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

app.listen(PORT, "0.0.0.0", () => { console.log(\`Booking Bot running on http://localhost:\${PORT}\`); });
`;
