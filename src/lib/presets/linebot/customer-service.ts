import type { PresetOverlay } from "../index";

export const LINEBOT_CUSTOMER_SERVICE: PresetOverlay = {
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

// ===== Mock FAQ 資料庫 =====
const faqDatabase = [
  {
    keywords: ["商品", "產品", "品項", "規格"],
    category: "商品資訊",
    answer: "我們提供多種優質商品：\\n\\n🧴 保養系列：玻尿酸精華液、維他命C亮白乳霜、胜肽修護面膜\\n💄 彩妝系列：持色霧面唇膏、輕透氣墊粉餅、纖長捲翹睫毛膏\\n🧼 清潔系列：胺基酸潔面慕斯、溫和卸妝水、深層毛孔清潔泥膜\\n\\n如需了解特定商品詳情，請提供商品名稱。",
  },
  {
    keywords: ["營業", "時間", "上班", "下班", "幾點"],
    category: "營業時間",
    answer: "🕐 營業時間：\\n\\n📍 台北忠孝旗艦店：週一至週日 11:00-21:30\\n📍 台中中港店：週一至週日 11:00-21:00\\n📍 高雄夢時代店：週一至週四 11:00-21:30，週五至週日 11:00-22:00\\n📍 線上客服：週一至週五 09:00-18:00\\n\\n國定假日營業時間請留意官方公告。",
  },
  {
    keywords: ["退貨", "退換", "退款", "換貨", "瑕疵"],
    category: "退換貨政策",
    answer: "📦 退換貨說明：\\n\\n1️⃣ 商品到貨後 7 天內可申請退換貨\\n2️⃣ 請保持商品完整包裝及吊牌\\n3️⃣ 退款將於收到退貨後 3-5 個工作天內處理\\n4️⃣ 特價商品及個人衛生用品（已拆封）恕不接受退換\\n5️⃣ 商品瑕疵可免費換新，運費由我方負擔\\n\\n申請方式：至官網「會員中心 > 訂單查詢 > 申請退換貨」",
  },
  {
    keywords: ["運費", "配送", "寄送", "物流", "到貨", "多久"],
    category: "配送資訊",
    answer: "🚚 配送說明：\\n\\n• 全台宅配：訂單滿 NT$800 免運費，未滿運費 NT$80\\n• 超商取貨：訂單滿 NT$500 免運費，未滿運費 NT$60\\n• 一般配送時間：下單後 1-3 個工作天\\n• 偏遠地區（離島、山區）：3-5 個工作天\\n• 急件加價配送：加 NT$150 可享隔日到貨（限本島）\\n\\n訂單出貨後會以簡訊通知您物流追蹤編號。",
  },
  {
    keywords: ["價格", "多少錢", "費用", "價錢", "折扣", "優惠"],
    category: "價格與優惠",
    answer: "💰 目前優惠活動：\\n\\n🎉 春季特賣：全館 85 折起\\n🎁 會員生日禮：當月壽星享 75 折\\n🛒 滿額贈：消費滿 NT$2,000 贈精華液試用組\\n💳 刷指定信用卡：再享 9 折優惠\\n👥 好友推薦：推薦新會員雙方各得 NT$100 折價券\\n\\n最新優惠請追蹤我們的 LINE 官方帳號！",
  },
  {
    keywords: ["付款", "支付", "信用卡", "匯款", "轉帳"],
    category: "付款方式",
    answer: "💳 付款方式說明：\\n\\n• 信用卡：Visa / MasterCard / JCB（可分 3、6、12 期零利率）\\n• LINE Pay\\n• Apple Pay / Google Pay\\n• ATM 轉帳（付款期限 3 天）\\n• 超商代碼繳費（付款期限 3 天）\\n• 貨到付款（加收 NT$30 手續費）",
  },
  {
    keywords: ["會員", "點數", "等級", "積分", "VIP"],
    category: "會員制度",
    answer: "⭐ 會員制度：\\n\\n🥉 一般會員：消費 NT$1 = 1 點\\n🥈 銀卡會員（年消費滿 NT$5,000）：1.5 倍點數、生日 8 折\\n🥇 金卡會員（年消費滿 NT$15,000）：2 倍點數、生日 75 折、免費包裝\\n💎 白金會員（年消費滿 NT$30,000）：3 倍點數、生日 7 折、專屬客服\\n\\n100 點可折抵 NT$1，點數有效期限為 1 年。",
  },
  {
    keywords: ["門市", "地址", "位置", "怎麼去", "在哪"],
    category: "門市資訊",
    answer: "📍 門市地址：\\n\\n🏬 台北忠孝旗艦店\\n   台北市大安區忠孝東路四段 200 號 1F\\n   (02) 2711-XXXX\\n\\n🏬 台中中港店\\n   台中市西屯區台灣大道三段 301 號 2F\\n   (04) 2258-XXXX\\n\\n🏬 高雄夢時代店\\n   高雄市前鎮區中華五路 789 號 1F\\n   (07) 8230-XXXX\\n\\n所有門市均提供免費停車服務（消費滿 NT$500）。",
  },
];

// ===== 訊息處理邏輯 =====
function handleMessage(text: string): string {
  const lowerText = text.toLowerCase();

  // 問候語
  if (["你好", "hi", "hello", "哈囉", "嗨", "安安"].some(g => lowerText.includes(g))) {
    return "👋 您好！歡迎使用智能客服系統！\\n\\n我是您的 AI 客服助理，可以為您解答各種問題。\\n\\n請直接描述您的問題，或輸入以下指令：\\n📋 【選單】查看服務項目\\n❓ 【FAQ】常見問題\\n👤 【客服】轉接真人";
  }

  // 選單
  if (["選單", "menu", "功能", "服務"].some(k => lowerText.includes(k))) {
    return "📋 服務選單\\n\\n我可以協助您以下事項：\\n\\n1️⃣ 商品資訊查詢\\n2️⃣ 營業時間與門市位置\\n3️⃣ 退換貨政策\\n4️⃣ 配送與運費\\n5️⃣ 價格與優惠活動\\n6️⃣ 付款方式\\n7️⃣ 會員制度與點數\\n8️⃣ 轉接真人客服\\n\\n請直接輸入關鍵字或編號！";
  }

  // 轉接客服
  if (["客服", "真人", "轉接", "人工"].some(k => lowerText.includes(k))) {
    return "👤 轉接真人客服\\n\\n目前客服人員服務中，預計等候時間約 3 分鐘。\\n\\n您也可以透過以下方式聯繫我們：\\n📧 service@beautyshop.com.tw\\n📞 客服專線 0800-123-456（免付費）\\n💬 官網線上客服 www.beautyshop.com.tw";
  }

  // 投訴
  if (["投訴", "抱怨", "不滿", "申訴", "客訴"].some(k => lowerText.includes(k))) {
    return "😔 非常抱歉造成您的不便！\\n\\n我們非常重視您的意見，將為您優先處理。\\n\\n📞 客訴專線：0800-123-789（免付費）\\n📧 complaint@beautyshop.com.tw\\n\\n服務時間：週一至週五 09:00-18:00\\n我們承諾在 24 小時內給予回覆。";
  }

  // FAQ 關鍵字比對
  for (const faq of faqDatabase) {
    if (faq.keywords.some(kw => lowerText.includes(kw))) {
      return \`📌 \${faq.category}\\n\\n\${faq.answer}\\n\\n還有其他問題嗎？輸入【選單】查看更多服務！\`;
    }
  }

  // 預設回覆
  return "🤖 感謝您的訊息！\\n\\n很抱歉，我暫時無法理解您的問題。\\n\\n請嘗試以下方式：\\n📋 輸入【選單】查看服務項目\\n❓ 輸入關鍵字如「退貨」、「運費」、「營業時間」\\n👤 輸入【客服】轉接真人服務\\n\\n我們的客服團隊隨時為您服務！";
}

// ===== Express 路由設定 =====
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (_req, res) => {
  res.json({
    name: "AI 智能客服機器人",
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
  console.log(\`AI 智能客服機器人已啟動：http://localhost:\${PORT}\`);
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
      category: "openai",
      suggestedTypes: ["openai"],
      purpose: "AI 增強回覆（進階語意理解）",
      optional: true,
    },
  ],
};
