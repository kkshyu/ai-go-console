export const LINEBOT_PAYMENT_NOTIFY = `import express from "express";
import cors from "cors";
import { messagingApi, middleware, webhook, HTTPFetchError } from "@line/bot-sdk";

const PORT = parseInt(process.env.PORT || "3000", 10);
const config = { channelSecret: process.env.LINE_CHANNEL_SECRET || "" };
const clientConfig = { channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "" };
const client = new messagingApi.MessagingApiClient(clientConfig);
const app = express();

// Mock payment data
const mockPayments = [
  { id: "PAY-001", company: "ABC 科技有限公司", amount: 50000, dueDate: "2024-02-15", status: "pending" },
  { id: "PAY-002", company: "XYZ 貿易股份有限公司", amount: 120000, dueDate: "2024-01-28", status: "overdue" },
  { id: "PAY-003", company: "DEF 設計工作室", amount: 35000, dueDate: "2024-03-01", status: "pending" },
  { id: "PAY-004", company: "GHI 顧問公司", amount: 80000, dueDate: "2024-01-10", status: "overdue" },
  { id: "PAY-005", company: "JKL 電子商務", amount: 65000, dueDate: "2024-02-28", status: "paid" },
];

function handlePaymentMessage(text: string): string {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("帳款") || lowerText.includes("應收")) {
    const pending = mockPayments.filter(p => p.status === "pending");
    const totalPending = pending.reduce((sum, p) => sum + p.amount, 0);
    let msg = \`📋 應收帳款總覽\\n\\n待收款項：\${pending.length} 筆\\n待收總額：NT$ \${totalPending.toLocaleString()}\\n\\n\`;
    pending.forEach(p => {
      msg += \`• \${p.company}\\n  金額：NT$ \${p.amount.toLocaleString()} | 到期日：\${p.dueDate}\\n\\n\`;
    });
    return msg;
  }

  if (lowerText.includes("催款") || lowerText.includes("逾期")) {
    const overdue = mockPayments.filter(p => p.status === "overdue");
    if (overdue.length === 0) return "✅ 目前沒有逾期帳款，所有款項皆已如期收回。";
    let msg = \`⚠️ 逾期帳款提醒\\n\\n逾期筆數：\${overdue.length} 筆\\n\\n\`;
    overdue.forEach(p => {
      msg += \`🔴 \${p.company}\\n  金額：NT$ \${p.amount.toLocaleString()}\\n  原到期日：\${p.dueDate}\\n  建議：請儘速聯繫催收\\n\\n\`;
    });
    return msg;
  }

  if (lowerText.includes("付款") || lowerText.includes("已付")) {
    const paid = mockPayments.filter(p => p.status === "paid");
    if (paid.length === 0) return "📝 目前尚無已完成付款紀錄。";
    let msg = "✅ 已付款紀錄\\n\\n";
    paid.forEach(p => {
      msg += \`• \${p.company}\\n  金額：NT$ \${p.amount.toLocaleString()} | 付款完成\\n\\n\`;
    });
    return msg;
  }

  if (lowerText.includes("查詢") || lowerText.includes("搜尋")) {
    return "🔍 請輸入以下關鍵字查詢：\\n\\n• 「帳款」- 查看應收帳款總覽\\n• 「催款」- 查看逾期帳款\\n• 「付款」- 查看已付款紀錄\\n• 「報表」- 產生帳款報表";
  }

  if (lowerText.includes("報表") || lowerText.includes("統計")) {
    const total = mockPayments.reduce((sum, p) => sum + p.amount, 0);
    const paid = mockPayments.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
    const pending = mockPayments.filter(p => p.status === "pending").reduce((sum, p) => sum + p.amount, 0);
    const overdue = mockPayments.filter(p => p.status === "overdue").reduce((sum, p) => sum + p.amount, 0);
    return \`📊 帳款統計報表\\n\\n總金額：NT$ \${total.toLocaleString()}\\n已收款：NT$ \${paid.toLocaleString()}\\n待收款：NT$ \${pending.toLocaleString()}\\n逾期款：NT$ \${overdue.toLocaleString()}\\n\\n收款率：\${((paid / total) * 100).toFixed(1)}%\`;
  }

  return "💰 付款提醒機器人\\n\\n請輸入以下關鍵字：\\n• 「帳款」- 查看應收帳款\\n• 「催款」- 逾期帳款提醒\\n• 「付款」- 已付款紀錄\\n• 「報表」- 帳款統計\\n• 「查詢」- 搜尋說明";
}

app.get("/health", (_req, res) => { res.json({ status: "ok" }); });
app.get("/", (_req, res) => { res.json({ name: "Payment Notify Bot", status: "running", timestamp: new Date().toISOString() }); });

app.post("/webhook", middleware(config), async (req, res) => {
  const events: webhook.Event[] = (req.body as webhook.CallbackRequest).events;

  await Promise.all(
    events
      .filter((e): e is webhook.MessageEvent & { message: webhook.TextMessageContent } =>
        e.type === "message" && e.message.type === "text"
      )
      .map(async (event) => {
        const replyText = handlePaymentMessage(event.message.text);
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

app.listen(PORT, "0.0.0.0", () => { console.log(\`Payment Notify Bot running on http://localhost:\${PORT}\`); });
`;
