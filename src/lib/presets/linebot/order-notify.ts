import type { PresetOverlay } from "../index";

export const LINEBOT_ORDER_NOTIFY: PresetOverlay = {
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

// ===== Mock 訂單資料 =====
interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

interface Order {
  orderId: string;
  customerName: string;
  phone: string;
  status: "處理中" | "已出貨" | "配送中" | "已送達";
  items: OrderItem[];
  totalAmount: number;
  trackingNumber: string | null;
  shippingMethod: string;
  shippingAddress: string;
  orderDate: string;
  estimatedDelivery: string;
  lastUpdate: string;
}

const orders: Order[] = [
  {
    orderId: "ORD20260325001",
    customerName: "林雅婷",
    phone: "0912-345-678",
    status: "已送達",
    items: [
      { name: "有機高山烏龍茶（150g）", qty: 2, price: 680 },
      { name: "阿里山金萱茶包（20入）", qty: 1, price: 350 },
    ],
    totalAmount: 1710,
    trackingNumber: "TW20260325A001",
    shippingMethod: "黑貓宅急便",
    shippingAddress: "台北市大安區和平東路一段 162 號 5F",
    orderDate: "2026-03-22",
    estimatedDelivery: "2026-03-25",
    lastUpdate: "2026-03-25 14:30",
  },
  {
    orderId: "ORD20260326002",
    customerName: "陳建宏",
    phone: "0923-456-789",
    status: "配送中",
    items: [
      { name: "日月潭紅玉紅茶（75g）", qty: 3, price: 520 },
      { name: "手工鳳梨酥禮盒（12入）", qty: 1, price: 450 },
      { name: "花蓮麻糬禮盒（8入）", qty: 2, price: 320 },
    ],
    totalAmount: 2650,
    trackingNumber: "TW20260326B002",
    shippingMethod: "新竹物流",
    shippingAddress: "台中市西區民生路 200 號",
    orderDate: "2026-03-24",
    estimatedDelivery: "2026-03-27",
    lastUpdate: "2026-03-26 09:15",
  },
  {
    orderId: "ORD20260327003",
    customerName: "王美玲",
    phone: "0934-567-890",
    status: "已出貨",
    items: [
      { name: "台東池上米（2kg）", qty: 2, price: 380 },
      { name: "花東縱谷蜂蜜（500ml）", qty: 1, price: 580 },
    ],
    totalAmount: 1340,
    trackingNumber: "TW20260327C003",
    shippingMethod: "黑貓宅急便",
    shippingAddress: "高雄市前鎮區中華五路 789 號 12F",
    orderDate: "2026-03-25",
    estimatedDelivery: "2026-03-28",
    lastUpdate: "2026-03-27 08:00",
  },
  {
    orderId: "ORD20260327004",
    customerName: "張志明",
    phone: "0945-678-901",
    status: "處理中",
    items: [
      { name: "苗栗大湖草莓乾（100g）", qty: 3, price: 280 },
      { name: "南投竹山紅薯片（200g）", qty: 2, price: 180 },
      { name: "嘉義方塊酥（24入）", qty: 1, price: 250 },
    ],
    totalAmount: 1450,
    trackingNumber: null,
    shippingMethod: "超商取貨（全家）",
    shippingAddress: "全家便利商店 台北信義門市",
    orderDate: "2026-03-27",
    estimatedDelivery: "2026-03-30",
    lastUpdate: "2026-03-27 15:20",
  },
  {
    orderId: "ORD20260328005",
    customerName: "李佳穎",
    phone: "0956-789-012",
    status: "處理中",
    items: [
      { name: "屏東黑鮪魚鬆（200g）", qty: 1, price: 420 },
      { name: "澎湖海苔醬（280g）", qty: 2, price: 250 },
    ],
    totalAmount: 920,
    trackingNumber: null,
    shippingMethod: "7-ELEVEN 超商取貨",
    shippingAddress: "7-ELEVEN 中山門市",
    orderDate: "2026-03-28",
    estimatedDelivery: "2026-03-31",
    lastUpdate: "2026-03-28 10:45",
  },
  {
    orderId: "ORD20260328006",
    customerName: "吳宗憲",
    phone: "0967-890-123",
    status: "配送中",
    items: [
      { name: "鹿港肉鬆（300g）", qty: 2, price: 350 },
      { name: "大甲芋頭酥禮盒（10入）", qty: 1, price: 480 },
      { name: "日月潭紅茶拿鐵即溶包（10入）", qty: 3, price: 220 },
    ],
    totalAmount: 1840,
    trackingNumber: "TW20260328D006",
    shippingMethod: "黑貓宅急便",
    shippingAddress: "新北市板橋區文化路二段 300 號 3F",
    orderDate: "2026-03-26",
    estimatedDelivery: "2026-03-29",
    lastUpdate: "2026-03-28 07:30",
  },
];

// ===== 狀態圖示對應 =====
function statusIcon(status: string): string {
  const map: Record<string, string> = {
    "處理中": "📦",
    "已出貨": "🚚",
    "配送中": "🛵",
    "已送達": "✅",
  };
  return map[status] || "📦";
}

// ===== 訊息處理邏輯 =====
function handleMessage(text: string): string {
  const lowerText = text.trim();

  // 查詢單筆訂單
  const orderMatch = lowerText.match(/(ORD\\d+)/i);
  if (orderMatch) {
    const orderId = orderMatch[1].toUpperCase();
    const order = orders.find(o => o.orderId === orderId);
    if (!order) return "❌ 查無此訂單編號，請確認後重試。\\n\\n輸入【我的訂單】查看近期訂單。";

    let msg = \`\${statusIcon(order.status)} 訂單詳情\\n\\n\`;
    msg += \`🆔 訂單編號：\${order.orderId}\\n\`;
    msg += \`📅 下單日期：\${order.orderDate}\\n\`;
    msg += \`📊 訂單狀態：\${order.status}\\n\`;
    msg += \`🕐 最後更新：\${order.lastUpdate}\\n\\n\`;

    msg += "📝 訂購商品：\\n";
    order.items.forEach(item => {
      msg += \`  • \${item.name} x\${item.qty}  NT$\${(item.price * item.qty).toLocaleString()}\\n\`;
    });
    msg += \`\\n💰 訂單金額：NT$\${order.totalAmount.toLocaleString()}\\n\`;
    msg += \`🚚 配送方式：\${order.shippingMethod}\\n\`;
    msg += \`📍 配送地址：\${order.shippingAddress}\\n\`;

    if (order.trackingNumber) {
      msg += \`📦 物流編號：\${order.trackingNumber}\\n\`;
    }
    msg += \`📅 預計到貨：\${order.estimatedDelivery}\`;

    return msg;
  }

  // 查詢近期訂單（用手機號碼或「我的訂單」）
  if (lowerText.includes("我的訂單") || lowerText.includes("近期") || lowerText.includes("訂單列表")) {
    let msg = "📋 近期訂單一覽\\n\\n";
    orders.forEach(order => {
      msg += \`\${statusIcon(order.status)} \${order.orderId}\\n\`;
      msg += \`   \${order.status} | NT$\${order.totalAmount.toLocaleString()} | \${order.orderDate}\\n\\n\`;
    });
    msg += "輸入訂單編號查看詳細資訊\\n範例：ORD20260325001";
    return msg;
  }

  // 用手機號碼查詢
  const phoneMatch = lowerText.match(/(09\\d{2}[\\-]?\\d{3}[\\-]?\\d{3})/);
  if (phoneMatch) {
    const phone = phoneMatch[1].replace(/-/g, "");
    const results = orders.filter(o => o.phone.replace(/-/g, "") === phone);
    if (results.length === 0) return "🔍 此手機號碼查無訂單記錄。\\n\\n請確認號碼是否正確，或輸入訂單編號查詢。";

    let msg = \`📋 手機 \${phoneMatch[1]} 的訂單記錄\\n\\n\`;
    results.forEach(order => {
      msg += \`\${statusIcon(order.status)} \${order.orderId}\\n\`;
      msg += \`   \${order.status} | NT$\${order.totalAmount.toLocaleString()} | \${order.orderDate}\\n\\n\`;
    });
    msg += "輸入訂單編號查看詳細資訊";
    return msg;
  }

  // 物流查詢
  if (lowerText.includes("物流") || lowerText.includes("tracking") || lowerText.includes("追蹤")) {
    return "📦 物流追蹤\\n\\n請提供訂單編號，我將為您查詢最新物流狀態。\\n\\n範例：ORD20260325001\\n\\n或輸入【我的訂單】查看所有訂單。";
  }

  // 問候語
  if (["你好", "hi", "hello", "哈囉", "嗨"].some(g => lowerText.includes(g))) {
    return "📦 您好！歡迎使用台灣好物訂單查詢系統！\\n\\n我可以協助您：\\n\\n🔍 查詢訂單狀態\\n📋 查看近期訂單\\n🚚 追蹤物流資訊\\n\\n請輸入：\\n• 訂單編號（如 ORD20260325001）\\n• 手機號碼（如 0912345678）\\n• 或輸入【我的訂單】";
  }

  // 預設回覆
  return "📦 台灣好物｜訂單通知系統\\n\\n請選擇查詢方式：\\n\\n🔍 輸入【訂單編號】查詢單筆訂單\\n📱 輸入【手機號碼】查詢相關訂單\\n📋 輸入【我的訂單】查看近期訂單\\n🚚 輸入【物流】追蹤配送進度\\n\\n範例：ORD20260325001";
}

// ===== Express 路由設定 =====
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (_req, res) => {
  res.json({
    name: "台灣好物訂單通知機器人",
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
  console.log(\`台灣好物訂單通知機器人已啟動：http://localhost:\${PORT}\`);
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
  ],
};
