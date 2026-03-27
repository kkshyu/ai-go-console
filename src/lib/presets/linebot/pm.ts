export const LINEBOT_NOTIFICATION = `import express from "express";
import cors from "cors";
import { messagingApi, middleware, webhook, HTTPFetchError } from "@line/bot-sdk";

const PORT = parseInt(process.env.PORT || "3000", 10);
const config = { channelSecret: process.env.LINE_CHANNEL_SECRET || "" };
const clientConfig = { channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "" };
const client = new messagingApi.MessagingApiClient(clientConfig);
const app = express();

// Mock subscription topics
const mockTopics = [
  { id: "T001", name: "系統維護通知", description: "系統更新與維護時間通知", subscribers: 128 },
  { id: "T002", name: "新功能上線", description: "產品新功能發布通知", subscribers: 256 },
  { id: "T003", name: "促銷活動", description: "優惠折扣與活動資訊", subscribers: 512 },
  { id: "T004", name: "安全警報", description: "帳號安全與風險提醒", subscribers: 89 },
];

// Mock user subscriptions
const mockUserSubs = new Set(["T001", "T002"]);

// Mock tasks
const mockTasks = [
  { id: "TSK-001", title: "完成第一季報表", assignee: "王小明", priority: "high", status: "in_progress", dueDate: "2024-02-05" },
  { id: "TSK-002", title: "更新產品文件", assignee: "李小華", priority: "medium", status: "pending", dueDate: "2024-02-10" },
  { id: "TSK-003", title: "客戶訪談紀錄整理", assignee: "王小明", priority: "low", status: "completed", dueDate: "2024-01-30" },
  { id: "TSK-004", title: "系統安全性檢查", assignee: "陳大文", priority: "high", status: "pending", dueDate: "2024-02-03" },
  { id: "TSK-005", title: "新人教育訓練準備", assignee: "王小明", priority: "medium", status: "in_progress", dueDate: "2024-02-15" },
];

// Mock recent notifications
const mockNotifications = [
  { time: "2024-01-28 14:30", topic: "系統維護通知", message: "系統將於 2/1 02:00-06:00 進行維護" },
  { time: "2024-01-27 10:00", topic: "新功能上線", message: "LINE Bot 預設範本功能已上線" },
  { time: "2024-01-26 16:45", topic: "安全警報", message: "偵測到異常登入嘗試，請確認帳號安全" },
];

function handleNotificationMessage(text: string): string {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("訂閱") && (lowerText.includes("列表") || lowerText.includes("清單") || lowerText.includes("管理"))) {
    let msg = "📬 訂閱管理\\n\\n您目前已訂閱的主題：\\n\\n";
    mockTopics.forEach(topic => {
      const subscribed = mockUserSubs.has(topic.id);
      const icon = subscribed ? "✅" : "⬜";
      msg += \`\${icon} \${topic.name}\\n  \${topic.description}\\n  輸入「\${subscribed ? "取消" : "訂閱"} \${topic.id}」\${subscribed ? "取消訂閱" : "進行訂閱"}\\n\\n\`;
    });
    return msg;
  }

  if (lowerText.includes("訂閱")) {
    const topicMatch = text.match(/T\\d{3}/i);
    if (topicMatch) {
      const topicId = topicMatch[0].toUpperCase();
      const topic = mockTopics.find(t => t.id === topicId);
      if (!topic) return "❌ 查無此訂閱主題，請輸入「訂閱列表」查看可用主題。";

      if (lowerText.includes("取消")) {
        if (mockUserSubs.has(topicId)) {
          mockUserSubs.delete(topicId);
          return \`✅ 已取消訂閱「\${topic.name}」\\n\\n您將不再收到此主題的通知。\\n輸入「訂閱列表」管理其他訂閱。\`;
        }
        return \`ℹ️ 您尚未訂閱「\${topic.name}」。\`;
      }

      if (!mockUserSubs.has(topicId)) {
        mockUserSubs.add(topicId);
        return \`✅ 已訂閱「\${topic.name}」\\n\\n\${topic.description}\\n\\n您將開始收到此主題的推播通知。\`;
      }
      return \`ℹ️ 您已經訂閱「\${topic.name}」了。\`;
    }
    return "📬 訂閱通知\\n\\n輸入「訂閱列表」查看所有可訂閱主題\\n輸入「訂閱 T001」訂閱指定主題\\n輸入「取消訂閱 T001」取消訂閱";
  }

  if (lowerText.includes("通知") || lowerText.includes("最新") || lowerText.includes("訊息")) {
    let msg = "🔔 最新通知\\n\\n";
    mockNotifications.forEach(n => {
      msg += \`📌 [\${n.topic}]\\n  \${n.message}\\n  🕐 \${n.time}\\n\\n\`;
    });
    msg += "輸入「訂閱列表」管理通知偏好";
    return msg;
  }

  if (lowerText.includes("任務") || lowerText.includes("待辦") || lowerText.includes("todo")) {
    const myTasks = mockTasks.filter(t => t.assignee === "王小明");
    const priorityIcon: Record<string, string> = { high: "🔴", medium: "🟡", low: "🟢" };
    const statusLabel: Record<string, string> = { pending: "待處理", in_progress: "進行中", completed: "已完成" };

    let msg = \`📋 我的任務（\${myTasks.length} 項）\\n\\n\`;
    myTasks.forEach(task => {
      msg += \`\${priorityIcon[task.priority]} \${task.title}\\n  狀態：\${statusLabel[task.status]} | 截止：\${task.dueDate}\\n\\n\`;
    });
    msg += "輸入任務編號（如 TSK-001）查看詳情";
    return msg;
  }

  if (lowerText.includes("進度") || lowerText.includes("狀態") || lowerText.includes("報告")) {
    const total = mockTasks.length;
    const completed = mockTasks.filter(t => t.status === "completed").length;
    const inProgress = mockTasks.filter(t => t.status === "in_progress").length;
    const pending = mockTasks.filter(t => t.status === "pending").length;
    return \`📊 任務進度報告\\n\\n總任務數：\${total}\\n✅ 已完成：\${completed}\\n🔄 進行中：\${inProgress}\\n⏳ 待處理：\${pending}\\n\\n完成率：\${((completed / total) * 100).toFixed(0)}%\`;
  }

  // Check for task ID
  const taskMatch = text.match(/TSK-\\d{3}/i);
  if (taskMatch) {
    const task = mockTasks.find(t => t.id === taskMatch[0].toUpperCase());
    if (task) {
      const priorityLabel: Record<string, string> = { high: "高", medium: "中", low: "低" };
      const statusLabel: Record<string, string> = { pending: "待處理", in_progress: "進行中", completed: "已完成" };
      return \`📋 任務詳情\\n\\n編號：\${task.id}\\n標題：\${task.title}\\n負責人：\${task.assignee}\\n優先級：\${priorityLabel[task.priority]}\\n狀態：\${statusLabel[task.status]}\\n截止日期：\${task.dueDate}\`;
    }
    return "❌ 查無此任務編號。";
  }

  return "🔔 通知管理機器人\\n\\n請輸入以下關鍵字：\\n• 「訂閱列表」- 管理訂閱主題\\n• 「通知」- 查看最新通知\\n• 「任務」- 查看我的任務\\n• 「進度」- 任務進度報告\\n• 任務編號 - 查看任務詳情";
}

app.get("/health", (_req, res) => { res.json({ status: "ok" }); });
app.get("/", (_req, res) => { res.json({ name: "Notification Bot", status: "running", timestamp: new Date().toISOString() }); });

app.post("/webhook", middleware(config), async (req, res) => {
  const events: webhook.Event[] = (req.body as webhook.CallbackRequest).events;

  await Promise.all(
    events
      .filter((e): e is webhook.MessageEvent & { message: webhook.TextMessageContent } =>
        e.type === "message" && e.message.type === "text"
      )
      .map(async (event) => {
        const replyText = handleNotificationMessage(event.message.text);
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

app.listen(PORT, "0.0.0.0", () => { console.log(\`Notification Bot running on http://localhost:\${PORT}\`); });
`;
