export const REALESTATE_LISTING_PAGE = `"use client";
import { useState } from "react";

const initialListings = [
  { id: 1, title: "信義區豪華三房", type: "sell", propertyType: "apartment", address: "台北市信義區松仁路88號12樓", area: 45.6, rooms: 3, price: 38800000, floor: "12/28", age: 8, status: "active", owner: "王先生", ownerPhone: "0912-111-222", createdAt: "2024-03-01" },
  { id: 2, title: "中山區精裝套房", type: "rent", propertyType: "apartment", address: "台北市中山區南京東路二段15號5樓", area: 12.3, rooms: 1, price: 18000, floor: "5/12", age: 15, status: "active", owner: "陳小姐", ownerPhone: "0923-333-444", createdAt: "2024-03-05" },
  { id: 3, title: "大安區電梯華廈", type: "sell", propertyType: "apartment", address: "台北市大安區復興南路一段200號8樓", area: 38.2, rooms: 3, price: 32500000, floor: "8/14", age: 20, status: "reserved", owner: "林太太", ownerPhone: "0934-555-666", createdAt: "2024-02-20" },
  { id: 4, title: "內湖科技園區辦公室", type: "rent", propertyType: "office", address: "台北市內湖區瑞光路513巷22號3樓", area: 65.0, rooms: 0, price: 55000, floor: "3/8", age: 10, status: "active", owner: "張董", ownerPhone: "0945-777-888", createdAt: "2024-03-10" },
  { id: 5, title: "新店透天別墅", type: "sell", propertyType: "house", address: "新北市新店區中正路120號", area: 85.0, rooms: 5, price: 52000000, floor: "1-4/4", age: 5, status: "active", owner: "劉先生", ownerPhone: "0956-999-000", createdAt: "2024-03-12" },
  { id: 6, title: "板橋新埔捷運宅", type: "sell", propertyType: "apartment", address: "新北市板橋區民生路三段50號15樓", area: 28.5, rooms: 2, price: 16800000, floor: "15/22", age: 3, status: "sold", owner: "黃小姐", ownerPhone: "0967-111-333", createdAt: "2024-01-15" },
];

const typeLabels: Record<string, string> = { sell: "售", rent: "租" };
const typeColors: Record<string, string> = { sell: "bg-red-100 text-red-800", rent: "bg-blue-100 text-blue-800" };
const statusLabels: Record<string, string> = { active: "刊登中", reserved: "斡旋中", sold: "已成交", rented: "已出租", inactive: "下架" };
const statusColors: Record<string, string> = { active: "bg-green-100 text-green-800", reserved: "bg-yellow-100 text-yellow-800", sold: "bg-gray-100 text-gray-500", rented: "bg-gray-100 text-gray-500", inactive: "bg-gray-100 text-gray-400" };
const propertyTypeLabels: Record<string, string> = { apartment: "公寓/大樓", house: "透天", office: "辦公", land: "土地", store: "店面" };

export default function Home() {
  const [listings, setListings] = useState(initialListings);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", type: "sell", propertyType: "apartment", address: "", area: "", rooms: "", price: "", floor: "", age: "", owner: "", ownerPhone: "" });

  const filtered = listings
    .filter((l) => filterType === "all" || l.type === filterType)
    .filter((l) => filterStatus === "all" || l.status === filterStatus)
    .filter((l) => l.title.includes(search) || l.address.includes(search) || l.owner.includes(search));

  const activeCount = listings.filter((l) => l.status === "active").length;
  const sellTotal = listings.filter((l) => l.type === "sell" && l.status !== "sold").reduce((s, l) => s + l.price, 0);
  const soldCount = listings.filter((l) => l.status === "sold" || l.status === "rented").length;

  const handleAdd = () => {
    if (!form.title || !form.address) return;
    setListings([...listings, {
      id: listings.length + 1, title: form.title, type: form.type, propertyType: form.propertyType,
      address: form.address, area: Number(form.area) || 0, rooms: Number(form.rooms) || 0,
      price: Number(form.price) || 0, floor: form.floor, age: Number(form.age) || 0,
      status: "active", owner: form.owner, ownerPhone: form.ownerPhone, createdAt: new Date().toISOString().slice(0, 10),
    }]);
    setForm({ title: "", type: "sell", propertyType: "apartment", address: "", area: "", rooms: "", price: "", floor: "", age: "", owner: "", ownerPhone: "" });
    setShowForm(false);
  };

  const detail = selected !== null ? listings.find((l) => l.id === selected) : null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">物件管理系統</h1>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">刊登中物件</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">待售總金額</p>
            <p className="text-2xl font-bold text-blue-600">NT$ {(sellTotal / 10000).toLocaleString()} 萬</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">已成交</p>
            <p className="text-2xl font-bold text-gray-900">{soldCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">物件總數</p>
            <p className="text-2xl font-bold text-gray-900">{listings.length}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <input placeholder="搜尋物件名稱、地址或屋主..." value={search} onChange={(e) => setSearch(e.target.value)} className="border rounded-lg px-3 py-2 text-sm flex-1 max-w-xs" />
          <div className="flex gap-2">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="all">租售</option>
              <option value="sell">售</option>
              <option value="rent">租</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="all">所有狀態</option>
              {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap">＋ 新增物件</button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h3 className="font-semibold mb-3">新增物件</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input placeholder="物件名稱" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                <option value="sell">售</option><option value="rent">租</option>
              </select>
              <select value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                {Object.entries(propertyTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input placeholder="地址" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
              <input placeholder="坪數" type="number" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="房數" type="number" value={form.rooms} onChange={(e) => setForm({ ...form, rooms: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="價格" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="樓層" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="屋齡" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="屋主姓名" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="屋主電話" value={form.ownerPhone} onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleAdd} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">新增</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">取消</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">物件</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">類型</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">坪數</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">價格</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((l) => (
                  <tr key={l.id} onClick={() => setSelected(l.id)} className={\`hover:bg-blue-50 cursor-pointer \${selected === l.id ? "bg-blue-50" : ""}\`}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{l.title}</p>
                      <p className="text-xs text-gray-500">{l.address}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={\`px-2 py-0.5 rounded-full text-xs font-medium \${typeColors[l.type]}\`}>{typeLabels[l.type]}</span>
                      <span className="text-xs text-gray-500 ml-1">{propertyTypeLabels[l.propertyType]}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{l.area} 坪</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {l.type === "sell" ? \`\${(l.price / 10000).toLocaleString()} 萬\` : \`NT$ \${l.price.toLocaleString()}/月\`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={\`px-2 py-0.5 rounded-full text-xs font-medium \${statusColors[l.status]}\`}>{statusLabels[l.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            {detail ? (
              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-3">{detail.title}</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-500">地址：</span>{detail.address}</p>
                  <p><span className="text-gray-500">類型：</span>{propertyTypeLabels[detail.propertyType]} / {typeLabels[detail.type]}</p>
                  <p><span className="text-gray-500">坪數：</span>{detail.area} 坪</p>
                  <p><span className="text-gray-500">格局：</span>{detail.rooms} 房</p>
                  <p><span className="text-gray-500">樓層：</span>{detail.floor}</p>
                  <p><span className="text-gray-500">屋齡：</span>{detail.age} 年</p>
                  <p><span className="text-gray-500">價格：</span>{detail.type === "sell" ? \`\${(detail.price / 10000).toLocaleString()} 萬\` : \`NT$ \${detail.price.toLocaleString()}/月\`}</p>
                  <hr className="my-3" />
                  <p className="font-medium text-gray-700">屋主資訊</p>
                  <p><span className="text-gray-500">姓名：</span>{detail.owner}</p>
                  <p><span className="text-gray-500">電話：</span>{detail.ownerPhone}</p>
                  <p><span className="text-gray-500">刊登日期：</span>{detail.createdAt}</p>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-12">
                <p>點擊左側物件查看詳細資訊</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}`;

export const REALESTATE_CLIENT_MATCHING_PAGE = `"use client";
import { useState } from "react";

const initialClients = [
  { id: 1, name: "陳大文", phone: "0912-222-333", email: "chen@email.com", budget: 30000000, type: "buy", preferArea: "信義區, 大安區", preferRooms: 3, preferSize: "30-50坪", notes: "需要停車位，近捷運", status: "active", createdAt: "2024-03-01" },
  { id: 2, name: "林美惠", phone: "0923-444-555", email: "lin@email.com", budget: 20000, type: "rent", preferArea: "中山區", preferRooms: 1, preferSize: "10-15坪", notes: "學生，預算有限", status: "active", createdAt: "2024-03-05" },
  { id: 3, name: "張家豪", phone: "0934-666-777", email: "zhang@email.com", budget: 50000000, type: "buy", preferArea: "大安區", preferRooms: 4, preferSize: "50坪以上", notes: "投資客，要全新建案", status: "active", createdAt: "2024-03-08" },
  { id: 4, name: "王曉薇", phone: "0945-888-999", email: "wang@email.com", budget: 35000, type: "rent", preferArea: "內湖區, 南港區", preferRooms: 2, preferSize: "20-30坪", notes: "近科技園區，需有管理員", status: "matched", createdAt: "2024-02-28" },
  { id: 5, name: "劉志明", phone: "0956-000-111", email: "liu@email.com", budget: 18000000, type: "buy", preferArea: "板橋, 新店", preferRooms: 3, preferSize: "25-35坪", notes: "首購族，希望近學校", status: "active", createdAt: "2024-03-15" },
];

const initialMatchHistory = [
  { id: 1, clientId: 4, clientName: "王曉薇", listing: "內湖科技園區旁兩房", date: "2024-03-12", result: "interested", feedback: "格局不錯但希望租金再低一些" },
  { id: 2, clientId: 1, clientName: "陳大文", listing: "信義區豪華三房", date: "2024-03-16", result: "viewing", feedback: "預約週六看屋" },
  { id: 3, clientId: 3, clientName: "張家豪", listing: "大安區電梯華廈", date: "2024-03-10", result: "rejected", feedback: "屋齡太老，不考慮" },
];

const statusLabels: Record<string, string> = { active: "尋找中", matched: "已配對", closed: "已結案" };
const statusColors: Record<string, string> = { active: "bg-green-100 text-green-800", matched: "bg-blue-100 text-blue-800", closed: "bg-gray-100 text-gray-500" };
const resultLabels: Record<string, string> = { interested: "有興趣", viewing: "預約看屋", rejected: "不考慮", negotiating: "議價中", deal: "成交" };
const resultColors: Record<string, string> = { interested: "bg-yellow-100 text-yellow-800", viewing: "bg-blue-100 text-blue-800", rejected: "bg-red-100 text-red-800", negotiating: "bg-purple-100 text-purple-800", deal: "bg-green-100 text-green-800" };

export default function Home() {
  const [clients] = useState(initialClients);
  const [matchHistory] = useState(initialMatchHistory);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedClient, setSelectedClient] = useState<number | null>(null);

  const filtered = clients
    .filter((c) => filterType === "all" || c.type === filterType)
    .filter((c) => c.name.includes(search) || c.preferArea.includes(search));

  const activeClients = clients.filter((c) => c.status === "active").length;
  const buyClients = clients.filter((c) => c.type === "buy").length;
  const rentClients = clients.filter((c) => c.type === "rent").length;

  const detail = selectedClient !== null ? clients.find((c) => c.id === selectedClient) : null;
  const clientMatches = selectedClient !== null ? matchHistory.filter((m) => m.clientId === selectedClient) : [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">客戶配對系統</h1>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">活躍客戶</p>
            <p className="text-2xl font-bold text-green-600">{activeClients}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">購屋需求</p>
            <p className="text-2xl font-bold text-red-600">{buyClients}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">租屋需求</p>
            <p className="text-2xl font-bold text-blue-600">{rentClients}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">配對紀錄</p>
            <p className="text-2xl font-bold text-gray-900">{matchHistory.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <input placeholder="搜尋客戶或偏好區域..." value={search} onChange={(e) => setSearch(e.target.value)} className="border rounded-lg px-3 py-2 text-sm flex-1 max-w-xs" />
          <div className="flex gap-2">
            {["all", "buy", "rent"].map((t) => (
              <button key={t} onClick={() => setFilterType(t)} className={\`px-3 py-1 rounded-full text-sm \${filterType === t ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}\`}>
                {t === "all" ? "全部" : t === "buy" ? "購屋" : "租屋"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-3">
            {filtered.map((c) => (
              <div key={c.id} onClick={() => setSelectedClient(c.id)} className={\`bg-white rounded-lg shadow p-4 cursor-pointer border-2 transition-colors \${selectedClient === c.id ? "border-blue-500" : "border-transparent hover:border-blue-200"}\`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{c.name}</span>
                  <span className={\`px-2 py-0.5 rounded-full text-xs font-medium \${statusColors[c.status]}\`}>{statusLabels[c.status]}</span>
                </div>
                <p className="text-sm text-gray-500">
                  <span className={\`inline-block px-1.5 py-0.5 rounded text-xs mr-2 \${c.type === "buy" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}\`}>{c.type === "buy" ? "買" : "租"}</span>
                  {c.preferArea} / {c.preferRooms}房 / {c.preferSize}
                </p>
                <p className="text-sm font-medium text-gray-700 mt-1">
                  預算：{c.type === "buy" ? \`\${(c.budget / 10000).toLocaleString()} 萬\` : \`NT$ \${c.budget.toLocaleString()}/月\`}
                </p>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            {detail ? (
              <div className="space-y-4">
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="font-semibold text-lg text-gray-900 mb-3">客戶資料 — {detail.name}</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <p><span className="text-gray-500">電話：</span>{detail.phone}</p>
                    <p><span className="text-gray-500">Email：</span>{detail.email}</p>
                    <p><span className="text-gray-500">需求：</span>{detail.type === "buy" ? "購屋" : "租屋"}</p>
                    <p><span className="text-gray-500">預算：</span>{detail.type === "buy" ? \`\${(detail.budget / 10000).toLocaleString()} 萬\` : \`NT$ \${detail.budget.toLocaleString()}/月\`}</p>
                    <p><span className="text-gray-500">偏好區域：</span>{detail.preferArea}</p>
                    <p><span className="text-gray-500">偏好格局：</span>{detail.preferRooms} 房 / {detail.preferSize}</p>
                    <p className="col-span-2"><span className="text-gray-500">備註：</span>{detail.notes}</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">配對紀錄</h3>
                  {clientMatches.length > 0 ? (
                    <div className="space-y-3">
                      {clientMatches.map((m) => (
                        <div key={m.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm text-gray-900">{m.listing}</span>
                            <span className={\`px-2 py-0.5 rounded-full text-xs font-medium \${resultColors[m.result]}\`}>{resultLabels[m.result]}</span>
                          </div>
                          <p className="text-xs text-gray-500">{m.date}</p>
                          <p className="text-sm text-gray-600 mt-1">{m.feedback}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">尚無配對紀錄</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
                <p>點擊左側客戶查看詳細資訊與配對紀錄</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}`;

export const REALESTATE_COMMISSION_PAGE = `"use client";
import { useState } from "react";

const initialDeals = [
  { id: 1, listing: "信義區豪華三房", client: "陳大文", type: "sell", dealPrice: 38500000, commissionRate: 2, commission: 770000, agentShare: 60, status: "settled", dealDate: "2024-02-15", settleDate: "2024-03-01" },
  { id: 2, listing: "中山區精裝套房", client: "林美惠", type: "rent", dealPrice: 18000, commissionRate: 100, commission: 18000, agentShare: 50, status: "pending", dealDate: "2024-03-10", settleDate: null },
  { id: 3, listing: "新店透天別墅", client: "劉先生", type: "sell", dealPrice: 51000000, commissionRate: 2, commission: 1020000, agentShare: 60, status: "settled", dealDate: "2024-01-20", settleDate: "2024-02-10" },
  { id: 4, listing: "板橋新埔捷運宅", client: "黃小姐", type: "sell", dealPrice: 16500000, commissionRate: 2, commission: 330000, agentShare: 55, status: "pending", dealDate: "2024-03-18", settleDate: null },
  { id: 5, listing: "內湖辦公室", client: "張董", type: "rent", dealPrice: 55000, commissionRate: 100, commission: 55000, agentShare: 50, status: "settled", dealDate: "2024-03-05", settleDate: "2024-03-20" },
];

const statusLabels: Record<string, string> = { pending: "待撥款", settled: "已入帳", cancelled: "已取消" };
const statusColors: Record<string, string> = { pending: "bg-yellow-100 text-yellow-800", settled: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800" };

export default function Home() {
  const [deals] = useState(initialDeals);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");

  const filtered = deals
    .filter((d) => filterStatus === "all" || d.status === filterStatus)
    .filter((d) => filterMonth === "all" || d.dealDate.startsWith(filterMonth));

  const totalCommission = deals.reduce((s, d) => s + d.commission, 0);
  const myEarnings = deals.reduce((s, d) => s + Math.round(d.commission * d.agentShare / 100), 0);
  const pendingAmount = deals.filter((d) => d.status === "pending").reduce((s, d) => s + Math.round(d.commission * d.agentShare / 100), 0);
  const settledAmount = deals.filter((d) => d.status === "settled").reduce((s, d) => s + Math.round(d.commission * d.agentShare / 100), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">佣金追蹤系統</h1>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">總佣金收入</p>
            <p className="text-2xl font-bold text-blue-600">NT$ {totalCommission.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">個人分潤</p>
            <p className="text-2xl font-bold text-green-600">NT$ {myEarnings.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">待撥款</p>
            <p className="text-2xl font-bold text-yellow-600">NT$ {pendingAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">已入帳</p>
            <p className="text-2xl font-bold text-gray-900">NT$ {settledAmount.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="all">所有狀態</option>
            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="all">所有月份</option>
            <option value="2024-03">2024 年 3 月</option>
            <option value="2024-02">2024 年 2 月</option>
            <option value="2024-01">2024 年 1 月</option>
          </select>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">成交物件</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">客戶</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">類型</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">成交金額</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">佣金</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">分潤比</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">個人分潤</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((d) => {
                const myShare = Math.round(d.commission * d.agentShare / 100);
                return (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{d.listing}</p>
                      <p className="text-xs text-gray-500">{d.dealDate}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.client}</td>
                    <td className="px-4 py-3">
                      <span className={\`px-2 py-0.5 rounded-full text-xs font-medium \${d.type === "sell" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}\`}>
                        {d.type === "sell" ? "買賣" : "租賃"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {d.type === "sell" ? \`\${(d.dealPrice / 10000).toLocaleString()} 萬\` : \`NT$ \${d.dealPrice.toLocaleString()}/月\`}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">NT$ {d.commission.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.agentShare}%</td>
                    <td className="px-4 py-3 text-sm font-medium text-green-600">NT$ {myShare.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={\`px-2 py-0.5 rounded-full text-xs font-medium \${statusColors[d.status]}\`}>{statusLabels[d.status]}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}`;

export const REALESTATE_OWNER_NEGOTIATION_PAGE = `"use client";
import { useState } from "react";

const initialOwners = [
  { id: 1, name: "王建國", phone: "0912-111-222", address: "台北市信義區松仁路88號12樓", propertyType: "apartment", area: 45.6, rooms: 3, floor: "12/28", age: 8, ownerAskingPrice: 42000000, marketPrice: 38800000, source: "陌生開發", status: "negotiating", lastVisit: "2024-03-18", nextFollowUp: "2024-03-25", notes: "屋主想賣 4200 萬，市場行情約 3880 萬，可再談" },
  { id: 2, name: "陳淑芬", phone: "0923-333-444", address: "台北市大安區復興南路一段200號8樓", propertyType: "apartment", area: 38.2, rooms: 3, floor: "8/14", age: 20, ownerAskingPrice: 35000000, marketPrice: 32500000, source: "轉介紹", status: "signed", lastVisit: "2024-03-10", nextFollowUp: null, notes: "已簽專任委託 3 個月，服務費 2%" },
  { id: 3, name: "張志明", phone: "0934-555-666", address: "新北市新店區中正路120號", propertyType: "house", area: 85.0, rooms: 5, floor: "1-4/4", age: 5, ownerAskingPrice: 55000000, marketPrice: 52000000, source: "591 回撥", status: "first-contact", lastVisit: "2024-03-20", nextFollowUp: "2024-03-22", notes: "屋主自售中，對委託仲介有興趣，約週五拜訪" },
  { id: 4, name: "李美華", phone: "0945-777-888", address: "新北市板橋區民生路三段50號15樓", propertyType: "apartment", area: 28.5, rooms: 2, floor: "15/22", age: 3, ownerAskingPrice: 18500000, marketPrice: 16800000, source: "社區駐點", status: "follow-up", lastVisit: "2024-03-15", nextFollowUp: "2024-03-23", notes: "因工作調動想賣，但還在猶豫，需持續跟進" },
  { id: 5, name: "劉大偉", phone: "0956-999-000", address: "台北市中山區南京東路二段15號5樓", propertyType: "apartment", area: 12.3, rooms: 1, floor: "5/12", age: 15, ownerAskingPrice: 9500000, marketPrice: 8800000, source: "舊客戶", status: "rejected", lastVisit: "2024-03-08", nextFollowUp: null, notes: "暫不考慮出售，半年後再聯繫" },
];

const initialVisitLogs = [
  { id: 1, ownerId: 1, date: "2024-03-18", type: "拜訪", content: "第三次拜訪，帶了最新實價登錄資料，屋主對 3900 萬有鬆動，但希望至少 4000 萬成交", result: "持續談" },
  { id: 2, ownerId: 1, date: "2024-03-10", type: "電話", content: "確認屋主出售意願，提供附近成交行情", result: "約下週拜訪" },
  { id: 3, ownerId: 2, date: "2024-03-10", type: "拜訪", content: "帶合約拜訪，說明專任委託優勢，屋主同意簽約", result: "簽約成功" },
  { id: 4, ownerId: 3, date: "2024-03-20", type: "電話", content: "591 上看到物件，主動聯繫屋主，對方有意了解仲介服務", result: "約週五拜訪" },
  { id: 5, ownerId: 4, date: "2024-03-15", type: "拜訪", content: "社區發傳單時認識，屋主有賣屋需求但還在考慮", result: "持續跟進" },
];

const statusLabels: Record<string, string> = { "first-contact": "初次接觸", "follow-up": "持續跟進", negotiating: "議價洽談", signed: "已簽委託", rejected: "暫不出售" };
const statusColors: Record<string, string> = { "first-contact": "bg-blue-100 text-blue-800", "follow-up": "bg-yellow-100 text-yellow-800", negotiating: "bg-purple-100 text-purple-800", signed: "bg-green-100 text-green-800", rejected: "bg-gray-100 text-gray-500" };
const propertyTypeLabels: Record<string, string> = { apartment: "公寓/大樓", house: "透天", office: "辦公", store: "店面" };

export default function Home() {
  const [owners] = useState(initialOwners);
  const [visitLogs] = useState(initialVisitLogs);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedOwner, setSelectedOwner] = useState<number | null>(null);

  const filtered = owners
    .filter((o) => filterStatus === "all" || o.status === filterStatus)
    .filter((o) => o.name.includes(search) || o.address.includes(search));

  const detail = selectedOwner !== null ? owners.find((o) => o.id === selectedOwner) : null;
  const ownerLogs = selectedOwner !== null ? visitLogs.filter((l) => l.ownerId === selectedOwner) : [];

  const signedCount = owners.filter((o) => o.status === "signed").length;
  const activeCount = owners.filter((o) => ["first-contact", "follow-up", "negotiating"].includes(o.status)).length;
  const needFollowUp = owners.filter((o) => o.nextFollowUp && o.nextFollowUp <= "2024-03-25").length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">業主開發管理</h1>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">開發中業主</p>
            <p className="text-2xl font-bold text-blue-600">{activeCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">已簽委託</p>
            <p className="text-2xl font-bold text-green-600">{signedCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">待跟進</p>
            <p className="text-2xl font-bold text-yellow-600">{needFollowUp}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">業主總數</p>
            <p className="text-2xl font-bold text-gray-900">{owners.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <input placeholder="搜尋業主或地址..." value={search} onChange={(e) => setSearch(e.target.value)} className="border rounded-lg px-3 py-2 text-sm flex-1 max-w-xs" />
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilterStatus("all")} className={\`px-3 py-1 rounded-full text-sm \${filterStatus === "all" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}\`}>全部</button>
            {Object.entries(statusLabels).map(([k, v]) => (
              <button key={k} onClick={() => setFilterStatus(k)} className={\`px-3 py-1 rounded-full text-sm \${filterStatus === k ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}\`}>{v}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto">
            {filtered.map((o) => {
              const priceDiff = o.ownerAskingPrice - o.marketPrice;
              return (
                <div key={o.id} onClick={() => setSelectedOwner(o.id)} className={\`bg-white rounded-lg shadow p-4 cursor-pointer border-2 transition-colors \${selectedOwner === o.id ? "border-blue-500" : "border-transparent hover:border-blue-200"}\`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{o.name}</span>
                    <span className={\`px-2 py-0.5 rounded-full text-xs font-medium \${statusColors[o.status]}\`}>{statusLabels[o.status]}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{o.address}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{propertyTypeLabels[o.propertyType]} {o.area}坪</span>
                    <span className="text-gray-500 text-xs">開價 {(o.ownerAskingPrice / 10000).toLocaleString()} 萬</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400">行情 {(o.marketPrice / 10000).toLocaleString()} 萬</span>
                    <span className={\`text-xs font-medium \${priceDiff > 0 ? "text-red-500" : "text-green-500"}\`}>
                      {priceDiff > 0 ? "高於行情" : "低於行情"} {Math.abs(priceDiff / 10000).toLocaleString()} 萬
                    </span>
                  </div>
                  {o.nextFollowUp && (
                    <p className="text-xs text-orange-600 mt-2">下次跟進：{o.nextFollowUp}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-2">
            {detail ? (
              <div className="space-y-4">
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg text-gray-900">{detail.name}</h3>
                    <span className={\`px-2 py-0.5 rounded-full text-xs font-medium \${statusColors[detail.status]}\`}>{statusLabels[detail.status]}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <p><span className="text-gray-500">電話：</span>{detail.phone}</p>
                    <p><span className="text-gray-500">來源：</span>{detail.source}</p>
                    <p className="col-span-2"><span className="text-gray-500">地址：</span>{detail.address}</p>
                    <p><span className="text-gray-500">類型：</span>{propertyTypeLabels[detail.propertyType]}</p>
                    <p><span className="text-gray-500">坪數：</span>{detail.area} 坪</p>
                    <p><span className="text-gray-500">格局：</span>{detail.rooms} 房</p>
                    <p><span className="text-gray-500">樓層：</span>{detail.floor}</p>
                    <p><span className="text-gray-500">屋齡：</span>{detail.age} 年</p>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-sm text-blue-900 mb-2">價格分析</h4>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-blue-600 text-xs">業主開價</p>
                        <p className="font-bold text-blue-900">{(detail.ownerAskingPrice / 10000).toLocaleString()} 萬</p>
                      </div>
                      <div>
                        <p className="text-blue-600 text-xs">市場行情</p>
                        <p className="font-bold text-blue-900">{(detail.marketPrice / 10000).toLocaleString()} 萬</p>
                      </div>
                      <div>
                        <p className="text-blue-600 text-xs">價差</p>
                        <p className={\`font-bold \${detail.ownerAskingPrice > detail.marketPrice ? "text-red-600" : "text-green-600"}\`}>
                          {detail.ownerAskingPrice > detail.marketPrice ? "+" : ""}{((detail.ownerAskingPrice - detail.marketPrice) / 10000).toLocaleString()} 萬
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm"><span className="text-gray-500 font-medium">備註：</span>{detail.notes}</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">洽談紀錄</h3>
                  {ownerLogs.length > 0 ? (
                    <div className="space-y-3">
                      {ownerLogs.map((log) => (
                        <div key={log.id} className="border-l-4 border-blue-400 pl-3 py-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-500">{log.date}</span>
                            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-600">{log.type}</span>
                            <span className={\`px-1.5 py-0.5 rounded text-xs \${log.result.includes("成功") ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}\`}>{log.result}</span>
                          </div>
                          <p className="text-sm text-gray-700">{log.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">尚無洽談紀錄</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
                <p>點擊左側業主查看詳細資訊與洽談紀錄</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}`;
