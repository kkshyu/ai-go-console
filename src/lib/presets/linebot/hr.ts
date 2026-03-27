export const LINEBOT_LEAVE = `import express from "express";
import cors from "cors";
import { messagingApi, middleware, webhook, HTTPFetchError } from "@line/bot-sdk";

const PORT = parseInt(process.env.PORT || "3000", 10);
const config = { channelSecret: process.env.LINE_CHANNEL_SECRET || "" };
const clientConfig = { channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "" };
const client = new messagingApi.MessagingApiClient(clientConfig);
const app = express();

// Mock leave balance data
const mockLeaveBalance = {
  annual: { total: 14, used: 5, remaining: 9 },
  sick: { total: 30, used: 3, remaining: 27 },
  personal: { total: 7, used: 2, remaining: 5 },
  compensatory: { total: 3, used: 1, remaining: 2 },
};

// Mock leave records
const mockLeaveRecords = [
  { id: "LV-001", type: "特休", startDate: "2024-01-15", endDate: "2024-01-16", days: 2, status: "approved", reason: "家庭旅遊" },
  { id: "LV-002", type: "病假", startDate: "2024-01-22", endDate: "2024-01-22", days: 1, status: "approved", reason: "身體不適" },
  { id: "LV-003", type: "事假", startDate: "2024-02-05", endDate: "2024-02-05", days: 1, status: "pending", reason: "私人事務" },
  { id: "LV-004", type: "特休", startDate: "2024-02-14", endDate: "2024-02-16", days: 3, status: "pending", reason: "出國旅遊" },
];

// Simple leave application state
let pendingApplication: { type: string; startDate: string; endDate: string; reason: string } | null = null;

function handleLeaveMessage(text: string): string {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("餘額") || lowerText.includes("剩餘") || lowerText.includes("還有幾天")) {
    return \`📊 假期餘額查詢\\n\\n🏖️ 特休假：\${mockLeaveBalance.annual.remaining} / \${mockLeaveBalance.annual.total} 天\\n🏥 病假：\${mockLeaveBalance.sick.remaining} / \${mockLeaveBalance.sick.total} 天\\n📋 事假：\${mockLeaveBalance.personal.remaining} / \${mockLeaveBalance.personal.total} 天\\n⏰ 補休：\${mockLeaveBalance.compensatory.remaining} / \${mockLeaveBalance.compensatory.total} 天\\n\\n輸入「請假」開始申請假期\`;
  }

  if (lowerText.includes("請假") || lowerText.includes("申請")) {
    if (lowerText.includes("特休") || lowerText.includes("年假")) {
      return "📝 特休假申請\\n\\n您目前剩餘 " + mockLeaveBalance.annual.remaining + " 天特休假。\\n\\n請依照以下格式輸入：\\n「特休 起始日期 結束日期 原因」\\n\\n範例：特休 2024-03-01 2024-03-03 家庭旅遊\\n\\n或輸入「取消」取消申請";
    }
    if (lowerText.includes("病假")) {
      return "📝 病假申請\\n\\n您目前剩餘 " + mockLeaveBalance.sick.remaining + " 天病假。\\n\\n請依照以下格式輸入：\\n「病假 起始日期 結束日期 原因」\\n\\n範例：病假 2024-03-01 2024-03-01 身體不適\\n\\n⚠️ 病假超過 3 天需檢附醫療證明";
    }
    if (lowerText.includes("事假")) {
      return "📝 事假申請\\n\\n您目前剩餘 " + mockLeaveBalance.personal.remaining + " 天事假。\\n\\n請依照以下格式輸入：\\n「事假 起始日期 結束日期 原因」\\n\\n範例：事假 2024-03-01 2024-03-01 私人事務";
    }
    return "📝 請假申請\\n\\n請選擇假別：\\n\\n1️⃣ 「請假 特休」- 特休假\\n2️⃣ 「請假 病假」- 病假\\n3️⃣ 「請假 事假」- 事假\\n4️⃣ 「請假 補休」- 補休\\n\\n或輸入「餘額」查看各假別剩餘天數";
  }

  if (lowerText.includes("紀錄") || lowerText.includes("記錄") || lowerText.includes("歷史")) {
    let msg = "📋 請假紀錄\\n\\n";
    mockLeaveRecords.forEach(record => {
      const statusLabel = record.status === "approved" ? "✅ 已核准" : record.status === "pending" ? "⏳ 審核中" : "❌ 已駁回";
      msg += \`\${statusLabel} \${record.id}\\n  \${record.type} | \${record.startDate} ~ \${record.endDate}（\${record.days} 天）\\n  原因：\${record.reason}\\n\\n\`;
    });
    return msg;
  }

  if (lowerText.includes("假期") || lowerText.includes("假日") || lowerText.includes("國定")) {
    return "📅 近期國定假日\\n\\n🎆 2/8-2/14 農曆春節（7天）\\n🏮 2/15 元宵節\\n🌿 4/4 兒童節\\n🌿 4/5 清明節\\n👷 5/1 勞動節\\n🚣 6/10 端午節\\n\\n輸入「餘額」查看可休假天數";
  }

  if (lowerText.includes("審核") || lowerText.includes("進度") || lowerText.includes("狀態")) {
    const pending = mockLeaveRecords.filter(r => r.status === "pending");
    if (pending.length === 0) return "✅ 目前沒有待審核的假單。";
    let msg = \`⏳ 待審核假單（\${pending.length} 筆）\\n\\n\`;
    pending.forEach(record => {
      msg += \`\${record.id} \${record.type}\\n  \${record.startDate} ~ \${record.endDate}（\${record.days} 天）\\n  原因：\${record.reason}\\n  狀態：等待主管審核\\n\\n\`;
    });
    return msg;
  }

  return "🏖️ 請假機器人\\n\\n請輸入以下關鍵字：\\n• 「餘額」- 查詢假期餘額\\n• 「請假」- 申請假期\\n• 「紀錄」- 查看請假紀錄\\n• 「審核」- 查看審核進度\\n• 「假期」- 國定假日查詢";
}

app.get("/health", (_req, res) => { res.json({ status: "ok" }); });
app.get("/", (_req, res) => { res.json({ name: "Leave Request Bot", status: "running", timestamp: new Date().toISOString() }); });

app.post("/webhook", middleware(config), async (req, res) => {
  const events: webhook.Event[] = (req.body as webhook.CallbackRequest).events;

  await Promise.all(
    events
      .filter((e): e is webhook.MessageEvent & { message: webhook.TextMessageContent } =>
        e.type === "message" && e.message.type === "text"
      )
      .map(async (event) => {
        const replyText = handleLeaveMessage(event.message.text);
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

app.listen(PORT, "0.0.0.0", () => { console.log(\`Leave Request Bot running on http://localhost:\${PORT}\`); });
`;
