export const LINEBOT_CUSTOMER_SERVICE = `import express from "express";
import cors from "cors";
import { messagingApi, middleware, webhook, HTTPFetchError } from "@line/bot-sdk";

const PORT = parseInt(process.env.PORT || "3000", 10);
const config = { channelSecret: process.env.LINE_CHANNEL_SECRET || "" };
const clientConfig = { channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "" };
const client = new messagingApi.MessagingApiClient(clientConfig);
const app = express();

// Mock FAQ database
const faqDatabase = [
  { keywords: ["退貨", "退換", "退款"], category: "退換貨", answer: "退換貨政策：商品到貨後 7 天內可申請退換貨，請保持商品完整包裝。退款將於收到退貨後 3-5 個工作天內處理。" },
  { keywords: ["配送", "運費", "寄送", "物流"], category: "配送", answer: "我們提供全台宅配服務，訂單滿 NT$ 1,000 免運費。一般配送時間為 1-3 個工作天，偏遠地區可能需要額外 1-2 天。" },
  { keywords: ["付款", "支付", "信用卡"], category: "付款", answer: "我們支援以下付款方式：\\n• 信用卡（Visa / MasterCard / JCB）\\n• LINE Pay\\n• 貨到付款\\n• ATM 轉帳" },
  { keywords: ["營業", "時間", "上班"], category: "營業時間", answer: "客服服務時間：\\n週一至週五 09:00-18:00\\n週六 10:00-14:00\\n週日及國定假日休息" },
];

function handleServiceMessage(text: string): string {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("客服") || lowerText.includes("真人") || lowerText.includes("轉接")) {
    return "👤 轉接真人客服\\n\\n目前客服人員服務中，預計等候時間約 3 分鐘。\\n\\n您也可以：\\n📧 寄信至 support@example.com\\n📞 撥打客服專線 02-1234-5678";
  }

  if (lowerText.includes("問題") || lowerText.includes("幫助") || lowerText.includes("幫忙") || lowerText.includes("help")) {
    return "🙋 您好！我是智能客服助理，很高興為您服務！\\n\\n我可以協助您：\\n1️⃣ 退換貨相關問題\\n2️⃣ 配送與運費查詢\\n3️⃣ 付款方式說明\\n4️⃣ 營業時間查詢\\n5️⃣ 轉接真人客服\\n\\n請直接輸入您的問題，或選擇上方選項！";
  }

  if (lowerText === "你好" || lowerText === "hi" || lowerText === "hello" || lowerText.includes("哈囉") || lowerText.includes("嗨")) {
    return "👋 您好！歡迎使用智能客服系統！\\n\\n請問有什麼可以幫助您的嗎？您可以直接描述問題，或輸入「幫助」查看服務項目。";
  }

  // Check FAQ database
  for (const faq of faqDatabase) {
    if (faq.keywords.some(kw => lowerText.includes(kw))) {
      return \`📌 \${faq.category}相關\\n\\n\${faq.answer}\\n\\n如需進一步協助，請輸入「客服」轉接真人服務。\`;
    }
  }

  if (lowerText.includes("投訴") || lowerText.includes("抱怨") || lowerText.includes("不滿")) {
    return "😔 非常抱歉造成您的不便！\\n\\n我們非常重視您的意見，將為您轉接專人處理。\\n\\n您也可以直接撥打客訴專線：02-1234-5679\\n或寄信至 complaint@example.com\\n\\n我們會在 24 小時內回覆您。";
  }

  return "🤖 感謝您的訊息！\\n\\n很抱歉，我暫時無法理解您的問題。\\n\\n請嘗試：\\n• 輸入「幫助」查看服務項目\\n• 輸入「客服」轉接真人服務\\n• 直接描述您的問題";
}

app.get("/health", (_req, res) => { res.json({ status: "ok" }); });
app.get("/", (_req, res) => { res.json({ name: "Customer Service Bot", status: "running", timestamp: new Date().toISOString() }); });

app.post("/webhook", middleware(config), async (req, res) => {
  const events: webhook.Event[] = (req.body as webhook.CallbackRequest).events;

  await Promise.all(
    events
      .filter((e): e is webhook.MessageEvent & { message: webhook.TextMessageContent } =>
        e.type === "message" && e.message.type === "text"
      )
      .map(async (event) => {
        const replyText = handleServiceMessage(event.message.text);
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

app.listen(PORT, "0.0.0.0", () => { console.log(\`Customer Service Bot running on http://localhost:\${PORT}\`); });
`;

export const LINEBOT_ECOMMERCE = `import express from "express";
import cors from "cors";
import { messagingApi, middleware, webhook, HTTPFetchError } from "@line/bot-sdk";

const PORT = parseInt(process.env.PORT || "3000", 10);
const config = { channelSecret: process.env.LINE_CHANNEL_SECRET || "" };
const clientConfig = { channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "" };
const client = new messagingApi.MessagingApiClient(clientConfig);
const app = express();

// Mock product catalog
const mockProducts = [
  { id: "P001", name: "經典白T恤", price: 590, category: "服飾", stock: 50, description: "100% 純棉，舒適透氣" },
  { id: "P002", name: "牛仔修身長褲", price: 1280, category: "服飾", stock: 30, description: "彈性丹寧布，修身剪裁" },
  { id: "P003", name: "真皮皮夾", price: 2480, category: "配件", stock: 15, description: "義大利進口真皮，多卡位設計" },
  { id: "P004", name: "運動休閒鞋", price: 1890, category: "鞋類", stock: 25, description: "輕量避震，適合日常穿搭" },
  { id: "P005", name: "防水後背包", price: 1650, category: "配件", stock: 20, description: "大容量防水設計，適合通勤" },
  { id: "P006", name: "棉質連帽外套", price: 980, category: "服飾", stock: 40, description: "柔軟刷毛內裡，保暖舒適" },
];

// Mock cart
const mockCart: Array<{ productId: string; qty: number }> = [];

function handleEcommerceMessage(text: string): string {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("商品") || lowerText.includes("產品") || lowerText.includes("目錄")) {
    let msg = "🛍️ 商品目錄\\n\\n";
    const categories = [...new Set(mockProducts.map(p => p.category))];
    categories.forEach(cat => {
      msg += \`【\${cat}】\\n\`;
      mockProducts.filter(p => p.category === cat).forEach(p => {
        msg += \`  \${p.id} \${p.name} - NT$ \${p.price.toLocaleString()}\\n\`;
      });
      msg += "\\n";
    });
    msg += "輸入商品編號（如 P001）查看詳情\\n輸入「購物車」查看已選商品";
    return msg;
  }

  if (lowerText.includes("購物") && lowerText.includes("車") || lowerText.includes("cart")) {
    if (mockCart.length === 0) return "🛒 您的購物車是空的\\n\\n輸入「商品」瀏覽商品目錄";
    let msg = "🛒 購物車內容\\n\\n";
    let total = 0;
    mockCart.forEach(item => {
      const product = mockProducts.find(p => p.id === item.productId);
      if (product) {
        const subtotal = product.price * item.qty;
        total += subtotal;
        msg += \`• \${product.name} x\${item.qty} = NT$ \${subtotal.toLocaleString()}\\n\`;
      }
    });
    msg += \`\\n合計：NT$ \${total.toLocaleString()}\\n\\n輸入「下單」完成訂購\`;
    return msg;
  }

  if (lowerText.includes("下單") || lowerText.includes("結帳") || lowerText.includes("訂購")) {
    if (mockCart.length === 0) return "⚠️ 購物車是空的，請先選購商品！\\n\\n輸入「商品」瀏覽商品目錄";
    let total = 0;
    mockCart.forEach(item => {
      const product = mockProducts.find(p => p.id === item.productId);
      if (product) total += product.price * item.qty;
    });
    const orderId = \`ORD-\${String(Math.floor(Math.random() * 9000) + 1000)}\`;
    mockCart.length = 0;
    return \`✅ 訂單建立成功！\\n\\n訂單編號：\${orderId}\\n訂單金額：NT$ \${total.toLocaleString()}\\n預計出貨：1-3 個工作天\\n\\n感謝您的訂購！輸入訂單編號可查詢出貨進度。\`;
  }

  if (lowerText.includes("查詢") || lowerText.includes("搜尋")) {
    return "🔍 請輸入以下關鍵字：\\n\\n• 「商品」- 瀏覽商品目錄\\n• 「購物車」- 查看已選商品\\n• 「下單」- 完成訂購\\n• 商品編號（如 P001）- 查看商品詳情";
  }

  if (lowerText.includes("熱銷") || lowerText.includes("推薦") || lowerText.includes("新品")) {
    const featured = mockProducts.slice(0, 3);
    let msg = "🔥 熱銷推薦\\n\\n";
    featured.forEach(p => {
      msg += \`⭐ \${p.name}\\n   NT$ \${p.price.toLocaleString()} | \${p.description}\\n   輸入 \${p.id} 查看詳情\\n\\n\`;
    });
    return msg;
  }

  // Check for product ID
  const productMatch = text.match(/P\\d{3}/i);
  if (productMatch) {
    const product = mockProducts.find(p => p.id === productMatch[0].toUpperCase());
    if (product) {
      mockCart.push({ productId: product.id, qty: 1 });
      return \`📦 \${product.name}\\n\\n價格：NT$ \${product.price.toLocaleString()}\\n分類：\${product.category}\\n說明：\${product.description}\\n庫存：\${product.stock > 0 ? \`有貨（剩餘 \${product.stock} 件）\` : "缺貨中"}\\n\\n✅ 已加入購物車！\\n輸入「購物車」查看 | 輸入「下單」結帳\`;
    }
    return "❌ 查無此商品編號，請輸入「商品」查看目錄。";
  }

  return "🛍️ 歡迎光臨線上商店！\\n\\n請輸入以下關鍵字：\\n• 「商品」- 瀏覽目錄\\n• 「熱銷」- 熱銷推薦\\n• 「購物車」- 查看購物車\\n• 「下單」- 完成訂購\\n• 商品編號 - 查看詳情並加入購物車";
}

app.get("/health", (_req, res) => { res.json({ status: "ok" }); });
app.get("/", (_req, res) => { res.json({ name: "E-commerce Bot", status: "running", timestamp: new Date().toISOString() }); });

app.post("/webhook", middleware(config), async (req, res) => {
  const events: webhook.Event[] = (req.body as webhook.CallbackRequest).events;

  await Promise.all(
    events
      .filter((e): e is webhook.MessageEvent & { message: webhook.TextMessageContent } =>
        e.type === "message" && e.message.type === "text"
      )
      .map(async (event) => {
        const replyText = handleEcommerceMessage(event.message.text);
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

app.listen(PORT, "0.0.0.0", () => { console.log(\`E-commerce Bot running on http://localhost:\${PORT}\`); });
`;

export const LINEBOT_ORDER_TRACKING = `import express from "express";
import cors from "cors";
import { messagingApi, middleware, webhook, HTTPFetchError } from "@line/bot-sdk";

const PORT = parseInt(process.env.PORT || "3000", 10);
const config = { channelSecret: process.env.LINE_CHANNEL_SECRET || "" };
const clientConfig = { channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "" };
const client = new messagingApi.MessagingApiClient(clientConfig);
const app = express();

// Mock order data
const mockOrders: Record<string, { status: string; items: string; total: number; date: string; tracking: string; eta: string }> = {
  "ORD-1001": { status: "shipped", items: "經典白T恤 x2, 牛仔長褲 x1", total: 2460, date: "2024-01-25", tracking: "TW123456789", eta: "2024-01-28" },
  "ORD-1002": { status: "processing", items: "真皮皮夾 x1", total: 2480, date: "2024-01-27", tracking: "", eta: "2024-01-31" },
  "ORD-1003": { status: "delivered", items: "運動休閒鞋 x1, 防水後背包 x1", total: 3540, date: "2024-01-20", tracking: "TW987654321", eta: "2024-01-23" },
  "ORD-1004": { status: "cancelled", items: "棉質連帽外套 x1", total: 980, date: "2024-01-22", tracking: "", eta: "" },
  "ORD-1005": { status: "shipped", items: "經典白T恤 x3", total: 1770, date: "2024-01-26", tracking: "TW555666777", eta: "2024-01-29" },
};

const statusLabels: Record<string, string> = {
  processing: "📦 處理中",
  shipped: "🚚 配送中",
  delivered: "✅ 已送達",
  cancelled: "❌ 已取消",
};

function handleOrderMessage(text: string): string {
  const lowerText = text.toLowerCase();

  // Check for order number
  const orderMatch = text.match(/ORD-\\d{4}/i);
  if (orderMatch) {
    const orderId = orderMatch[0].toUpperCase();
    const order = mockOrders[orderId];
    if (!order) return \`❌ 查無訂單 \${orderId}，請確認訂單編號後重新查詢。\\n\\n可查詢的訂單範例：ORD-1001 ~ ORD-1005\`;

    let msg = \`📋 訂單查詢結果\\n\\n訂單編號：\${orderId}\\n狀態：\${statusLabels[order.status]}\\n訂購日期：\${order.date}\\n商品：\${order.items}\\n訂單金額：NT$ \${order.total.toLocaleString()}\`;

    if (order.tracking) {
      msg += \`\\n物流單號：\${order.tracking}\`;
    }
    if (order.eta) {
      msg += \`\\n預計送達：\${order.eta}\`;
    }

    return msg;
  }

  if (lowerText.includes("訂單") && (lowerText.includes("列表") || lowerText.includes("全部") || lowerText.includes("清單"))) {
    let msg = "📋 所有訂單\\n\\n";
    Object.entries(mockOrders).forEach(([id, order]) => {
      msg += \`\${statusLabels[order.status]} \${id}\\n  \${order.items}\\n  NT$ \${order.total.toLocaleString()} | \${order.date}\\n\\n\`;
    });
    msg += "輸入訂單編號查看詳情";
    return msg;
  }

  if (lowerText.includes("配送") || lowerText.includes("物流") || lowerText.includes("出貨")) {
    const shipped = Object.entries(mockOrders).filter(([, o]) => o.status === "shipped");
    if (shipped.length === 0) return "📭 目前沒有配送中的訂單。";
    let msg = "🚚 配送中的訂單\\n\\n";
    shipped.forEach(([id, order]) => {
      msg += \`\${id}\\n  物流單號：\${order.tracking}\\n  預計送達：\${order.eta}\\n\\n\`;
    });
    return msg;
  }

  if (lowerText.includes("取消") || lowerText.includes("退訂")) {
    return "📝 取消訂單說明\\n\\n• 訂單處理中：可直接取消\\n• 已出貨：需等收到商品後申請退貨\\n• 已送達：7 天內可申請退貨退款\\n\\n請輸入訂單編號，我們將協助您處理。";
  }

  return "📦 訂單查詢機器人\\n\\n請輸入以下指令：\\n• 輸入訂單編號（如 ORD-1001）查詢狀態\\n• 「訂單列表」- 查看所有訂單\\n• 「配送」- 查看配送中訂單\\n• 「取消」- 取消訂單說明";
}

app.get("/health", (_req, res) => { res.json({ status: "ok" }); });
app.get("/", (_req, res) => { res.json({ name: "Order Tracking Bot", status: "running", timestamp: new Date().toISOString() }); });

app.post("/webhook", middleware(config), async (req, res) => {
  const events: webhook.Event[] = (req.body as webhook.CallbackRequest).events;

  await Promise.all(
    events
      .filter((e): e is webhook.MessageEvent & { message: webhook.TextMessageContent } =>
        e.type === "message" && e.message.type === "text"
      )
      .map(async (event) => {
        const replyText = handleOrderMessage(event.message.text);
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

app.listen(PORT, "0.0.0.0", () => { console.log(\`Order Tracking Bot running on http://localhost:\${PORT}\`); });
`;
