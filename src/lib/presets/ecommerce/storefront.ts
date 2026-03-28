import type { PresetOverlay } from "../index";

export const ECOMMERCE_STOREFRONT: PresetOverlay = {
  templateId: "ecommerce",
  files: [
    {
      path: "src/lib/types.ts",
      content: `export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description: string;
  categoryId: string;
  image: string;
  sizes?: string[];
  colors?: string[];
  stock: number;
  featured: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: "pending" | "processing" | "shipped" | "completed" | "cancelled";
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  createdAt: string;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  email: string;
  city: string;
  district: string;
  address: string;
  postalCode: string;
}
`,
    },
    {
      path: "src/lib/mock-data.ts",
      content: `import type { Category, Product } from "./types";

export const categories: Category[] = [
  { id: "cat-1", name: "上衣", slug: "tops", description: "各式上衣、T恤、襯衫" },
  { id: "cat-2", name: "褲裝", slug: "bottoms", description: "長褲、短褲、裙裝" },
  { id: "cat-3", name: "外套", slug: "outerwear", description: "外套、夾克、風衣" },
  { id: "cat-4", name: "配件", slug: "accessories", description: "包包、帽子、圍巾" },
  { id: "cat-5", name: "鞋款", slug: "shoes", description: "運動鞋、休閒鞋、涼鞋" },
];

export const products: Product[] = [
  {
    id: "prod-1",
    name: "經典圓領純棉T恤",
    price: 590,
    originalPrice: 790,
    description: "採用100%精梳棉製成，柔軟透氣，四季皆宜的百搭單品。",
    categoryId: "cat-1",
    image: "/placeholder-product.png",
    sizes: ["S", "M", "L", "XL"],
    colors: ["白色", "黑色", "灰色", "海軍藍"],
    stock: 120,
    featured: true,
  },
  {
    id: "prod-2",
    name: "法式條紋亞麻襯衫",
    price: 1280,
    description: "天然亞麻面料，法式經典條紋設計，輕鬆打造優雅休閒風格。",
    categoryId: "cat-1",
    image: "/placeholder-product.png",
    sizes: ["S", "M", "L"],
    colors: ["藍白條紋", "紅白條紋"],
    stock: 45,
    featured: true,
  },
  {
    id: "prod-3",
    name: "高腰修身直筒牛仔褲",
    price: 1680,
    originalPrice: 2100,
    description: "日本進口丹寧布料，高腰設計修飾腿型，經典百搭款式。",
    categoryId: "cat-2",
    image: "/placeholder-product.png",
    sizes: ["25", "26", "27", "28", "29", "30"],
    colors: ["深藍", "淺藍", "黑色"],
    stock: 78,
    featured: true,
  },
  {
    id: "prod-4",
    name: "寬鬆休閒棉麻短褲",
    price: 890,
    description: "棉麻混紡面料，鬆緊腰頭設計，夏日必備的舒適短褲。",
    categoryId: "cat-2",
    image: "/placeholder-product.png",
    sizes: ["S", "M", "L", "XL"],
    colors: ["卡其", "軍綠", "米白"],
    stock: 56,
    featured: false,
  },
  {
    id: "prod-5",
    name: "輕量防風連帽外套",
    price: 2380,
    description: "防潑水輕量材質，可收納式設計方便攜帶，適合春秋季節穿搭。",
    categoryId: "cat-3",
    image: "/placeholder-product.png",
    sizes: ["S", "M", "L", "XL"],
    colors: ["黑色", "深藍", "橄欖綠"],
    stock: 33,
    featured: true,
  },
  {
    id: "prod-6",
    name: "羊毛混紡經典大衣",
    price: 4980,
    originalPrice: 6200,
    description: "70%羊毛混紡面料，雙排扣經典版型，秋冬季節最佳保暖外套。",
    categoryId: "cat-3",
    image: "/placeholder-product.png",
    sizes: ["S", "M", "L"],
    colors: ["駝色", "黑色", "灰色"],
    stock: 18,
    featured: false,
  },
  {
    id: "prod-7",
    name: "簡約皮革托特包",
    price: 2680,
    description: "優質人造皮革，大容量設計可放入筆電，通勤上班族首選。",
    categoryId: "cat-4",
    image: "/placeholder-product.png",
    colors: ["黑色", "棕色", "酒紅"],
    stock: 42,
    featured: true,
  },
  {
    id: "prod-8",
    name: "棉質漁夫帽",
    price: 490,
    description: "100%純棉材質，遮陽防曬，可折疊收納，戶外出遊必備。",
    categoryId: "cat-4",
    image: "/placeholder-product.png",
    colors: ["米白", "黑色", "卡其", "丹寧藍"],
    stock: 95,
    featured: false,
  },
  {
    id: "prod-9",
    name: "羊毛格紋圍巾",
    price: 1280,
    originalPrice: 1580,
    description: "柔軟羊毛材質，經典格紋圖案，冬季保暖搭配的完美選擇。",
    categoryId: "cat-4",
    image: "/placeholder-product.png",
    colors: ["紅格紋", "藍格紋", "灰格紋"],
    stock: 67,
    featured: false,
  },
  {
    id: "prod-10",
    name: "透氣網布慢跑鞋",
    price: 1980,
    description: "輕量透氣網布鞋面，緩震中底設計，適合日常跑步運動穿著。",
    categoryId: "cat-5",
    image: "/placeholder-product.png",
    sizes: ["36", "37", "38", "39", "40", "41", "42", "43"],
    colors: ["黑白", "全白", "灰藍"],
    stock: 54,
    featured: true,
  },
  {
    id: "prod-11",
    name: "帆布休閒懶人鞋",
    price: 790,
    originalPrice: 990,
    description: "經典帆布材質，免綁帶設計方便穿脫，日常通勤百搭鞋款。",
    categoryId: "cat-5",
    image: "/placeholder-product.png",
    sizes: ["36", "37", "38", "39", "40", "41", "42"],
    colors: ["白色", "黑色", "海軍藍"],
    stock: 88,
    featured: false,
  },
  {
    id: "prod-12",
    name: "印花絲質方巾",
    price: 680,
    description: "100%桑蠶絲面料，精緻印花設計，可作為髮帶、頸巾或包包裝飾。",
    categoryId: "cat-4",
    image: "/placeholder-product.png",
    colors: ["花卉粉", "幾何藍", "復古綠"],
    stock: 35,
    featured: false,
  },
];
`,
    },
    {
      path: "src/lib/cart-store.ts",
      content: `import { create } from "zustand";
import type { Product, CartItem } from "./types";

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, size?: string, color?: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (product, quantity = 1, size, color) => {
    set((state) => {
      const existing = state.items.find(
        (item) =>
          item.product.id === product.id &&
          item.selectedSize === size &&
          item.selectedColor === color
      );
      if (existing) {
        return {
          items: state.items.map((item) =>
            item.product.id === product.id &&
            item.selectedSize === size &&
            item.selectedColor === color
              ? { ...item, quantity: item.quantity + quantity }
              : item
          ),
        };
      }
      return {
        items: [
          ...state.items,
          { product, quantity, selectedSize: size, selectedColor: color },
        ],
      };
    });
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((item) => item.product.id !== productId),
    }));
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      ),
    }));
  },

  clearCart: () => set({ items: [] }),

  totalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

  totalPrice: () =>
    get().items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    ),
}));
`,
    },
    {
      path: "src/app/page.tsx",
      content: `"use client";
import { useState } from "react";
import Link from "next/link";
import { products, categories } from "@/lib/mock-data";
import { useCartStore } from "@/lib/cart-store";

export default function Home() {
  const [currentPromo, setCurrentPromo] = useState(0);
  const addItem = useCartStore((s) => s.addItem);
  const totalItems = useCartStore((s) => s.totalItems);

  const promos = [
    { title: "春季新品上市", subtitle: "全館新品 85 折起", bg: "from-pink-500 to-rose-500" },
    { title: "會員專屬優惠", subtitle: "消費滿 NT$2,000 現折 NT$200", bg: "from-blue-500 to-indigo-500" },
    { title: "限時免運", subtitle: "全站消費滿 NT$800 免運費", bg: "from-emerald-500 to-teal-500" },
  ];

  const featuredProducts = products.filter((p) => p.featured);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 導覽列 */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            AIGO 商城
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/products" className="text-sm text-gray-600 hover:text-gray-900">
              所有商品
            </Link>
            <Link href="/cart" className="relative text-sm text-gray-600 hover:text-gray-900">
              購物車
              {totalItems() > 0 && (
                <span className="absolute -top-2 -right-4 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {totalItems()}
                </span>
              )}
            </Link>
          </div>
        </div>
      </nav>

      {/* 促銷橫幅 */}
      <div className="relative">
        <div className={\`bg-gradient-to-r \${promos[currentPromo].bg} text-white py-16 px-4\`}>
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-2">{promos[currentPromo].title}</h1>
            <p className="text-lg opacity-90">{promos[currentPromo].subtitle}</p>
            <Link
              href="/products"
              className="inline-block mt-6 px-8 py-3 bg-white text-gray-900 rounded-full font-medium hover:bg-gray-100 transition"
            >
              立即選購
            </Link>
          </div>
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {promos.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPromo(i)}
              className={\`w-3 h-3 rounded-full transition \${
                i === currentPromo ? "bg-white" : "bg-white/50"
              }\`}
            />
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* 商品分類 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">商品分類</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={\`/products?category=\${cat.slug}\`}
                className="bg-white rounded-xl shadow-sm p-6 text-center hover:shadow-md transition"
              >
                <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl">
                  {cat.slug === "tops" && "\u{1F455}"}
                  {cat.slug === "bottoms" && "\u{1F456}"}
                  {cat.slug === "outerwear" && "\u{1F9E5}"}
                  {cat.slug === "accessories" && "\u{1F45C}"}
                  {cat.slug === "shoes" && "\u{1F45F}"}
                </div>
                <h3 className="font-medium text-gray-900">{cat.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{cat.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* 精選商品 */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">精選商品</h2>
            <Link href="/products" className="text-sm text-blue-600 hover:text-blue-800">
              查看全部 &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden group hover:shadow-md transition"
              >
                <Link href={\`/products/\${product.id}\`}>
                  <div className="aspect-square bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                    商品圖片
                  </div>
                </Link>
                <div className="p-4">
                  <Link href={\`/products/\${product.id}\`}>
                    <h3 className="font-medium text-gray-900 text-sm mb-1 group-hover:text-blue-600 transition">
                      {product.name}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-red-600">
                      NT\${product.price.toLocaleString()}
                    </span>
                    {product.originalPrice && (
                      <span className="text-sm text-gray-400 line-through">
                        NT\${product.originalPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => addItem(product, 1, product.sizes?.[0], product.colors?.[0])}
                    className="w-full mt-3 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition"
                  >
                    加入購物車
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
`,
    },
    {
      path: "src/app/products/page.tsx",
      content: `"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { products, categories } from "@/lib/mock-data";
import { useCartStore } from "@/lib/cart-store";

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "all";

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("default");
  const addItem = useCartStore((s) => s.addItem);
  const totalItems = useCartStore((s) => s.totalItems);

  const filtered = useMemo(() => {
    let result = products;
    if (selectedCategory !== "all") {
      const cat = categories.find((c) => c.slug === selectedCategory);
      if (cat) result = result.filter((p) => p.categoryId === cat.id);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }
    if (sortBy === "price-asc") result = [...result].sort((a, b) => a.price - b.price);
    if (sortBy === "price-desc") result = [...result].sort((a, b) => b.price - a.price);
    return result;
  }, [search, selectedCategory, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            AIGO 商城
          </Link>
          <Link href="/cart" className="relative text-sm text-gray-600 hover:text-gray-900">
            購物車
            {totalItems() > 0 && (
              <span className="absolute -top-2 -right-4 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {totalItems()}
              </span>
            )}
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">所有商品</h1>

        {/* 篩選工具列 */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <input
              placeholder="搜尋商品..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded-lg px-4 py-2 text-sm flex-1 w-full md:max-w-xs"
            />
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory("all")}
                className={\`px-3 py-1.5 rounded-full text-sm \${
                  selectedCategory === "all"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }\`}
              >
                全部
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={\`px-3 py-1.5 rounded-full text-sm \${
                    selectedCategory === cat.slug
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }\`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                <option value="default">預設排序</option>
                <option value="price-asc">價格低到高</option>
                <option value="price-desc">價格高到低</option>
              </select>
              <button
                onClick={() => setViewMode("grid")}
                className={\`p-2 rounded \${viewMode === "grid" ? "bg-gray-200" : "hover:bg-gray-100"}\`}
                title="格狀檢視"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/></svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={\`p-2 rounded \${viewMode === "list" ? "bg-gray-200" : "hover:bg-gray-100"}\`}
                title="列表檢視"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg>
              </button>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-4">共 {filtered.length} 件商品</p>

        {/* 商品列表 */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden group hover:shadow-md transition"
              >
                <Link href={\`/products/\${product.id}\`}>
                  <div className="aspect-square bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                    商品圖片
                  </div>
                </Link>
                <div className="p-4">
                  <Link href={\`/products/\${product.id}\`}>
                    <h3 className="font-medium text-gray-900 text-sm mb-1 group-hover:text-blue-600">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="text-xs text-gray-500 mb-2 line-clamp-2">{product.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-red-600">
                      NT\${product.price.toLocaleString()}
                    </span>
                    {product.originalPrice && (
                      <span className="text-sm text-gray-400 line-through">
                        NT\${product.originalPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => addItem(product, 1, product.sizes?.[0], product.colors?.[0])}
                    className="w-full mt-3 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition"
                  >
                    加入購物車
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden flex hover:shadow-md transition"
              >
                <div className="w-40 h-40 bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-400 text-sm">
                  商品圖片
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <Link href={\`/products/\${product.id}\`}>
                      <h3 className="font-medium text-gray-900 hover:text-blue-600">{product.name}</h3>
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">{product.description}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-red-600">
                        NT\${product.price.toLocaleString()}
                      </span>
                      {product.originalPrice && (
                        <span className="text-sm text-gray-400 line-through">
                          NT\${product.originalPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => addItem(product, 1, product.sizes?.[0], product.colors?.[0])}
                      className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition"
                    >
                      加入購物車
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
`,
    },
    {
      path: "src/app/products/[id]/page.tsx",
      content: `"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { products, categories } from "@/lib/mock-data";
import { useCartStore } from "@/lib/cart-store";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const product = products.find((p) => p.id === params.id);
  const addItem = useCartStore((s) => s.addItem);
  const totalItems = useCartStore((s) => s.totalItems);

  const [selectedSize, setSelectedSize] = useState(product?.sizes?.[0] || "");
  const [selectedColor, setSelectedColor] = useState(product?.colors?.[0] || "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">找不到商品</h1>
          <Link href="/products" className="text-blue-600 hover:text-blue-800">
            返回商品列表
          </Link>
        </div>
      </div>
    );
  }

  const category = categories.find((c) => c.id === product.categoryId);

  const handleAddToCart = () => {
    addItem(product, quantity, selectedSize, selectedColor);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            AIGO 商城
          </Link>
          <Link href="/cart" className="relative text-sm text-gray-600 hover:text-gray-900">
            購物車
            {totalItems() > 0 && (
              <span className="absolute -top-2 -right-4 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {totalItems()}
              </span>
            )}
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 麵包屑 */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-gray-900">首頁</Link>
          <span className="mx-2">/</span>
          <Link href="/products" className="hover:text-gray-900">所有商品</Link>
          {category && (
            <>
              <span className="mx-2">/</span>
              <Link href={\`/products?category=\${category.slug}\`} className="hover:text-gray-900">
                {category.name}
              </Link>
            </>
          )}
          <span className="mx-2">/</span>
          <span className="text-gray-900">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* 商品圖片 */}
          <div className="aspect-square bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-6xl mb-2">
                {category?.slug === "tops" && "\u{1F455}"}
                {category?.slug === "bottoms" && "\u{1F456}"}
                {category?.slug === "outerwear" && "\u{1F9E5}"}
                {category?.slug === "accessories" && "\u{1F45C}"}
                {category?.slug === "shoes" && "\u{1F45F}"}
              </div>
              <p className="text-sm">商品圖片預覽區</p>
            </div>
          </div>

          {/* 商品資訊 */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl font-bold text-red-600">
                NT\${product.price.toLocaleString()}
              </span>
              {product.originalPrice && (
                <span className="text-lg text-gray-400 line-through">
                  NT\${product.originalPrice.toLocaleString()}
                </span>
              )}
              {product.originalPrice && (
                <span className="px-2 py-1 bg-red-100 text-red-600 text-sm rounded-full font-medium">
                  {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
                </span>
              )}
            </div>

            <p className="text-gray-600 mb-6">{product.description}</p>

            <div className="space-y-4">
              {/* 尺寸選擇 */}
              {product.sizes && product.sizes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    尺寸
                  </label>
                  <div className="flex gap-2">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={\`px-4 py-2 border rounded-lg text-sm \${
                          selectedSize === size
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-300 text-gray-700 hover:border-gray-400"
                        }\`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 顏色選擇 */}
              {product.colors && product.colors.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    顏色
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {product.colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={\`px-4 py-2 border rounded-lg text-sm \${
                          selectedColor === color
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-300 text-gray-700 hover:border-gray-400"
                        }\`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 數量 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  數量
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 border rounded-lg flex items-center justify-center hover:bg-gray-50"
                  >
                    -
                  </button>
                  <span className="text-lg font-medium w-10 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="w-10 h-10 border rounded-lg flex items-center justify-center hover:bg-gray-50"
                  >
                    +
                  </button>
                  <span className="text-sm text-gray-500">庫存 {product.stock} 件</span>
                </div>
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={handleAddToCart}
                className={\`flex-1 py-3 rounded-xl font-medium text-sm transition \${
                  added
                    ? "bg-green-600 text-white"
                    : "bg-gray-900 text-white hover:bg-gray-800"
                }\`}
              >
                {added ? "已加入購物車!" : "加入購物車"}
              </button>
              <button
                onClick={() => {
                  handleAddToCart();
                  router.push("/cart");
                }}
                className="flex-1 py-3 border-2 border-gray-900 text-gray-900 rounded-xl font-medium text-sm hover:bg-gray-50 transition"
              >
                立即購買
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`,
    },
    {
      path: "src/app/cart/page.tsx",
      content: `"use client";
import Link from "next/link";
import { useCartStore } from "@/lib/cart-store";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const totalPrice = useCartStore((s) => s.totalPrice);

  const shippingFee = totalPrice() >= 800 ? 0 : 80;
  const grandTotal = totalPrice() + shippingFee;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            AIGO 商城
          </Link>
          <Link href="/products" className="text-sm text-gray-600 hover:text-gray-900">
            繼續購物
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">購物車</h1>

        {items.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">您的購物車是空的</p>
            <Link
              href="/products"
              className="inline-block px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
            >
              去逛逛
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 購物車商品 */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">共 {items.length} 件商品</p>
                <button
                  onClick={clearCart}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  清空購物車
                </button>
              </div>
              {items.map((item) => (
                <div
                  key={\`\${item.product.id}-\${item.selectedSize}-\${item.selectedColor}\`}
                  className="bg-white rounded-xl shadow-sm p-4 flex gap-4"
                >
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-400 text-xs">
                    圖片
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{item.product.name}</h3>
                        <div className="text-xs text-gray-500 mt-1 space-x-2">
                          {item.selectedSize && <span>尺寸: {item.selectedSize}</span>}
                          {item.selectedColor && <span>顏色: {item.selectedColor}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="text-gray-400 hover:text-red-500 text-sm"
                      >
                        移除
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            updateQuantity(item.product.id, item.quantity - 1)
                          }
                          className="w-8 h-8 border rounded flex items-center justify-center hover:bg-gray-50"
                        >
                          -
                        </button>
                        <span className="text-sm font-medium w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.product.id, item.quantity + 1)
                          }
                          className="w-8 h-8 border rounded flex items-center justify-center hover:bg-gray-50"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-bold text-gray-900">
                        NT\${(item.product.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 訂單摘要 */}
            <div className="bg-white rounded-xl shadow-sm p-6 h-fit sticky top-20">
              <h2 className="font-bold text-gray-900 text-lg mb-4">訂單摘要</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">商品小計</span>
                  <span className="text-gray-900">NT\${totalPrice().toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">運費</span>
                  <span className={\`\${shippingFee === 0 ? "text-green-600" : "text-gray-900"}\`}>
                    {shippingFee === 0 ? "免運費" : \`NT$\${shippingFee}\`}
                  </span>
                </div>
                {shippingFee > 0 && (
                  <p className="text-xs text-gray-400">
                    再買 NT\${(800 - totalPrice()).toLocaleString()} 即可免運
                  </p>
                )}
                <hr />
                <div className="flex justify-between font-bold text-lg">
                  <span>合計</span>
                  <span className="text-red-600">NT\${grandTotal.toLocaleString()}</span>
                </div>
              </div>
              <Link
                href="/checkout"
                className="block w-full mt-6 py-3 bg-gray-900 text-white text-center rounded-xl font-medium hover:bg-gray-800 transition"
              >
                前往結帳
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
`,
    },
    {
      path: "src/app/checkout/page.tsx",
      content: `"use client";
import { useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/lib/cart-store";

export default function CheckoutPage() {
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const clearCart = useCartStore((s) => s.clearCart);

  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [shipping, setShipping] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    district: "",
    address: "",
    postalCode: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("credit-card");

  const shippingFee = totalPrice() >= 800 ? 0 : 80;
  const grandTotal = totalPrice() + shippingFee;

  const payments = [
    { id: "credit-card", name: "信用卡", desc: "Visa / MasterCard / JCB" },
    { id: "atm", name: "ATM 轉帳", desc: "付款期限 3 天" },
    { id: "cvs", name: "超商代碼繳費", desc: "付款期限 3 天" },
    { id: "cod", name: "貨到付款", desc: "加收 NT$30 手續費" },
  ];

  const handleSubmitOrder = () => {
    setSubmitted(true);
    clearCart();
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm p-10 text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">訂單已成立!</h1>
          <p className="text-gray-500 mb-2">訂單編號: ORD-{Date.now().toString(36).toUpperCase()}</p>
          <p className="text-sm text-gray-400 mb-6">我們將盡快為您處理出貨，感謝您的購買。</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
          >
            回到首頁
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">購物車是空的</h1>
          <Link href="/products" className="text-blue-600 hover:text-blue-800">
            去逛逛
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            AIGO 商城
          </Link>
          <Link href="/cart" className="text-sm text-gray-600 hover:text-gray-900">
            返回購物車
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* 步驟指示 */}
        <div className="flex items-center justify-center mb-8 gap-4">
          {["收貨資訊", "付款方式", "確認訂單"].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={\`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium \${
                  step > i + 1
                    ? "bg-green-600 text-white"
                    : step === i + 1
                    ? "bg-gray-900 text-white"
                    : "bg-gray-200 text-gray-500"
                }\`}
              >
                {step > i + 1 ? "\u2713" : i + 1}
              </div>
              <span className={\`text-sm \${step === i + 1 ? "font-medium text-gray-900" : "text-gray-500"}\`}>
                {label}
              </span>
              {i < 2 && <div className="w-12 h-px bg-gray-300" />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* 步驟 1: 收貨資訊 */}
            {step === 1 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">收貨資訊</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">收件人姓名</label>
                    <input value={shipping.name} onChange={(e) => setShipping({ ...shipping, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="請輸入姓名" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">聯絡電話</label>
                    <input value={shipping.phone} onChange={(e) => setShipping({ ...shipping, phone: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="09xx-xxx-xxx" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">電子郵件</label>
                    <input type="email" value={shipping.email} onChange={(e) => setShipping({ ...shipping, email: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="you@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">縣市</label>
                    <input value={shipping.city} onChange={(e) => setShipping({ ...shipping, city: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="台北市" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">鄉鎮區</label>
                    <input value={shipping.district} onChange={(e) => setShipping({ ...shipping, district: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="信義區" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">郵遞區號</label>
                    <input value={shipping.postalCode} onChange={(e) => setShipping({ ...shipping, postalCode: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="110" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">詳細地址</label>
                    <input value={shipping.address} onChange={(e) => setShipping({ ...shipping, address: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="請輸入街道門牌號碼" />
                  </div>
                </div>
                <button onClick={() => setStep(2)} className="mt-6 w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition">
                  下一步：選擇付款方式
                </button>
              </div>
            )}

            {/* 步驟 2: 付款方式 */}
            {step === 2 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">付款方式</h2>
                <div className="space-y-3">
                  {payments.map((p) => (
                    <label
                      key={p.id}
                      className={\`flex items-center gap-3 p-4 border rounded-lg cursor-pointer \${
                        paymentMethod === p.id ? "border-gray-900 bg-gray-50" : "hover:border-gray-400"
                      }\`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === p.id}
                        onChange={() => setPaymentMethod(p.id)}
                        className="w-4 h-4"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(1)} className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition">
                    上一步
                  </button>
                  <button onClick={() => setStep(3)} className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition">
                    下一步：確認訂單
                  </button>
                </div>
              </div>
            )}

            {/* 步驟 3: 確認訂單 */}
            {step === 3 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">確認訂單</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">收貨資訊</h3>
                    <p className="text-sm text-gray-600">{shipping.name} / {shipping.phone}</p>
                    <p className="text-sm text-gray-600">{shipping.postalCode} {shipping.city}{shipping.district}{shipping.address}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">付款方式</h3>
                    <p className="text-sm text-gray-600">{payments.find((p) => p.id === paymentMethod)?.name}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">訂購商品</h3>
                    {items.map((item) => (
                      <div key={\`\${item.product.id}-\${item.selectedSize}-\${item.selectedColor}\`} className="flex justify-between text-sm py-1">
                        <span className="text-gray-600">
                          {item.product.name} x{item.quantity}
                          {item.selectedSize && \` (\${item.selectedSize})\`}
                          {item.selectedColor && \` \${item.selectedColor}\`}
                        </span>
                        <span className="text-gray-900 font-medium">NT\${(item.product.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(2)} className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition">
                    上一步
                  </button>
                  <button onClick={handleSubmitOrder} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition">
                    確認下單 (NT\${grandTotal.toLocaleString()})
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 側邊訂單摘要 */}
          <div className="bg-white rounded-xl shadow-sm p-6 h-fit sticky top-8">
            <h2 className="font-bold text-gray-900 mb-4">訂單摘要</h2>
            <div className="space-y-2 text-sm">
              {items.map((item) => (
                <div key={\`\${item.product.id}-\${item.selectedSize}\`} className="flex justify-between">
                  <span className="text-gray-600 truncate flex-1">{item.product.name} x{item.quantity}</span>
                  <span className="text-gray-900 ml-2">NT\${(item.product.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
              <hr className="my-2" />
              <div className="flex justify-between">
                <span className="text-gray-600">商品小計</span>
                <span>NT\${totalPrice().toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">運費</span>
                <span className={shippingFee === 0 ? "text-green-600" : ""}>
                  {shippingFee === 0 ? "免運費" : \`NT$\${shippingFee}\`}
                </span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between font-bold text-lg">
                <span>合計</span>
                <span className="text-red-600">NT\${grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`,
    },
  ],
  requiredServices: [
    {
      category: "database",
      suggestedTypes: ["built_in_supabase", "postgresql"],
      purpose: "儲存商品與訂單",
    },
    {
      category: "payment",
      suggestedTypes: ["ecpay", "stripe"],
      purpose: "線上付款",
      optional: true,
    },
    {
      category: "storage",
      suggestedTypes: ["built_in_supabase", "s3"],
      purpose: "商品圖片",
      optional: true,
    },
  ],
};
