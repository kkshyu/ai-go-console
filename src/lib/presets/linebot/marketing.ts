export const LINEBOT_MEMBER_CARD = `import express from "express";
import cors from "cors";
import { messagingApi, middleware, webhook, HTTPFetchError } from "@line/bot-sdk";

const PORT = parseInt(process.env.PORT || "3000", 10);
const config = { channelSecret: process.env.LINE_CHANNEL_SECRET || "" };
const clientConfig = { channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "" };
const client = new messagingApi.MessagingApiClient(clientConfig);
const app = express();

// Mock member data
const mockMember = {
  name: "王小明",
  level: "金卡會員",
  points: 12580,
  totalSpent: 85600,
  nextLevel: "白金會員",
  pointsToNextLevel: 7420,
  memberSince: "2023-03-15",
};

// Mock rewards catalog
const mockRewards = [
  { id: "R001", name: "星巴克飲品兌換券", points: 500, stock: 50 },
  { id: "R002", name: "電影票兌換券", points: 800, stock: 30 },
  { id: "R003", name: "百貨公司禮券 NT$200", points: 2000, stock: 20 },
  { id: "R004", name: "高級餐廳折扣券", points: 1500, stock: 15 },
  { id: "R005", name: "SPA 體驗券", points: 3000, stock: 10 },
];

// Mock coupons
const mockCoupons = [
  { code: "WELCOME10", discount: "9折優惠", expiry: "2024-03-31", minSpend: 500, status: "active" },
  { code: "BDAY2024", discount: "生日禮 85折", expiry: "2024-02-28", minSpend: 0, status: "active" },
  { code: "VIP500", discount: "滿千折百", expiry: "2024-04-30", minSpend: 1000, status: "active" },
];

function handleMemberMessage(text: string): string {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("會員") && (lowerText.includes("卡") || lowerText.includes("資訊") || lowerText.includes("資料"))) {
    return \`💳 會員資訊\\n\\n👤 \${mockMember.name}\\n🏅 等級：\${mockMember.level}\\n⭐ 點數餘額：\${mockMember.points.toLocaleString()} 點\\n💰 累計消費：NT$ \${mockMember.totalSpent.toLocaleString()}\\n📅 加入日期：\${mockMember.memberSince}\\n\\n⬆️ 距離 \${mockMember.nextLevel} 還需 \${mockMember.pointsToNextLevel.toLocaleString()} 點\\n\\n輸入「點數」查看點數明細\`;
  }

  if (lowerText.includes("點數") || lowerText.includes("積分")) {
    if (lowerText.includes("兌換") || lowerText.includes("換")) {
      let msg = "🎁 點數兌換商城\\n\\n您的點數餘額：" + mockMember.points.toLocaleString() + " 點\\n\\n";
      mockRewards.forEach(r => {
        const canRedeem = mockMember.points >= r.points ? "✅ 可兌換" : "❌ 點數不足";
        msg += \`\${r.id} \${r.name}\\n  所需點數：\${r.points.toLocaleString()} 點 | \${canRedeem}\\n\\n\`;
      });
      msg += "輸入兌換編號（如 R001）進行兌換";
      return msg;
    }
    return \`⭐ 點數資訊\\n\\n目前點數：\${mockMember.points.toLocaleString()} 點\\n\\n近期點數異動：\\n+ 500 點 | 2024-01-25 消費回饋\\n+ 200 點 | 2024-01-20 活動獎勵\\n- 800 點 | 2024-01-18 兌換電影票\\n+ 350 點 | 2024-01-15 消費回饋\\n+ 1000 點 | 2024-01-10 首購加碼\\n\\n輸入「兌換」查看可兌換商品\`;
  }

  if (lowerText.includes("優惠") || lowerText.includes("折扣") || lowerText.includes("coupon") || lowerText.includes("券")) {
    let msg = "🎫 您的優惠券\\n\\n";
    mockCoupons.forEach(c => {
      msg += \`🏷️ \${c.discount}\\n  代碼：\${c.code}\\n  有效期限：\${c.expiry}\\n  \${c.minSpend > 0 ? \`消費滿 NT$ \${c.minSpend} 可用\` : "無最低消費限制"}\\n\\n\`;
    });
    msg += "結帳時輸入優惠代碼即可使用";
    return msg;
  }

  if (lowerText.includes("升等") || lowerText.includes("等級") || lowerText.includes("level")) {
    return \`🏅 會員等級制度\\n\\n🥉 銅卡會員：累計消費 NT$ 0+\\n  → 消費回饋 1%\\n\\n🥈 銀卡會員：累計消費 NT$ 30,000+\\n  → 消費回饋 2% + 生日禮\\n\\n🥇 金卡會員：累計消費 NT$ 60,000+ ⬅️ 您目前的等級\\n  → 消費回饋 3% + 生日禮 + VIP 活動\\n\\n💎 白金會員：累計消費 NT$ 120,000+\\n  → 消費回饋 5% + 專屬客服 + 全部權益\\n\\n您目前累計消費：NT$ \${mockMember.totalSpent.toLocaleString()}\\n距離白金會員還需消費：NT$ \${(120000 - mockMember.totalSpent).toLocaleString()}\`;
  }

  // Check for reward redemption
  const rewardMatch = text.match(/R\\d{3}/i);
  if (rewardMatch) {
    const reward = mockRewards.find(r => r.id === rewardMatch[0].toUpperCase());
    if (reward) {
      if (mockMember.points >= reward.points) {
        return \`✅ 兌換成功！\\n\\n🎁 \${reward.name}\\n扣除點數：\${reward.points.toLocaleString()} 點\\n剩餘點數：\${(mockMember.points - reward.points).toLocaleString()} 點\\n\\n兌換券將於 24 小時內發送至您的 Email。\`;
      }
      return \`❌ 點數不足\\n\\n\${reward.name} 需要 \${reward.points.toLocaleString()} 點\\n您目前有 \${mockMember.points.toLocaleString()} 點\\n還差 \${(reward.points - mockMember.points).toLocaleString()} 點\`;
    }
  }

  return "💳 會員卡機器人\\n\\n請輸入以下關鍵字：\\n• 「會員卡」- 查看會員資訊\\n• 「點數」- 點數餘額與明細\\n• 「兌換」- 點數兌換商城\\n• 「優惠」- 查看優惠券\\n• 「等級」- 會員等級說明";
}

app.get("/health", (_req, res) => { res.json({ status: "ok" }); });
app.get("/", (_req, res) => { res.json({ name: "Member Card Bot", status: "running", timestamp: new Date().toISOString() }); });

app.post("/webhook", middleware(config), async (req, res) => {
  const events: webhook.Event[] = (req.body as webhook.CallbackRequest).events;

  await Promise.all(
    events
      .filter((e): e is webhook.MessageEvent & { message: webhook.TextMessageContent } =>
        e.type === "message" && e.message.type === "text"
      )
      .map(async (event) => {
        const replyText = handleMemberMessage(event.message.text);
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

app.listen(PORT, "0.0.0.0", () => { console.log(\`Member Card Bot running on http://localhost:\${PORT}\`); });
`;

export const LINEBOT_SURVEY = `import express from "express";
import cors from "cors";
import { messagingApi, middleware, webhook, HTTPFetchError } from "@line/bot-sdk";

const PORT = parseInt(process.env.PORT || "3000", 10);
const config = { channelSecret: process.env.LINE_CHANNEL_SECRET || "" };
const clientConfig = { channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "" };
const client = new messagingApi.MessagingApiClient(clientConfig);
const app = express();

// Mock survey questions
const surveyQuestions = [
  { id: 1, question: "整體服務滿意度如何？", options: ["1️⃣ 非常滿意", "2️⃣ 滿意", "3️⃣ 普通", "4️⃣ 不滿意", "5️⃣ 非常不滿意"] },
  { id: 2, question: "產品品質評價如何？", options: ["1️⃣ 非常好", "2️⃣ 好", "3️⃣ 普通", "4️⃣ 差", "5️⃣ 非常差"] },
  { id: 3, question: "客服回應速度評價？", options: ["1️⃣ 非常快速", "2️⃣ 快速", "3️⃣ 普通", "4️⃣ 緩慢", "5️⃣ 非常緩慢"] },
  { id: 4, question: "是否願意推薦給親友？", options: ["1️⃣ 一定會", "2️⃣ 可能會", "3️⃣ 不確定", "4️⃣ 可能不會", "5️⃣ 不會"] },
  { id: 5, question: "請問有什麼建議想對我們說的嗎？（可自由輸入文字）", options: [] },
];

// Track survey progress per user (simplified mock)
const userSurveyState: Record<string, { currentQuestion: number; answers: string[] }> = {};

function handleSurveyMessage(text: string, userId: string): string {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("問卷") || lowerText.includes("調查") || lowerText.includes("開始")) {
    userSurveyState[userId] = { currentQuestion: 0, answers: [] };
    const q = surveyQuestions[0];
    let msg = "📝 滿意度調查問卷\\n\\n感謝您撥空填寫！本問卷共 5 題，約需 2 分鐘。\\n\\n";
    msg += \`第 1 題 / 共 5 題\\n\\n❓ \${q.question}\\n\\n\`;
    q.options.forEach(opt => { msg += opt + "\\n"; });
    msg += "\\n請輸入數字 1-5 作答";
    return msg;
  }

  if (lowerText.includes("滿意度") || lowerText.includes("結果") || lowerText.includes("統計")) {
    return "📊 問卷統計結果\\n\\n本月回收：156 份\\n\\n整體滿意度：\\n⭐⭐⭐⭐ 4.2 / 5.0\\n\\n各項評分：\\n• 服務滿意度：4.3\\n• 產品品質：4.1\\n• 客服速度：3.9\\n• 推薦意願：4.5\\n\\n📈 較上月提升 0.3 分";
  }

  if (lowerText.includes("取消") || lowerText.includes("結束")) {
    if (userSurveyState[userId]) {
      delete userSurveyState[userId];
      return "❌ 已取消問卷填寫。\\n\\n輸入「問卷」可重新開始。";
    }
    return "目前沒有進行中的問卷。\\n\\n輸入「問卷」開始填寫。";
  }

  // Check if user is in a survey
  if (userSurveyState[userId]) {
    const state = userSurveyState[userId];
    const currentQ = surveyQuestions[state.currentQuestion];

    // Validate answer for multiple choice questions
    if (currentQ.options.length > 0) {
      const answerNum = parseInt(text);
      if (isNaN(answerNum) || answerNum < 1 || answerNum > 5) {
        return "⚠️ 請輸入 1-5 的數字作答。";
      }
    }

    // Save answer
    state.answers.push(text);
    state.currentQuestion++;

    // Check if survey is complete
    if (state.currentQuestion >= surveyQuestions.length) {
      delete userSurveyState[userId];
      return "🎉 問卷填寫完成！\\n\\n感謝您寶貴的意見，我們會持續努力改善服務品質。\\n\\n🎁 感謝禮：您已獲得 50 點紅利點數！\\n\\n輸入「結果」查看目前統計結果。";
    }

    // Show next question
    const nextQ = surveyQuestions[state.currentQuestion];
    let msg = \`✅ 已記錄您的回答\\n\\n第 \${state.currentQuestion + 1} 題 / 共 5 題\\n\\n❓ \${nextQ.question}\\n\\n\`;
    if (nextQ.options.length > 0) {
      nextQ.options.forEach(opt => { msg += opt + "\\n"; });
      msg += "\\n請輸入數字 1-5 作答";
    } else {
      msg += "請直接輸入您的建議";
    }
    return msg;
  }

  return "📝 問卷調查機器人\\n\\n請輸入以下關鍵字：\\n• 「問卷」- 開始填寫問卷\\n• 「滿意度」- 查看統計結果\\n• 「調查」- 開始填寫問卷\\n\\n完成問卷可獲得 50 點紅利點數！";
}

app.get("/health", (_req, res) => { res.json({ status: "ok" }); });
app.get("/", (_req, res) => { res.json({ name: "Survey Bot", status: "running", timestamp: new Date().toISOString() }); });

app.post("/webhook", middleware(config), async (req, res) => {
  const events: webhook.Event[] = (req.body as webhook.CallbackRequest).events;

  await Promise.all(
    events
      .filter((e): e is webhook.MessageEvent & { message: webhook.TextMessageContent } =>
        e.type === "message" && e.message.type === "text"
      )
      .map(async (event) => {
        const userId = event.source?.userId || "unknown";
        const replyText = handleSurveyMessage(event.message.text, userId);
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

app.listen(PORT, "0.0.0.0", () => { console.log(\`Survey Bot running on http://localhost:\${PORT}\`); });
`;
