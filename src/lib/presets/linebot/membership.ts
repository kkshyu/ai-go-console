import type { PresetOverlay } from "../index";

export const LINEBOT_MEMBERSHIP: PresetOverlay = {
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

// ===== 會員等級定義 =====
interface TierInfo {
  name: string;
  icon: string;
  minPoints: number;
  discount: number;
  pointMultiplier: number;
  perks: string[];
}

const tiers: Record<string, TierInfo> = {
  bronze: {
    name: "銅卡會員",
    icon: "🥉",
    minPoints: 0,
    discount: 95,
    pointMultiplier: 1,
    perks: ["消費 NT$1 = 1 點", "生日禮 95 折券"],
  },
  silver: {
    name: "銀卡會員",
    icon: "🥈",
    minPoints: 3000,
    discount: 90,
    pointMultiplier: 1.5,
    perks: ["消費 NT$1 = 1.5 點", "生日禮 9 折券", "每月免運券 x1"],
  },
  gold: {
    name: "金卡會員",
    icon: "🥇",
    minPoints: 10000,
    discount: 85,
    pointMultiplier: 2,
    perks: ["消費 NT$1 = 2 點", "生日禮 85 折券", "每月免運券 x2", "新品搶先購"],
  },
  platinum: {
    name: "白金卡會員",
    icon: "💎",
    minPoints: 30000,
    discount: 80,
    pointMultiplier: 3,
    perks: ["消費 NT$1 = 3 點", "生日禮 8 折券", "無限免運", "新品搶先購", "專屬客服", "年度禮盒"],
  },
};

// ===== Mock 會員資料 =====
interface Member {
  id: string;
  name: string;
  phone: string;
  tier: string;
  points: number;
  totalSpent: number;
  joinDate: string;
}

const members: Member[] = [
  { id: "M001", name: "林雅婷", phone: "0912-345-678", tier: "gold", points: 12580, totalSpent: 45200, joinDate: "2024-06-15" },
  { id: "M002", name: "陳建宏", phone: "0923-456-789", tier: "silver", points: 4320, totalSpent: 18500, joinDate: "2025-01-20" },
  { id: "M003", name: "王美玲", phone: "0934-567-890", tier: "platinum", points: 38900, totalSpent: 125000, joinDate: "2023-03-10" },
  { id: "M004", name: "張志明", phone: "0945-678-901", tier: "bronze", points: 1250, totalSpent: 5800, joinDate: "2025-11-05" },
  { id: "M005", name: "李佳穎", phone: "0956-789-012", tier: "gold", points: 15200, totalSpent: 52000, joinDate: "2024-02-28" },
];

// ===== Mock 點數交易記錄 =====
interface PointTransaction {
  memberId: string;
  date: string;
  type: "earn" | "redeem" | "expire" | "bonus";
  points: number;
  description: string;
}

const pointTransactions: PointTransaction[] = [
  { memberId: "M001", date: "2026-03-28", type: "earn", points: 360, description: "消費 NT$1,800 於台北忠孝店" },
  { memberId: "M001", date: "2026-03-25", type: "redeem", points: -500, description: "兌換 NT$50 折價券" },
  { memberId: "M001", date: "2026-03-20", type: "earn", points: 240, description: "消費 NT$1,200 於線上商城" },
  { memberId: "M001", date: "2026-03-15", type: "bonus", points: 1000, description: "三月會員活動加碼點數" },
  { memberId: "M001", date: "2026-03-10", type: "earn", points: 500, description: "消費 NT$2,500 於台中中港店" },
  { memberId: "M001", date: "2026-03-01", type: "expire", points: -200, description: "逾期點數失效" },
  { memberId: "M003", date: "2026-03-27", type: "earn", points: 1500, description: "消費 NT$5,000 於線上商城" },
  { memberId: "M003", date: "2026-03-22", type: "redeem", points: -3000, description: "兌換限量禮盒組" },
  { memberId: "M003", date: "2026-03-18", type: "bonus", points: 2000, description: "白金卡會員月度獎勵" },
  { memberId: "M005", date: "2026-03-26", type: "earn", points: 800, description: "消費 NT$4,000 於高雄夢時代店" },
  { memberId: "M005", date: "2026-03-20", type: "redeem", points: -1200, description: "兌換精油按摩體驗券" },
];

// ===== Mock 獎勵兌換目錄 =====
interface Reward {
  id: string;
  name: string;
  pointsCost: number;
  category: string;
  stock: number;
  description: string;
}

const rewards: Reward[] = [
  { id: "R001", name: "NT$50 折價券", pointsCost: 500, category: "折價券", stock: 999, description: "全館消費滿 NT$500 可使用" },
  { id: "R002", name: "NT$100 折價券", pointsCost: 900, category: "折價券", stock: 500, description: "全館消費滿 NT$1,000 可使用" },
  { id: "R003", name: "NT$200 折價券", pointsCost: 1600, category: "折價券", stock: 300, description: "全館消費滿 NT$2,000 可使用" },
  { id: "R004", name: "免運券（1張）", pointsCost: 300, category: "優惠券", stock: 800, description: "單筆訂單免運費" },
  { id: "R005", name: "精油按摩體驗券", pointsCost: 1200, category: "體驗券", stock: 50, description: "可兌換 40 分鐘肩頸精油按摩" },
  { id: "R006", name: "玻尿酸精華液旅行組", pointsCost: 2000, category: "商品", stock: 100, description: "15ml x 3 旅行組" },
  { id: "R007", name: "限量禮盒組", pointsCost: 3000, category: "商品", stock: 30, description: "精華液＋面膜＋乳霜三件禮盒" },
  { id: "R008", name: "年度 VIP 體驗日入場券", pointsCost: 5000, category: "活動", stock: 20, description: "含全套護膚體驗＋下午茶" },
];

// ===== Mock 優惠券 =====
interface Coupon {
  memberId: string;
  code: string;
  name: string;
  discount: string;
  validUntil: string;
  used: boolean;
}

const coupons: Coupon[] = [
  { memberId: "M001", code: "BDAY2026MAR", name: "生日禮 85 折券", discount: "85 折", validUntil: "2026-04-30", used: false },
  { memberId: "M001", code: "SPRING50", name: "春季 NT$50 折價券", discount: "折 NT$50", validUntil: "2026-04-15", used: false },
  { memberId: "M001", code: "FREESHIP03", name: "三月免運券", discount: "免運", validUntil: "2026-03-31", used: true },
  { memberId: "M003", code: "BDAY2026JUN", name: "生日禮 8 折券", discount: "8 折", validUntil: "2026-07-31", used: false },
  { memberId: "M003", code: "PLAT2026Q1", name: "白金季度禮券", discount: "折 NT$300", validUntil: "2026-04-30", used: false },
  { memberId: "M005", code: "BDAY2026FEB", name: "生日禮 85 折券", discount: "85 折", validUntil: "2026-03-31", used: false },
];

// ===== 找到下一個等級門檻 =====
function getNextTier(currentTier: string): TierInfo | null {
  const tierOrder = ["bronze", "silver", "gold", "platinum"];
  const idx = tierOrder.indexOf(currentTier);
  if (idx < tierOrder.length - 1) return tiers[tierOrder[idx + 1]];
  return null;
}

// ===== 尋找會員 =====
function findMember(keyword: string): Member | undefined {
  const cleanPhone = keyword.replace(/-/g, "");
  return members.find(
    m => m.id === keyword.toUpperCase() || m.phone.replace(/-/g, "") === cleanPhone || m.name === keyword
  );
}

// ===== 訊息處理邏輯 =====
function handleMessage(text: string): string {
  const lowerText = text.trim();

  // 查詢會員狀態：會員 0912345678
  const memberMatch = lowerText.match(/會員\\s+(\\S+)/);
  if (memberMatch || lowerText === "會員") {
    // 如果只輸入「會員」，用預設第一位
    const keyword = memberMatch ? memberMatch[1] : "M001";
    const member = findMember(keyword);
    if (!member) return "❌ 查無此會員資料，請確認手機號碼或會員編號。";

    const tier = tiers[member.tier];
    const nextTier = getNextTier(member.tier);

    let msg = \`\${tier.icon} \${tier.name}｜會員資訊\\n\\n\`;
    msg += \`👤 姓名：\${member.name}\\n\`;
    msg += \`🆔 會員編號：\${member.id}\\n\`;
    msg += \`⭐ 目前點數：\${member.points.toLocaleString()} 點\\n\`;
    msg += \`💰 累計消費：NT$\${member.totalSpent.toLocaleString()}\\n\`;
    msg += \`📅 入會日期：\${member.joinDate}\\n\`;
    msg += \`🎯 點數倍率：\${tier.pointMultiplier}x\\n\\n\`;

    msg += "🎁 會員權益：\\n";
    tier.perks.forEach(p => { msg += \`  • \${p}\\n\`; });

    if (nextTier) {
      const pointsNeeded = nextTier.minPoints - member.points;
      msg += \`\\n📈 距離升級 \${nextTier.icon}\${nextTier.name} 還需 \${pointsNeeded.toLocaleString()} 點\`;
    } else {
      msg += "\\n🏆 您已是最高等級會員！";
    }

    return msg;
  }

  // 查詢點數紀錄
  if (lowerText.includes("點數紀錄") || lowerText.includes("點數歷史") || lowerText.includes("交易紀錄")) {
    const member = members[0]; // 預設顯示第一位
    const transactions = pointTransactions.filter(t => t.memberId === member.id).slice(0, 8);

    let msg = \`📊 \${member.name} 的點數紀錄\\n\\n\`;
    transactions.forEach(t => {
      const typeMap = { earn: "✅ 獲得", redeem: "🔄 兌換", expire: "⏰ 失效", bonus: "🎁 獎勵" };
      const sign = t.points > 0 ? "+" : "";
      msg += \`\${typeMap[t.type]} \${sign}\${t.points.toLocaleString()} 點\\n  \${t.date} | \${t.description}\\n\\n\`;
    });
    msg += \`目前餘額：\${member.points.toLocaleString()} 點\`;
    return msg;
  }

  // 獎勵兌換目錄
  if (lowerText.includes("獎勵") || lowerText.includes("兌換") || lowerText.includes("目錄") || lowerText.includes("商城")) {
    // 如果是兌換指令：兌換 R001
    const redeemMatch = lowerText.match(/兌換\\s+(R\\d{3})/i);
    if (redeemMatch) {
      const rewardId = redeemMatch[1].toUpperCase();
      const reward = rewards.find(r => r.id === rewardId);
      if (!reward) return "❌ 找不到此獎勵編號，請輸入【獎勵】查看目錄。";

      const member = members[0];
      if (member.points < reward.pointsCost) {
        return \`❌ 點數不足！\\n\\n🎁 \${reward.name} 需要 \${reward.pointsCost.toLocaleString()} 點\\n⭐ 您目前有 \${member.points.toLocaleString()} 點\\n📉 還差 \${(reward.pointsCost - member.points).toLocaleString()} 點\`;
      }

      if (reward.stock <= 0) return \`😔 \${reward.name} 目前已兌換完畢，請選擇其他獎勵。\`;

      member.points -= reward.pointsCost;
      reward.stock--;

      return \`✅ 兌換成功！\\n\\n🎁 \${reward.name}\\n💎 扣除 \${reward.pointsCost.toLocaleString()} 點\\n⭐ 剩餘點數：\${member.points.toLocaleString()} 點\\n\\n📝 \${reward.description}\\n\\n兌換項目將於 3 個工作天內送達您的帳戶。\`;
    }

    let msg = "🎁 獎勵兌換目錄\\n\\n";

    const categories = [...new Set(rewards.map(r => r.category))];
    categories.forEach(cat => {
      msg += \`【\${cat}】\\n\`;
      rewards.filter(r => r.category === cat).forEach(r => {
        const stockLabel = r.stock <= 10 ? "（即將售罄）" : "";
        msg += \`  \${r.id} \${r.name}\\n    \${r.pointsCost.toLocaleString()} 點 | 剩餘 \${r.stock} 份\${stockLabel}\\n\`;
      });
      msg += "\\n";
    });

    msg += "輸入【兌換 獎勵編號】進行兌換\\n範例：兌換 R001";
    return msg;
  }

  // 優惠券查詢
  if (lowerText.includes("優惠券") || lowerText.includes("折價券") || lowerText.includes("coupon")) {
    const member = members[0];
    const memberCoupons = coupons.filter(c => c.memberId === member.id);

    if (memberCoupons.length === 0) return "📭 您目前沒有可用的優惠券。\\n\\n可使用點數兌換折價券，輸入【獎勵】查看。";

    let msg = \`🎫 \${member.name} 的優惠券\\n\\n\`;
    const active = memberCoupons.filter(c => !c.used);
    const used = memberCoupons.filter(c => c.used);

    if (active.length > 0) {
      msg += "✅ 可使用：\\n";
      active.forEach(c => {
        msg += \`  🎫 \${c.name}\\n    優惠：\${c.discount} | 有效期至 \${c.validUntil}\\n    代碼：\${c.code}\\n\\n\`;
      });
    }

    if (used.length > 0) {
      msg += "⬜ 已使用：\\n";
      used.forEach(c => {
        msg += \`  \${c.name}（\${c.code}）\\n\`;
      });
    }

    return msg.trim();
  }

  // 等級說明
  if (lowerText.includes("等級") || lowerText.includes("tier") || lowerText.includes("升級")) {
    let msg = "🏆 會員等級制度\\n\\n";
    Object.values(tiers).forEach(t => {
      msg += \`\${t.icon} \${t.name}\\n\`;
      msg += \`  門檻：\${t.minPoints.toLocaleString()} 點以上\\n\`;
      msg += \`  折扣：\${t.discount} 折 | 點數倍率：\${t.pointMultiplier}x\\n\`;
      msg += \`  權益：\${t.perks.join("、")}\\n\\n\`;
    });
    msg += "💡 累計點數達到門檻即自動升等！";
    return msg;
  }

  // 問候語
  if (["你好", "hi", "hello", "哈囉", "嗨"].some(g => lowerText.includes(g))) {
    return "⭐ 歡迎使用璀璨美學會員系統！\\n\\n我可以協助您：\\n\\n👤 【會員 手機號碼】查詢會員資訊\\n📊 【點數紀錄】查看點數歷史\\n🎁 【獎勵】瀏覽獎勵兌換目錄\\n🔄 【兌換 獎勵編號】兌換獎勵\\n🎫 【優惠券】查看可用優惠券\\n🏆 【等級】了解會員等級制度\\n\\n快來查看您的會員福利吧！";
  }

  // 預設回覆
  return "⭐ 璀璨美學｜會員集點系統\\n\\n請選擇以下功能：\\n\\n👤 【會員】查詢會員狀態與點數\\n📊 【點數紀錄】查看點數交易歷史\\n🎁 【獎勵】瀏覽兌換目錄\\n🔄 【兌換 R001】兌換獎勵\\n🎫 【優惠券】查看可用折價券\\n🏆 【等級】了解升等制度\\n\\n輸入任意關鍵字開始查詢！";
}

// ===== Express 路由設定 =====
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (_req, res) => {
  res.json({
    name: "璀璨美學會員集點機器人",
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
  console.log(\`璀璨美學會員集點機器人已啟動：http://localhost:\${PORT}\`);
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
      category: "built_in_pg",
      suggestedTypes: ["built_in_pg"],
      purpose: "會員資料與點數儲存",
      optional: true,
    },
  ],
};
