import type { PresetOverlay } from "../index";

const TYPES_FILE = `export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  stockQty: number;
  reorderPoint: number;
  costPrice: number;
  sellPrice: number;
  unit: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
}

export interface PurchaseOrderItem {
  productId: number;
  productName: string;
  sku: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export interface PurchaseOrder {
  id: number;
  poNumber: string;
  supplierId: number;
  supplierName: string;
  date: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: "draft" | "pending" | "received";
  note: string;
}

export interface SalesOrderItem {
  productId: number;
  productName: string;
  sku: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export interface SalesOrder {
  id: number;
  orderNumber: string;
  customer: string;
  customerPhone: string;
  date: string;
  items: SalesOrderItem[];
  totalAmount: number;
  status: "pending" | "shipped" | "completed";
}

export interface StockMovement {
  id: number;
  date: string;
  productName: string;
  sku: string;
  type: "in" | "out";
  qty: number;
  reference: string;
}
`;

const MOCK_DATA_FILE = `import { Product, Supplier, PurchaseOrder, SalesOrder, StockMovement } from "./types";

export const products: Product[] = [
  { id: 1, sku: "BEV-001", name: "茉莉綠茶 600ml", category: "飲料", stockQty: 240, reorderPoint: 50, costPrice: 12, sellPrice: 25, unit: "瓶" },
  { id: 2, sku: "BEV-002", name: "阿薩姆奶茶 400ml", category: "飲料", stockQty: 18, reorderPoint: 30, costPrice: 15, sellPrice: 30, unit: "瓶" },
  { id: 3, sku: "SNK-001", name: "乖乖(椰子口味) 52g", category: "零食", stockQty: 150, reorderPoint: 40, costPrice: 8, sellPrice: 15, unit: "包" },
  { id: 4, sku: "SNK-002", name: "可樂果 57g", category: "零食", stockQty: 5, reorderPoint: 30, costPrice: 10, sellPrice: 20, unit: "包" },
  { id: 5, sku: "SNK-003", name: "洋芋片(經典原味) 75g", category: "零食", stockQty: 88, reorderPoint: 25, costPrice: 18, sellPrice: 35, unit: "包" },
  { id: 6, sku: "DRY-001", name: "白米 2kg", category: "乾貨", stockQty: 60, reorderPoint: 20, costPrice: 85, sellPrice: 129, unit: "包" },
  { id: 7, sku: "DRY-002", name: "統一肉燥麵(5入)", category: "乾貨", stockQty: 3, reorderPoint: 15, costPrice: 42, sellPrice: 65, unit: "組" },
  { id: 8, sku: "FRZ-001", name: "冷凍水餃(高麗菜豬肉) 25入", category: "冷凍", stockQty: 35, reorderPoint: 10, costPrice: 65, sellPrice: 99, unit: "包" },
  { id: 9, sku: "FRZ-002", name: "冷凍蔥抓餅 5片裝", category: "冷凍", stockQty: 42, reorderPoint: 15, costPrice: 38, sellPrice: 59, unit: "包" },
  { id: 10, sku: "HYG-001", name: "衛生紙(抽取式) 100抽x10包", category: "日用品", stockQty: 25, reorderPoint: 10, costPrice: 125, sellPrice: 189, unit: "串" },
  { id: 11, sku: "HYG-002", name: "洗碗精 1000ml", category: "日用品", stockQty: 8, reorderPoint: 10, costPrice: 35, sellPrice: 59, unit: "瓶" },
  { id: 12, sku: "BEV-003", name: "黑松沙士 600ml", category: "飲料", stockQty: 120, reorderPoint: 40, costPrice: 13, sellPrice: 25, unit: "瓶" },
  { id: 13, sku: "SNK-004", name: "蝦味先(原味) 65g", category: "零食", stockQty: 72, reorderPoint: 30, costPrice: 12, sellPrice: 22, unit: "包" },
  { id: 14, sku: "DRY-003", name: "關廟麵 900g", category: "乾貨", stockQty: 28, reorderPoint: 10, costPrice: 45, sellPrice: 69, unit: "包" },
  { id: 15, sku: "BEV-004", name: "舒跑 590ml", category: "飲料", stockQty: 95, reorderPoint: 35, costPrice: 11, sellPrice: 22, unit: "瓶" },
  { id: 16, sku: "FRZ-003", name: "冷凍湯圓(花生) 200g", category: "冷凍", stockQty: 20, reorderPoint: 8, costPrice: 32, sellPrice: 49, unit: "包" },
];

export const suppliers: Supplier[] = [
  { id: 1, name: "大統食品有限公司", contact: "林經理", phone: "02-2771-8800", email: "lin@datong-food.com.tw", address: "台北市中山區南京東路三段100號" },
  { id: 2, name: "全聯生活百貨批發部", contact: "陳主任", phone: "02-8780-9500", email: "chen@pxmart-wholesale.com.tw", address: "新北市三重區重新路五段609巷14號" },
  { id: 3, name: "順發日用品商行", contact: "黃老闆", phone: "04-2225-3366", email: "huang@shunfa.com.tw", address: "台中市西區民生路200號" },
  { id: 4, name: "冰極冷凍食品股份有限公司", contact: "吳課長", phone: "03-3520-168", email: "wu@icepole-frozen.com.tw", address: "桃園市桃園區經國路500號" },
];

export const purchaseOrders: PurchaseOrder[] = [
  {
    id: 1, poNumber: "PO-20241201-001", supplierId: 1, supplierName: "大統食品有限公司", date: "2024-12-01",
    items: [
      { productId: 1, productName: "茉莉綠茶 600ml", sku: "BEV-001", qty: 120, unitPrice: 12, subtotal: 1440 },
      { productId: 3, productName: "乖乖(椰子口味) 52g", sku: "SNK-001", qty: 80, unitPrice: 8, subtotal: 640 },
    ],
    totalAmount: 2080, status: "received", note: "月初例行補貨",
  },
  {
    id: 2, poNumber: "PO-20241210-002", supplierId: 2, supplierName: "全聯生活百貨批發部", date: "2024-12-10",
    items: [
      { productId: 6, productName: "白米 2kg", sku: "DRY-001", qty: 30, unitPrice: 85, subtotal: 2550 },
      { productId: 7, productName: "統一肉燥麵(5入)", sku: "DRY-002", qty: 40, unitPrice: 42, subtotal: 1680 },
    ],
    totalAmount: 4230, status: "pending", note: "年終促銷備貨",
  },
  {
    id: 3, poNumber: "PO-20241215-003", supplierId: 4, supplierName: "冰極冷凍食品股份有限公司", date: "2024-12-15",
    items: [
      { productId: 8, productName: "冷凍水餃(高麗菜豬肉) 25入", sku: "FRZ-001", qty: 50, unitPrice: 65, subtotal: 3250 },
      { productId: 9, productName: "冷凍蔥抓餅 5片裝", sku: "FRZ-002", qty: 30, unitPrice: 38, subtotal: 1140 },
    ],
    totalAmount: 4390, status: "draft", note: "",
  },
];

export const salesOrders: SalesOrder[] = [
  {
    id: 1, orderNumber: "SO-20241205-001", customer: "好鄰居便利商店", customerPhone: "02-2345-6789", date: "2024-12-05",
    items: [
      { productId: 1, productName: "茉莉綠茶 600ml", sku: "BEV-001", qty: 48, unitPrice: 25, subtotal: 1200 },
      { productId: 12, productName: "黑松沙士 600ml", sku: "BEV-003", qty: 24, unitPrice: 25, subtotal: 600 },
    ],
    totalAmount: 1800, status: "completed",
  },
  {
    id: 2, orderNumber: "SO-20241208-002", customer: "陽光早餐店", customerPhone: "02-8765-4321", date: "2024-12-08",
    items: [
      { productId: 8, productName: "冷凍水餃(高麗菜豬肉) 25入", sku: "FRZ-001", qty: 10, unitPrice: 99, subtotal: 990 },
      { productId: 9, productName: "冷凍蔥抓餅 5片裝", sku: "FRZ-002", qty: 20, unitPrice: 59, subtotal: 1180 },
    ],
    totalAmount: 2170, status: "shipped",
  },
  {
    id: 3, orderNumber: "SO-20241212-003", customer: "家樂超市 大安店", customerPhone: "02-2700-1234", date: "2024-12-12",
    items: [
      { productId: 3, productName: "乖乖(椰子口味) 52g", sku: "SNK-001", qty: 60, unitPrice: 15, subtotal: 900 },
      { productId: 5, productName: "洋芋片(經典原味) 75g", sku: "SNK-003", qty: 40, unitPrice: 35, subtotal: 1400 },
      { productId: 13, productName: "蝦味先(原味) 65g", sku: "SNK-004", qty: 36, unitPrice: 22, subtotal: 792 },
    ],
    totalAmount: 3092, status: "pending",
  },
];

export const stockMovements: StockMovement[] = [
  { id: 1, date: "2024-12-01", productName: "茉莉綠茶 600ml", sku: "BEV-001", type: "in", qty: 120, reference: "PO-20241201-001" },
  { id: 2, date: "2024-12-01", productName: "乖乖(椰子口味) 52g", sku: "SNK-001", type: "in", qty: 80, reference: "PO-20241201-001" },
  { id: 3, date: "2024-12-05", productName: "茉莉綠茶 600ml", sku: "BEV-001", type: "out", qty: 48, reference: "SO-20241205-001" },
  { id: 4, date: "2024-12-05", productName: "黑松沙士 600ml", sku: "BEV-003", type: "out", qty: 24, reference: "SO-20241205-001" },
  { id: 5, date: "2024-12-08", productName: "冷凍水餃(高麗菜豬肉) 25入", sku: "FRZ-001", type: "out", qty: 10, reference: "SO-20241208-002" },
  { id: 6, date: "2024-12-08", productName: "冷凍蔥抓餅 5片裝", sku: "FRZ-002", type: "out", qty: 20, reference: "SO-20241208-002" },
  { id: 7, date: "2024-12-10", productName: "白米 2kg", sku: "DRY-001", type: "in", qty: 30, reference: "PO-20241210-002" },
  { id: 8, date: "2024-12-12", productName: "乖乖(椰子口味) 52g", sku: "SNK-001", type: "out", qty: 60, reference: "SO-20241212-003" },
  { id: 9, date: "2024-12-12", productName: "洋芋片(經典原味) 75g", sku: "SNK-003", type: "out", qty: 40, reference: "SO-20241212-003" },
  { id: 10, date: "2024-12-12", productName: "蝦味先(原味) 65g", sku: "SNK-004", type: "out", qty: 36, reference: "SO-20241212-003" },
];
`;

const DASHBOARD_PAGE = `"use client";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const products = [
  { id: 1, sku: "BEV-001", name: "茉莉綠茶 600ml", category: "飲料", stockQty: 240, reorderPoint: 50, costPrice: 12, sellPrice: 25 },
  { id: 2, sku: "BEV-002", name: "阿薩姆奶茶 400ml", category: "飲料", stockQty: 18, reorderPoint: 30, costPrice: 15, sellPrice: 30 },
  { id: 3, sku: "SNK-001", name: "乖乖(椰子口味) 52g", category: "零食", stockQty: 150, reorderPoint: 40, costPrice: 8, sellPrice: 15 },
  { id: 4, sku: "SNK-002", name: "可樂果 57g", category: "零食", stockQty: 5, reorderPoint: 30, costPrice: 10, sellPrice: 20 },
  { id: 5, sku: "SNK-003", name: "洋芋片(經典原味) 75g", category: "零食", stockQty: 88, reorderPoint: 25, costPrice: 18, sellPrice: 35 },
  { id: 6, sku: "DRY-001", name: "白米 2kg", category: "乾貨", stockQty: 60, reorderPoint: 20, costPrice: 85, sellPrice: 129 },
  { id: 7, sku: "DRY-002", name: "統一肉燥麵(5入)", category: "乾貨", stockQty: 3, reorderPoint: 15, costPrice: 42, sellPrice: 65 },
  { id: 8, sku: "FRZ-001", name: "冷凍水餃 25入", category: "冷凍", stockQty: 35, reorderPoint: 10, costPrice: 65, sellPrice: 99 },
  { id: 9, sku: "FRZ-002", name: "冷凍蔥抓餅 5片裝", category: "冷凍", stockQty: 42, reorderPoint: 15, costPrice: 38, sellPrice: 59 },
  { id: 10, sku: "HYG-001", name: "衛生紙 100抽x10包", category: "日用品", stockQty: 25, reorderPoint: 10, costPrice: 125, sellPrice: 189 },
  { id: 11, sku: "HYG-002", name: "洗碗精 1000ml", category: "日用品", stockQty: 8, reorderPoint: 10, costPrice: 35, sellPrice: 59 },
  { id: 12, sku: "BEV-003", name: "黑松沙士 600ml", category: "飲料", stockQty: 120, reorderPoint: 40, costPrice: 13, sellPrice: 25 },
  { id: 13, sku: "SNK-004", name: "蝦味先(原味) 65g", category: "零食", stockQty: 72, reorderPoint: 30, costPrice: 12, sellPrice: 22 },
  { id: 14, sku: "DRY-003", name: "關廟麵 900g", category: "乾貨", stockQty: 28, reorderPoint: 10, costPrice: 45, sellPrice: 69 },
  { id: 15, sku: "BEV-004", name: "舒跑 590ml", category: "飲料", stockQty: 95, reorderPoint: 35, costPrice: 11, sellPrice: 22 },
  { id: 16, sku: "FRZ-003", name: "冷凍湯圓(花生) 200g", category: "冷凍", stockQty: 20, reorderPoint: 8, costPrice: 32, sellPrice: 49 },
];

const stockMovements = [
  { date: "12/01", inQty: 200, outQty: 0 },
  { date: "12/03", inQty: 0, outQty: 45 },
  { date: "12/05", inQty: 0, outQty: 72 },
  { date: "12/07", inQty: 150, outQty: 30 },
  { date: "12/08", inQty: 0, outQty: 30 },
  { date: "12/10", inQty: 70, outQty: 0 },
  { date: "12/12", inQty: 0, outQty: 136 },
  { date: "12/14", inQty: 80, outQty: 25 },
];

export default function Dashboard() {
  const totalProducts = products.length;
  const totalStockValue = products.reduce((sum, p) => sum + p.stockQty * p.costPrice, 0);
  const lowStockItems = products.filter((p) => p.stockQty <= p.reorderPoint);
  const todayTransactions = 7;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">零售庫存管理系統</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">商品總數</p>
            <p className="text-3xl font-bold text-gray-900">{totalProducts}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">庫存總值</p>
            <p className="text-3xl font-bold text-blue-600">NT$ {totalStockValue.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">低庫存警示</p>
            <p className="text-3xl font-bold text-red-600">{lowStockItems.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">今日異動筆數</p>
            <p className="text-3xl font-bold text-green-600">{todayTransactions}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">低庫存警示清單</h2>
            <div className="space-y-3">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.sku} / {item.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">{item.stockQty}</p>
                    <p className="text-xs text-gray-400">安全庫存: {item.reorderPoint}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">近期庫存異動</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stockMovements}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="inQty" name="進貨" fill="#3b82f6" />
                <Bar dataKey="outQty" name="出貨" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

const PRODUCTS_PAGE = `"use client";
import { useState } from "react";

const initialProducts = [
  { id: 1, sku: "BEV-001", name: "茉莉綠茶 600ml", category: "飲料", stockQty: 240, reorderPoint: 50, costPrice: 12, sellPrice: 25 },
  { id: 2, sku: "BEV-002", name: "阿薩姆奶茶 400ml", category: "飲料", stockQty: 18, reorderPoint: 30, costPrice: 15, sellPrice: 30 },
  { id: 3, sku: "SNK-001", name: "乖乖(椰子口味) 52g", category: "零食", stockQty: 150, reorderPoint: 40, costPrice: 8, sellPrice: 15 },
  { id: 4, sku: "SNK-002", name: "可樂果 57g", category: "零食", stockQty: 5, reorderPoint: 30, costPrice: 10, sellPrice: 20 },
  { id: 5, sku: "SNK-003", name: "洋芋片(經典原味) 75g", category: "零食", stockQty: 88, reorderPoint: 25, costPrice: 18, sellPrice: 35 },
  { id: 6, sku: "DRY-001", name: "白米 2kg", category: "乾貨", stockQty: 60, reorderPoint: 20, costPrice: 85, sellPrice: 129 },
  { id: 7, sku: "DRY-002", name: "統一肉燥麵(5入)", category: "乾貨", stockQty: 3, reorderPoint: 15, costPrice: 42, sellPrice: 65 },
  { id: 8, sku: "FRZ-001", name: "冷凍水餃 25入", category: "冷凍", stockQty: 35, reorderPoint: 10, costPrice: 65, sellPrice: 99 },
  { id: 9, sku: "FRZ-002", name: "冷凍蔥抓餅 5片裝", category: "冷凍", stockQty: 42, reorderPoint: 15, costPrice: 38, sellPrice: 59 },
  { id: 10, sku: "HYG-001", name: "衛生紙 100抽x10包", category: "日用品", stockQty: 25, reorderPoint: 10, costPrice: 125, sellPrice: 189 },
  { id: 11, sku: "HYG-002", name: "洗碗精 1000ml", category: "日用品", stockQty: 8, reorderPoint: 10, costPrice: 35, sellPrice: 59 },
  { id: 12, sku: "BEV-003", name: "黑松沙士 600ml", category: "飲料", stockQty: 120, reorderPoint: 40, costPrice: 13, sellPrice: 25 },
  { id: 13, sku: "SNK-004", name: "蝦味先(原味) 65g", category: "零食", stockQty: 72, reorderPoint: 30, costPrice: 12, sellPrice: 22 },
  { id: 14, sku: "DRY-003", name: "關廟麵 900g", category: "乾貨", stockQty: 28, reorderPoint: 10, costPrice: 45, sellPrice: 69 },
  { id: 15, sku: "BEV-004", name: "舒跑 590ml", category: "飲料", stockQty: 95, reorderPoint: 35, costPrice: 11, sellPrice: 22 },
  { id: 16, sku: "FRZ-003", name: "冷凍湯圓(花生) 200g", category: "冷凍", stockQty: 20, reorderPoint: 8, costPrice: 32, sellPrice: 49 },
];

const categories = ["全部", "飲料", "零食", "乾貨", "冷凍", "日用品"];

function stockStatus(qty: number, reorder: number) {
  if (qty <= reorder * 0.5) return { label: "不足", color: "bg-red-100 text-red-800" };
  if (qty <= reorder) return { label: "偏低", color: "bg-yellow-100 text-yellow-800" };
  return { label: "正常", color: "bg-green-100 text-green-800" };
}

export default function ProductsPage() {
  const [products] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("全部");

  const filtered = products
    .filter((p) => filterCat === "全部" || p.category === filterCat)
    .filter((p) => p.name.includes(search) || p.sku.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">商品管理</h1>

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <input
            placeholder="搜尋商品名稱或 SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm flex-1 max-w-xs"
          />
          <div className="flex gap-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={\`px-3 py-1.5 rounded-full text-sm \${filterCat === cat ? "bg-blue-600 text-white" : "bg-white text-gray-600 border"}\`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品名稱</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">分類</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">庫存量</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">安全庫存</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">成本價</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">售價</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">狀態</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((p) => {
                const status = stockStatus(p.stockQty, p.reorderPoint);
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{p.sku}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.category}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{p.stockQty}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500">{p.reorderPoint}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">NT$ {p.costPrice}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">NT$ {p.sellPrice}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={\`px-2 py-1 rounded-full text-xs font-medium \${status.color}\`}>{status.label}</span>
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
}
`;

const PURCHASE_PAGE = `"use client";
import { useState } from "react";

const statusLabels: Record<string, string> = { draft: "草稿", pending: "待收貨", received: "已到貨" };
const statusColors: Record<string, string> = { draft: "bg-gray-100 text-gray-800", pending: "bg-yellow-100 text-yellow-800", received: "bg-green-100 text-green-800" };

const purchaseOrders = [
  {
    id: 1, poNumber: "PO-20241201-001", supplierName: "大統食品有限公司", date: "2024-12-01",
    items: [
      { productName: "茉莉綠茶 600ml", sku: "BEV-001", qty: 120, unitPrice: 12, subtotal: 1440 },
      { productName: "乖乖(椰子口味) 52g", sku: "SNK-001", qty: 80, unitPrice: 8, subtotal: 640 },
    ],
    totalAmount: 2080, status: "received", note: "月初例行補貨",
  },
  {
    id: 2, poNumber: "PO-20241210-002", supplierName: "全聯生活百貨批發部", date: "2024-12-10",
    items: [
      { productName: "白米 2kg", sku: "DRY-001", qty: 30, unitPrice: 85, subtotal: 2550 },
      { productName: "統一肉燥麵(5入)", sku: "DRY-002", qty: 40, unitPrice: 42, subtotal: 1680 },
    ],
    totalAmount: 4230, status: "pending", note: "年終促銷備貨",
  },
  {
    id: 3, poNumber: "PO-20241215-003", supplierName: "冰極冷凍食品股份有限公司", date: "2024-12-15",
    items: [
      { productName: "冷凍水餃(高麗菜豬肉) 25入", sku: "FRZ-001", qty: 50, unitPrice: 65, subtotal: 3250 },
      { productName: "冷凍蔥抓餅 5片裝", sku: "FRZ-002", qty: 30, unitPrice: 38, subtotal: 1140 },
    ],
    totalAmount: 4390, status: "draft", note: "",
  },
  {
    id: 4, poNumber: "PO-20241218-004", supplierName: "順發日用品商行", date: "2024-12-18",
    items: [
      { productName: "衛生紙 100抽x10包", sku: "HYG-001", qty: 20, unitPrice: 125, subtotal: 2500 },
      { productName: "洗碗精 1000ml", sku: "HYG-002", qty: 24, unitPrice: 35, subtotal: 840 },
    ],
    totalAmount: 3340, status: "pending", note: "日用品補貨",
  },
];

export default function PurchasePage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = purchaseOrders.find((po) => po.id === selectedId);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">進貨單管理</h1>

        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">單號</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">供應商</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">金額</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">狀態</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {purchaseOrders.map((po) => (
                <tr key={po.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-blue-600">{po.poNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{po.supplierName}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{po.date}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">NT$ {po.totalAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={\`px-2 py-1 rounded-full text-xs font-medium \${statusColors[po.status]}\`}>{statusLabels[po.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => setSelectedId(po.id)} className="text-blue-600 hover:text-blue-800 text-sm">查看明細</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">進貨單明細 - {selected.poNumber}</h2>
              <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-gray-600 text-sm">關閉</button>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div><span className="text-gray-500">供應商：</span><span className="font-medium">{selected.supplierName}</span></div>
              <div><span className="text-gray-500">日期：</span><span className="font-medium">{selected.date}</span></div>
              <div><span className="text-gray-500">狀態：</span><span className={\`px-2 py-1 rounded-full text-xs font-medium \${statusColors[selected.status]}\`}>{statusLabels[selected.status]}</span></div>
            </div>
            {selected.note && <p className="text-sm text-gray-500 mb-4">備註：{selected.note}</p>}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">SKU</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">商品名稱</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">數量</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">單價</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">小計</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {selected.items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-sm font-mono text-gray-600">{item.sku}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.productName}</td>
                    <td className="px-4 py-2 text-sm text-right">{item.qty}</td>
                    <td className="px-4 py-2 text-sm text-right">NT$ {item.unitPrice}</td>
                    <td className="px-4 py-2 text-sm text-right font-medium">NT$ {item.subtotal.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={4} className="px-4 py-2 text-sm font-medium text-right">合計</td>
                  <td className="px-4 py-2 text-sm font-bold text-right">NT$ {selected.totalAmount.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
`;

const SALES_ORDERS_PAGE = `"use client";
import { useState } from "react";

const statusLabels: Record<string, string> = { pending: "待出貨", shipped: "已出貨", completed: "已完成" };
const statusColors: Record<string, string> = { pending: "bg-yellow-100 text-yellow-800", shipped: "bg-blue-100 text-blue-800", completed: "bg-green-100 text-green-800" };

const salesOrders = [
  {
    id: 1, orderNumber: "SO-20241205-001", customer: "好鄰居便利商店", customerPhone: "02-2345-6789", date: "2024-12-05",
    items: [
      { productName: "茉莉綠茶 600ml", sku: "BEV-001", qty: 48, unitPrice: 25, subtotal: 1200 },
      { productName: "黑松沙士 600ml", sku: "BEV-003", qty: 24, unitPrice: 25, subtotal: 600 },
    ],
    totalAmount: 1800, status: "completed",
  },
  {
    id: 2, orderNumber: "SO-20241208-002", customer: "陽光早餐店", customerPhone: "02-8765-4321", date: "2024-12-08",
    items: [
      { productName: "冷凍水餃 25入", sku: "FRZ-001", qty: 10, unitPrice: 99, subtotal: 990 },
      { productName: "冷凍蔥抓餅 5片裝", sku: "FRZ-002", qty: 20, unitPrice: 59, subtotal: 1180 },
    ],
    totalAmount: 2170, status: "shipped",
  },
  {
    id: 3, orderNumber: "SO-20241212-003", customer: "家樂超市 大安店", customerPhone: "02-2700-1234", date: "2024-12-12",
    items: [
      { productName: "乖乖(椰子口味) 52g", sku: "SNK-001", qty: 60, unitPrice: 15, subtotal: 900 },
      { productName: "洋芋片(經典原味) 75g", sku: "SNK-003", qty: 40, unitPrice: 35, subtotal: 1400 },
      { productName: "蝦味先(原味) 65g", sku: "SNK-004", qty: 36, unitPrice: 22, subtotal: 792 },
    ],
    totalAmount: 3092, status: "pending",
  },
  {
    id: 4, orderNumber: "SO-20241215-004", customer: "美味自助餐", customerPhone: "02-2511-7788", date: "2024-12-15",
    items: [
      { productName: "白米 2kg", sku: "DRY-001", qty: 15, unitPrice: 129, subtotal: 1935 },
      { productName: "關廟麵 900g", sku: "DRY-003", qty: 10, unitPrice: 69, subtotal: 690 },
    ],
    totalAmount: 2625, status: "pending",
  },
];

export default function SalesOrdersPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = salesOrders.find((so) => so.id === selectedId);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">銷貨單管理</h1>

        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">訂單編號</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">客戶</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">金額</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">狀態</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salesOrders.map((so) => (
                <tr key={so.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-blue-600">{so.orderNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{so.customer}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{so.date}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">NT$ {so.totalAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={\`px-2 py-1 rounded-full text-xs font-medium \${statusColors[so.status]}\`}>{statusLabels[so.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => setSelectedId(so.id)} className="text-blue-600 hover:text-blue-800 text-sm">查看明細</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">銷貨單明細 - {selected.orderNumber}</h2>
              <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-gray-600 text-sm">關閉</button>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div><span className="text-gray-500">客戶：</span><span className="font-medium">{selected.customer}</span></div>
              <div><span className="text-gray-500">電話：</span><span className="font-medium">{selected.customerPhone}</span></div>
              <div><span className="text-gray-500">狀態：</span><span className={\`px-2 py-1 rounded-full text-xs font-medium \${statusColors[selected.status]}\`}>{statusLabels[selected.status]}</span></div>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">SKU</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">商品名稱</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">數量</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">單價</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">小計</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {selected.items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-sm font-mono text-gray-600">{item.sku}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.productName}</td>
                    <td className="px-4 py-2 text-sm text-right">{item.qty}</td>
                    <td className="px-4 py-2 text-sm text-right">NT$ {item.unitPrice}</td>
                    <td className="px-4 py-2 text-sm text-right font-medium">NT$ {item.subtotal.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={4} className="px-4 py-2 text-sm font-medium text-right">合計</td>
                  <td className="px-4 py-2 text-sm font-bold text-right">NT$ {selected.totalAmount.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
`;

export const ERP_RETAIL: PresetOverlay = {
  templateId: "erp",
  files: [
    { path: "src/app/page.tsx", content: DASHBOARD_PAGE },
    { path: "src/app/products/page.tsx", content: PRODUCTS_PAGE },
    { path: "src/app/purchase/page.tsx", content: PURCHASE_PAGE },
    { path: "src/app/sales-orders/page.tsx", content: SALES_ORDERS_PAGE },
    { path: "src/lib/types.ts", content: TYPES_FILE },
    { path: "src/lib/mock-data.ts", content: MOCK_DATA_FILE },
  ],
  requiredServices: [
    { category: "database", suggestedTypes: ["built_in_supabase", "postgresql"], purpose: "儲存商品與訂單資料" },
  ],
};
