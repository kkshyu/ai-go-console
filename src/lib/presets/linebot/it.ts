export const LINEBOT_FAQ = `import express from "express";
import cors from "cors";
import { messagingApi, middleware, webhook, HTTPFetchError } from "@line/bot-sdk";

const PORT = parseInt(process.env.PORT || "3000", 10);
const config = { channelSecret: process.env.LINE_CHANNEL_SECRET || "" };
const clientConfig = { channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "" };
const client = new messagingApi.MessagingApiClient(clientConfig);
const app = express();

// Mock FAQ database
const faqDatabase = [
  {
    id: "FAQ-001",
    keywords: ["密碼", "忘記密碼", "重設密碼", "password", "登入不了"],
    category: "帳號安全",
    question: "忘記密碼怎麼辦？",
    answer: "請依照以下步驟重設密碼：\\n\\n1. 前往登入頁面，點擊「忘記密碼」\\n2. 輸入您的註冊 Email\\n3. 查收重設密碼信件（請也檢查垃圾信箱）\\n4. 點擊信件中的連結設定新密碼\\n\\n⚠️ 新密碼需包含：\\n• 至少 8 個字元\\n• 大小寫英文字母\\n• 至少一個數字",
  },
  {
    id: "FAQ-002",
    keywords: ["vpn", "連線", "遠端", "remote", "在家"],
    category: "網路連線",
    question: "如何設定 VPN 遠端連線？",
    answer: "VPN 設定步驟：\\n\\n1. 下載公司指定的 VPN 軟體\\n2. 開啟軟體，輸入伺服器位址：vpn.company.com\\n3. 使用公司帳號密碼登入\\n4. 連線成功後即可存取內部系統\\n\\n⚠️ 注意事項：\\n• 首次使用需先向 IT 部門申請權限\\n• VPN 連線中請勿使用 P2P 軟體\\n• 遇到連線問題請聯繫 IT 支援",
  },
  {
    id: "FAQ-003",
    keywords: ["信箱", "email", "outlook", "郵件", "收不到信"],
    category: "電子郵件",
    question: "Email 相關問題",
    answer: "常見 Email 問題解決方案：\\n\\n📧 收不到信件：\\n1. 檢查垃圾郵件資料夾\\n2. 確認信箱容量未超過上限（50GB）\\n3. 檢查郵件規則是否誤設\\n\\n📧 無法寄信：\\n1. 確認收件者地址正確\\n2. 附件大小不可超過 25MB\\n3. 大量寄件請使用郵件群組\\n\\n📧 信箱容量不足：\\n請清理舊郵件或聯繫 IT 擴充容量",
  },
  {
    id: "FAQ-004",
    keywords: ["印表機", "列印", "print", "掃描", "scan"],
    category: "印表機",
    question: "印表機相關問題",
    answer: "印表機故障排除：\\n\\n🖨️ 無法列印：\\n1. 確認印表機電源已開啟\\n2. 檢查是否有卡紙\\n3. 確認電腦已安裝印表機驅動程式\\n4. 重新啟動列印服務\\n\\n🖨️ 各樓層印表機位置：\\n• 3F：會議室旁 HP LaserJet\\n• 5F：茶水間旁 Canon\\n• 7F：IT 部門 Epson\\n\\n如問題未解決，請提交 IT 工單",
  },
  {
    id: "FAQ-005",
    keywords: ["軟體", "安裝", "install", "授權", "license"],
    category: "軟體安裝",
    question: "如何申請軟體安裝？",
    answer: "軟體安裝申請流程：\\n\\n1. 填寫「軟體需求申請表」\\n2. 經部門主管簽核\\n3. IT 部門評估安全性\\n4. 核准後由 IT 遠端安裝\\n\\n🔧 已授權軟體清單：\\n• Microsoft 365（全員）\\n• Adobe Creative Cloud（設計部）\\n• Slack / Teams（全員）\\n• VS Code（工程部）\\n\\n⏱️ 一般處理時間：1-3 個工作天",
  },
  {
    id: "FAQ-006",
    keywords: ["wifi", "無線", "網路慢", "斷線", "上不了網"],
    category: "網路連線",
    question: "WiFi 無線網路問題",
    answer: "WiFi 問題排除：\\n\\n📶 公司 WiFi 資訊：\\n• 辦公區：Company-Office（向 IT 索取密碼）\\n• 訪客區：Company-Guest（大廳公告密碼）\\n\\n📶 連線問題排除：\\n1. 關閉 WiFi 後重新開啟\\n2. 忘記網路後重新連線\\n3. 確認未連到訪客網路\\n4. 重新啟動電腦\\n\\n📶 網路速度慢：\\n• 避免在會議室密集區使用大量頻寬\\n• 影片會議建議使用有線網路",
  },
  {
    id: "FAQ-007",
    keywords: ["工單", "報修", "申請", "it支援", "求助"],
    category: "IT 支援",
    question: "如何提交 IT 工單？",
    answer: "提交 IT 工單方式：\\n\\n1️⃣ 線上系統：it-support.company.com\\n2️⃣ Email：it-help@company.com\\n3️⃣ 電話：分機 8888\\n4️⃣ 本機器人：輸入「報修」+ 問題描述\\n\\n⏱️ 回應時間：\\n• 緊急（系統當機）：30 分鐘內\\n• 一般（軟體問題）：4 小時內\\n• 低優先（需求申請）：1-3 工作天",
  },
];

function fuzzyMatch(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

function handleFaqMessage(text: string): string {
  const lowerText = text.toLowerCase();

  // Direct keyword match against FAQ database
  const matchedFaqs = faqDatabase.filter(faq => fuzzyMatch(text, faq.keywords));

  if (matchedFaqs.length === 1) {
    const faq = matchedFaqs[0];
    return \`📖 \${faq.category} - \${faq.question}\\n\\n\${faq.answer}\\n\\n---\\n如需更多協助，請輸入「工單」提交 IT 支援請求。\`;
  }

  if (matchedFaqs.length > 1) {
    let msg = \`🔍 找到 \${matchedFaqs.length} 個相關問題：\\n\\n\`;
    matchedFaqs.forEach((faq, index) => {
      msg += \`\${index + 1}️⃣ [\${faq.category}] \${faq.question}\\n\`;
    });
    msg += "\\n請輸入更精確的關鍵字，或輸入編號查看（如「FAQ-001」）";
    return msg;
  }

  // Check for FAQ ID
  const faqMatch = text.match(/FAQ-\\d{3}/i);
  if (faqMatch) {
    const faq = faqDatabase.find(f => f.id === faqMatch[0].toUpperCase());
    if (faq) {
      return \`📖 \${faq.category} - \${faq.question}\\n\\n\${faq.answer}\\n\\n---\\n如需更多協助，請輸入「工單」提交 IT 支援請求。\`;
    }
    return "❌ 查無此 FAQ 編號。輸入「目錄」查看所有常見問題。";
  }

  if (lowerText.includes("目錄") || lowerText.includes("分類") || lowerText.includes("列表")) {
    const categories = [...new Set(faqDatabase.map(f => f.category))];
    let msg = "📚 FAQ 常見問題目錄\\n\\n";
    categories.forEach(cat => {
      const faqs = faqDatabase.filter(f => f.category === cat);
      msg += \`【\${cat}】\\n\`;
      faqs.forEach(f => {
        msg += \`  \${f.id} \${f.question}\\n\`;
      });
      msg += "\\n";
    });
    msg += "輸入 FAQ 編號或關鍵字查看詳情";
    return msg;
  }

  if (lowerText.includes("報修") || lowerText.includes("故障")) {
    const description = text.replace(/報修|故障/g, "").trim();
    if (description) {
      const ticketId = \`TK-\${String(Math.floor(Math.random() * 9000) + 1000)}\`;
      return \`✅ IT 工單已建立\\n\\n工單編號：\${ticketId}\\n問題描述：\${description}\\n優先級：一般\\n預計回應：4 小時內\\n\\nIT 同仁會盡快與您聯繫！\`;
    }
    return "📝 請輸入「報修」加上問題描述\\n\\n範例：報修 電腦無法開機";
  }

  return "🤖 IT 常見問題機器人\\n\\n請輸入您的問題關鍵字，例如：\\n• 「密碼」- 密碼重設問題\\n• 「VPN」- 遠端連線設定\\n• 「信箱」- Email 問題\\n• 「印表機」- 列印相關\\n• 「WiFi」- 無線網路\\n• 「軟體」- 軟體安裝\\n• 「目錄」- 查看所有問題分類\\n• 「報修」- 提交 IT 工單";
}

app.get("/health", (_req, res) => { res.json({ status: "ok" }); });
app.get("/", (_req, res) => { res.json({ name: "FAQ Bot", status: "running", timestamp: new Date().toISOString() }); });

app.post("/webhook", middleware(config), async (req, res) => {
  const events: webhook.Event[] = (req.body as webhook.CallbackRequest).events;

  await Promise.all(
    events
      .filter((e): e is webhook.MessageEvent & { message: webhook.TextMessageContent } =>
        e.type === "message" && e.message.type === "text"
      )
      .map(async (event) => {
        const replyText = handleFaqMessage(event.message.text);
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

app.listen(PORT, "0.0.0.0", () => { console.log(\`FAQ Bot running on http://localhost:\${PORT}\`); });
`;
