export const OPS_INVENTORY_PAGE = `"use client";
import { useState } from "react";

const initialItems = [
  { id: 1, name: "A4 影印紙", sku: "OFC-001", category: "辦公用品", stock: 150, minStock: 50, unit: "包", price: 89, location: "A-1-01" },
  { id: 2, name: "碳粉匣 HP 206A", sku: "PRT-012", category: "印表機耗材", stock: 8, minStock: 10, unit: "個", price: 2800, location: "A-2-03" },
  { id: 3, name: "無線滑鼠", sku: "IT-045", category: "電腦週邊", stock: 25, minStock: 10, unit: "個", price: 450, location: "B-1-02" },
  { id: 4, name: "白板筆（藍）", sku: "OFC-023", category: "辦公用品", stock: 3, minStock: 20, unit: "支", price: 35, location: "A-1-05" },
  { id: 5, name: "網路線 Cat6 3m", sku: "IT-078", category: "網路設備", stock: 40, minStock: 15, unit: "條", price: 120, location: "B-2-01" },
  { id: 6, name: "員工識別證套", sku: "OFC-056", category: "辦公用品", stock: 5, minStock: 30, unit: "個", price: 25, location: "A-1-08" },
  { id: 7, name: "HDMI 轉接器", sku: "IT-091", category: "電腦週邊", stock: 12, minStock: 5, unit: "個", price: 350, location: "B-1-04" },
  { id: 8, name: "桌上型延長線", sku: "ELC-003", category: "電器", stock: 18, minStock: 10, unit: "條", price: 280, location: "C-1-01" },
];

export default function Home() {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", category: "", stock: "", minStock: "", unit: "個", price: "", location: "" });

  const categories = Array.from(new Set(initialItems.map((i) => i.category)));

  const filtered = items
    .filter((i) => filterCategory === "all" || i.category === filterCategory)
    .filter((i) => i.name.includes(search) || i.sku.includes(search))
    .filter((i) => !showLowOnly || i.stock <= i.minStock);

  const lowStockCount = items.filter((i) => i.stock <= i.minStock).length;
  const totalValue = items.reduce((s, i) => s + i.stock * i.price, 0);

  const handleAdd = () => {
    if (!form.name || !form.sku || !form.category) return;
    setItems([...items, {
      id: items.length + 1,
      name: form.name,
      sku: form.sku,
      category: form.category,
      stock: Number(form.stock) || 0,
      minStock: Number(form.minStock) || 0,
      unit: form.unit,
      price: Number(form.price) || 0,
      location: form.location,
    }]);
    setForm({ name: "", sku: "", category: "", stock: "", minStock: "", unit: "個", price: "", location: "" });
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">庫存管理系統</h1>

        {/* 統計 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">品項總數</p>
            <p className="text-2xl font-bold text-gray-900">{items.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">庫存總值</p>
            <p className="text-2xl font-bold text-blue-600">NT$ {totalValue.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">低庫存警示</p>
            <p className={\`text-2xl font-bold \${lowStockCount > 0 ? "text-red-600" : "text-green-600"}\`}>{lowStockCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">類別數</p>
            <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
          </div>
        </div>

        {/* 工具列 */}
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <input placeholder="搜尋品名或料號..." value={search} onChange={(e) => setSearch(e.target.value)} className="border rounded-lg px-3 py-2 text-sm flex-1 max-w-xs" />
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilterCategory("all")} className={\`px-3 py-1 rounded-full text-sm \${filterCategory === "all" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}\`}>全部</button>
            {categories.map((c) => (
              <button key={c} onClick={() => setFilterCategory(c)} className={\`px-3 py-1 rounded-full text-sm \${filterCategory === c ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}\`}>{c}</button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={showLowOnly} onChange={(e) => setShowLowOnly(e.target.checked)} className="rounded border-gray-300" />
            僅顯示低庫存
          </label>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap">＋ 新增品項</button>
        </div>

        {/* 新增表單 */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h3 className="font-semibold mb-3">新增品項</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input placeholder="品名" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="料號" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="類別" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="庫存量" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="安全庫存" type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="單位" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="單價" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="儲位" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleAdd} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">新增</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">取消</button>
            </div>
          </div>
        )}

        {/* 庫存表格 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">料號</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">品名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">類別</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">庫存</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">安全庫存</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">單價</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">儲位</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((i) => {
                const isLow = i.stock <= i.minStock;
                return (
                  <tr key={i.id} className={\`hover:bg-gray-50 \${isLow ? "bg-red-50" : ""}\`}>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{i.sku}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{i.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{i.category}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{i.stock} {i.unit}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{i.minStock} {i.unit}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">NT$ {i.price}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{i.location}</td>
                    <td className="px-4 py-3">
                      <span className={\`px-2 py-0.5 rounded-full text-xs font-medium \${isLow ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}\`}>
                        {isLow ? "需補貨" : "正常"}
                      </span>
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
