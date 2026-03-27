export const LINEBOT_CONTRACT_ALERT = `import express from "express";
import cors from "cors";
import { messagingApi, middleware, webhook, HTTPFetchError } from "@line/bot-sdk";

const PORT = parseInt(process.env.PORT || "3000", 10);
const config = { channelSecret: process.env.LINE_CHANNEL_SECRET || "" };
const clientConfig = { channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "" };
const client = new messagingApi.MessagingApiClient(clientConfig);
const app = express();

// Mock contract data
const mockContracts = [
  { id: "CTR-001", name: "雲端服務合約", partner: "AWS 台灣", startDate: "2023-04-01", endDate: "2024-03-31", status: "expiring", value: 360000 },
  { id: "CTR-002", name: "辦公室租賃合約", partner: "信義房屋", startDate: "2022-07-01", endDate: "2024-06-30", status: "active", value: 1200000 },
  { id: "CTR-003", name: "軟體授權合約", partner: "Microsoft", startDate: "2023-01-01", endDate: "2024-01-15", status: "expired", value: 180000 },
  { id: "CTR-004", name: "顧問服務合約", partner: "德勤管理顧問", startDate: "2023-06-01", endDate: "2024-05-31", status: "active", value: 500000 },
  { id: "CTR-005", name: "設備維護合約", partner: "台灣大哥大", startDate: "2023-09-01", endDate: "2024-02-28", status: "expiring", value: 96000 },
];

function handleContractMessage(text: string): string {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("到期") || lowerText.includes("即將到期")) {
    const expiring = mockContracts.filter(c => c.status === "expiring");
    if (expiring.length === 0) return "✅ 目前沒有即將到期的合約。";
    let msg = \`⏰ 即將到期合約提醒\\n\\n共 \${expiring.length} 份合約即將到期：\\n\\n\`;
    expiring.forEach(c => {
      msg += \`📄 \${c.name}\\n  合作方：\${c.partner}\\n  到期日：\${c.endDate}\\n  合約金額：NT$ \${c.value.toLocaleString()}\\n  ⚠️ 請儘速安排續約事宜\\n\\n\`;
    });
    return msg;
  }

  if (lowerText.includes("續約") || lowerText.includes("更新")) {
    const expiring = mockContracts.filter(c => c.status === "expiring" || c.status === "expired");
    let msg = "🔄 需要續約的合約清單\\n\\n";
    expiring.forEach(c => {
      const label = c.status === "expired" ? "🔴 已過期" : "🟡 即將到期";
      msg += \`\${label} \${c.name}\\n  合作方：\${c.partner}\\n  到期日：\${c.endDate}\\n  建議：立即啟動續約流程\\n\\n\`;
    });
    msg += "📌 回覆合約編號可查看詳細資訊";
    return msg;
  }

  if (lowerText.includes("合約") && (lowerText.includes("列表") || lowerText.includes("清單") || lowerText.includes("全部"))) {
    let msg = "📋 合約總覽\\n\\n";
    mockContracts.forEach(c => {
      const statusLabel = c.status === "active" ? "🟢 有效" : c.status === "expiring" ? "🟡 即將到期" : "🔴 已過期";
      msg += \`\${statusLabel} \${c.name}\\n  \${c.partner} | \${c.endDate}\\n\\n\`;
    });
    return msg;
  }

  if (lowerText.includes("過期") || lowerText.includes("已到期")) {
    const expired = mockContracts.filter(c => c.status === "expired");
    if (expired.length === 0) return "✅ 目前沒有已過期的合約。";
    let msg = \`🔴 已過期合約\\n\\n共 \${expired.length} 份合約已過期：\\n\\n\`;
    expired.forEach(c => {
      msg += \`📄 \${c.name}\\n  合作方：\${c.partner}\\n  過期日：\${c.endDate}\\n  合約金額：NT$ \${c.value.toLocaleString()}\\n  ❗ 請立即處理\\n\\n\`;
    });
    return msg;
  }

  // Check for contract ID
  const ctrMatch = text.match(/CTR-\\d+/i);
  if (ctrMatch) {
    const contract = mockContracts.find(c => c.id === ctrMatch[0].toUpperCase());
    if (contract) {
      const statusLabel = contract.status === "active" ? "🟢 有效" : contract.status === "expiring" ? "🟡 即將到期" : "🔴 已過期";
      return \`📄 合約詳細資訊\\n\\n合約編號：\${contract.id}\\n合約名稱：\${contract.name}\\n合作方：\${contract.partner}\\n起始日：\${contract.startDate}\\n到期日：\${contract.endDate}\\n合約金額：NT$ \${contract.value.toLocaleString()}\\n狀態：\${statusLabel}\`;
    }
    return "❌ 查無此合約編號，請確認後重新輸入。";
  }

  return "📄 合約管理機器人\\n\\n請輸入以下關鍵字：\\n• 「到期」- 查看即將到期合約\\n• 「續約」- 需續約合約清單\\n• 「過期」- 已過期合約\\n• 「合約清單」- 所有合約總覽\\n• 輸入合約編號（如 CTR-001）查看詳情";
}

app.get("/health", (_req, res) => { res.json({ status: "ok" }); });
app.get("/", (_req, res) => { res.json({ name: "Contract Alert Bot", status: "running", timestamp: new Date().toISOString() }); });

app.post("/webhook", middleware(config), async (req, res) => {
  const events: webhook.Event[] = (req.body as webhook.CallbackRequest).events;

  await Promise.all(
    events
      .filter((e): e is webhook.MessageEvent & { message: webhook.TextMessageContent } =>
        e.type === "message" && e.message.type === "text"
      )
      .map(async (event) => {
        const replyText = handleContractMessage(event.message.text);
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

app.listen(PORT, "0.0.0.0", () => { console.log(\`Contract Alert Bot running on http://localhost:\${PORT}\`); });
`;
