export const LINEBOT_PROPERTY_INQUIRY = `import express from "express";
import cors from "cors";
import { messagingApi, middleware, webhook, HTTPFetchError } from "@line/bot-sdk";

const PORT = parseInt(process.env.PORT || "3000", 10);
const config = { channelSecret: process.env.LINE_CHANNEL_SECRET || "" };
const clientConfig = { channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "" };
const client = new messagingApi.MessagingApiClient(clientConfig);
const app = express();

// Mock listings
const mockListings = [
  { id: "A001", title: "信義區豪華三房", type: "sell", address: "台北市信義區松仁路88號12樓", area: 45.6, rooms: 3, price: 38800000, floor: "12/28", age: 8 },
  { id: "A002", title: "中山區精裝套房", type: "rent", address: "台北市中山區南京東路二段15號5樓", area: 12.3, rooms: 1, price: 18000, floor: "5/12", age: 15 },
  { id: "A003", title: "大安區電梯華廈", type: "sell", address: "台北市大安區復興南路一段200號8樓", area: 38.2, rooms: 3, price: 32500000, floor: "8/14", age: 20 },
  { id: "A004", title: "內湖科技園區辦公室", type: "rent", address: "台北市內湖區瑞光路513巷22號3樓", area: 65.0, rooms: 0, price: 55000, floor: "3/8", age: 10 },
  { id: "A005", title: "新店透天別墅", type: "sell", address: "新北市新店區中正路120號", area: 85.0, rooms: 5, price: 52000000, floor: "1-4/4", age: 5 },
  { id: "A006", title: "板橋新埔捷運宅", type: "sell", address: "新北市板橋區民生路三段50號15樓", area: 28.5, rooms: 2, price: 16800000, floor: "15/22", age: 3 },
];

// Mock viewing schedule
const mockViewings = [
  { id: "V001", listingId: "A001", clientName: "陳先生", date: "2024-03-20", time: "14:00", status: "confirmed" },
  { id: "V002", listingId: "A003", clientName: "林小姐", date: "2024-03-21", time: "10:00", status: "pending" },
  { id: "V003", listingId: "A005", clientName: "張先生", date: "2024-03-22", time: "15:00", status: "confirmed" },
];

function formatPrice(type: string, price: number): string {
  if (type === "sell") return \`\${(price / 10000).toLocaleString()} 萬\`;
  return \`NT$ \${price.toLocaleString()}/月\`;
}

function handlePropertyMessage(text: string): string {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("找房") || lowerText.includes("物件") || lowerText.includes("房屋")) {
    let msg = "🏠 目前刊登物件\\n\\n";
    mockListings.forEach(l => {
      const typeLabel = l.type === "sell" ? "🔴售" : "🔵租";
      msg += \`\${typeLabel} \${l.id} \${l.title}\\n  📍 \${l.address}\\n  📐 \${l.area}坪 | \${l.rooms}房 | \${l.floor}樓\\n  💰 \${formatPrice(l.type, l.price)}\\n\\n\`;
    });
    msg += "輸入物件編號（如 A001）查看詳情\\n輸入「看屋」預約看屋";
    return msg;
  }

  if (lowerText.includes("買") || lowerText.includes("售") || lowerText.includes("購")) {
    const sellListings = mockListings.filter(l => l.type === "sell");
    let msg = "🏷️ 待售物件\\n\\n";
    sellListings.forEach(l => {
      msg += \`🔴 \${l.id} \${l.title}\\n  📍 \${l.address}\\n  📐 \${l.area}坪 | \${l.rooms}房\\n  💰 \${formatPrice(l.type, l.price)}\\n\\n\`;
    });
    msg += "輸入物件編號查看詳情";
    return msg;
  }

  if (lowerText.includes("租")) {
    const rentListings = mockListings.filter(l => l.type === "rent");
    let msg = "🏷️ 出租物件\\n\\n";
    rentListings.forEach(l => {
      msg += \`🔵 \${l.id} \${l.title}\\n  📍 \${l.address}\\n  📐 \${l.area}坪\\n  💰 \${formatPrice(l.type, l.price)}\\n\\n\`;
    });
    msg += "輸入物件編號查看詳情";
    return msg;
  }

  if (lowerText.includes("看屋") || lowerText.includes("預約")) {
    if (mockViewings.length === 0) return "📭 目前沒有看屋預約。\\n\\n輸入「看屋 A001」預約看屋。";
    let msg = "📅 看屋預約\\n\\n";
    mockViewings.forEach(v => {
      const listing = mockListings.find(l => l.id === v.listingId);
      const statusLabel = v.status === "confirmed" ? "✅ 已確認" : "⏳ 待確認";
      msg += \`\${statusLabel} \${v.id}\\n  物件：\${listing?.title || v.listingId}\\n  客戶：\${v.clientName}\\n  時間：\${v.date} \${v.time}\\n\\n\`;
    });
    msg += "輸入「看屋 A001」預約新的看屋\\n格式：看屋 物件編號 日期 時間";
    return msg;
  }

  // Check for listing ID
  const listingMatch = text.match(/A\\d{3}/i);
  if (listingMatch) {
    const listing = mockListings.find(l => l.id === listingMatch[0].toUpperCase());
    if (listing) {
      const typeLabel = listing.type === "sell" ? "售" : "租";
      return \`🏠 物件詳情\\n\\n\${listing.title}\\n\\n📍 地址：\${listing.address}\\n🏷️ 類型：\${typeLabel}\\n📐 坪數：\${listing.area} 坪\\n🛏️ 格局：\${listing.rooms} 房\\n🏢 樓層：\${listing.floor}\\n📅 屋齡：\${listing.age} 年\\n💰 價格：\${formatPrice(listing.type, listing.price)}\\n\\n📞 預約看屋：輸入「看屋 \${listing.id}」\\n💬 洽詢經紀人：輸入「聯絡」\`;
    }
    return "❌ 查無此物件編號。輸入「找房」查看所有物件。";
  }

  if (lowerText.includes("聯絡") || lowerText.includes("經紀人") || lowerText.includes("業務")) {
    return "📞 聯絡經紀人\\n\\n🧑‍💼 專屬經紀人：王小明\\n📱 手機：0912-345-678\\n📧 Email：agent@realestate.tw\\n🏢 信義房屋 信義旗艦店\\n\\n⏰ 服務時間：\\n週一至週五 09:00-21:00\\n週六至週日 10:00-18:00\\n\\n或直接輸入您的需求，我們會盡快回覆！";
  }

  return "🏠 房屋諮詢機器人\\n\\n請輸入以下關鍵字：\\n• 「找房」- 查看所有物件\\n• 「買」- 查看待售物件\\n• 「租」- 查看出租物件\\n• 「看屋」- 預約看屋\\n• 「聯絡」- 聯絡經紀人\\n• 物件編號（如 A001）- 查看物件詳情";
}

app.get("/health", (_req, res) => { res.json({ status: "ok" }); });
app.get("/", (_req, res) => { res.json({ name: "Property Inquiry Bot", status: "running", timestamp: new Date().toISOString() }); });

app.post("/webhook", middleware(config), async (req, res) => {
  const events: webhook.Event[] = (req.body as webhook.CallbackRequest).events;

  await Promise.all(
    events
      .filter((e): e is webhook.MessageEvent & { message: webhook.TextMessageContent } =>
        e.type === "message" && e.message.type === "text"
      )
      .map(async (event) => {
        const replyText = handlePropertyMessage(event.message.text);
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

app.listen(PORT, "0.0.0.0", () => { console.log(\`Property Inquiry Bot running on http://localhost:\${PORT}\`); });
`;
