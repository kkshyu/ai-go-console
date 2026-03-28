import type { PresetOverlay } from "../index";

const HOMEPAGE = `"use client";

import Link from "next/link";
import { realestateData } from "@/lib/site-data";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <span className="text-xl font-bold text-emerald-700">{realestateData.company.name}</span>
            <div className="hidden md:flex space-x-8">
              <Link href="/" className="text-gray-700 hover:text-emerald-600 font-medium">首頁</Link>
              <Link href="/listings" className="text-gray-700 hover:text-emerald-600 font-medium">物件搜尋</Link>
              <Link href="/about" className="text-gray-700 hover:text-emerald-600 font-medium">關於我們</Link>
              <Link href="/contact" className="text-gray-700 hover:text-emerald-600 font-medium">聯絡我們</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-emerald-700 to-emerald-900 text-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">{realestateData.hero.title}</h1>
          <p className="text-xl text-emerald-100 mb-10 max-w-2xl mx-auto">{realestateData.hero.subtitle}</p>
          <Link href="/listings" className="bg-white text-emerald-700 px-8 py-3 rounded-lg font-semibold hover:bg-emerald-50 transition inline-block">
            立即搜尋物件
          </Link>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">精選物件</h2>
              <p className="text-gray-500">為您嚴選的優質房產</p>
            </div>
            <Link href="/listings" className="text-emerald-600 font-medium hover:text-emerald-700">
              查看全部 &rarr;
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {realestateData.featuredListings.map((property, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition group">
                <div className="aspect-[4/3] bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center text-4xl relative">
                  &#x1f3e0;
                  <span className="absolute top-3 left-3 bg-emerald-600 text-white text-xs font-medium px-2.5 py-1 rounded-full">
                    {property.status}
                  </span>
                </div>
                <div className="p-5">
                  <p className="text-sm text-gray-500 mb-1">{property.address}</p>
                  <p className="text-xl font-bold text-emerald-700 mb-3">NT$ {property.price}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{property.bedrooms} 房</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                    <span>{property.size} 坪</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                    <span>{property.type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Advantages */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">我們的服務優勢</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {realestateData.advantages.map((adv, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-8 text-center hover:shadow-md transition">
                <div className="w-16 h-16 bg-emerald-100 rounded-full mx-auto mb-5 flex items-center justify-center text-2xl">
                  {adv.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{adv.title}</h3>
                <p className="text-gray-600 leading-relaxed">{adv.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Deals */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">成交實績</h2>
          <p className="text-gray-500 text-center mb-12">我們用成績說話，每一筆成交都是客戶的信任</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {realestateData.recentDeals.map((deal, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-6 text-center">
                <p className="text-sm text-gray-500 mb-1">{deal.area}</p>
                <p className="font-semibold text-gray-900 mb-1">{deal.type}</p>
                <p className="text-emerald-600 font-bold">NT$ {deal.price}</p>
                <p className="text-xs text-gray-400 mt-1">{deal.date} 成交</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agent Team */}
      <section className="py-20 bg-emerald-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">專業團隊</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {realestateData.agents.slice(0, 3).map((agent, i) => (
              <div key={i} className="text-center">
                <div className="w-24 h-24 bg-emerald-600 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-emerald-200">
                  {agent.name[0]}
                </div>
                <h3 className="text-lg font-semibold">{agent.name}</h3>
                <p className="text-emerald-200 text-sm mb-2">{agent.title}</p>
                <p className="text-emerald-100 text-sm">{agent.phone}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} {realestateData.company.name}. 版權所有。</p>
        </div>
      </footer>
    </div>
  );
}`;

const LISTINGS_PAGE = `"use client";

import { useState } from "react";
import Link from "next/link";
import { realestateData } from "@/lib/site-data";

const districts = ["全部", "信義區", "大安區", "中山區", "內湖區", "松山區", "中正區", "板橋區", "新店區", "三重區", "永和區"];
const propertyTypes = ["全部", "公寓", "大樓", "透天"];
const priceRanges = ["全部", "1,000萬以下", "1,000-2,000萬", "2,000-3,000萬", "3,000-5,000萬", "5,000萬以上"];
const sizeRanges = ["全部", "20坪以下", "20-30坪", "30-50坪", "50坪以上"];

function matchPriceRange(price: number, range: string): boolean {
  if (range === "全部") return true;
  const p = price / 10000;
  if (range === "1,000萬以下") return p < 1000;
  if (range === "1,000-2,000萬") return p >= 1000 && p < 2000;
  if (range === "2,000-3,000萬") return p >= 2000 && p < 3000;
  if (range === "3,000-5,000萬") return p >= 3000 && p < 5000;
  if (range === "5,000萬以上") return p >= 5000;
  return true;
}

function matchSizeRange(size: number, range: string): boolean {
  if (range === "全部") return true;
  if (range === "20坪以下") return size < 20;
  if (range === "20-30坪") return size >= 20 && size < 30;
  if (range === "30-50坪") return size >= 30 && size < 50;
  if (range === "50坪以上") return size >= 50;
  return true;
}

export default function ListingsPage() {
  const [district, setDistrict] = useState("全部");
  const [propertyType, setPropertyType] = useState("全部");
  const [priceRange, setPriceRange] = useState("全部");
  const [sizeRange, setSizeRange] = useState("全部");

  const filtered = realestateData.allListings.filter((p) => {
    if (district !== "全部" && !p.address.includes(district)) return false;
    if (propertyType !== "全部" && p.type !== propertyType) return false;
    if (!matchPriceRange(p.priceNum, priceRange)) return false;
    if (!matchSizeRange(p.sizeNum, sizeRange)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-xl font-bold text-emerald-700">{realestateData.company.name}</Link>
            <div className="hidden md:flex space-x-8">
              <Link href="/" className="text-gray-700 hover:text-emerald-600 font-medium">首頁</Link>
              <Link href="/listings" className="text-emerald-600 font-medium">物件搜尋</Link>
              <Link href="/about" className="text-gray-700 hover:text-emerald-600 font-medium">關於我們</Link>
              <Link href="/contact" className="text-gray-700 hover:text-emerald-600 font-medium">聯絡我們</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Filter Bar */}
      <section className="bg-white border-b border-gray-200 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">區域</label>
              <select value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none">
                {districts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">類型</label>
              <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none">
                {propertyTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">價格</label>
              <select value={priceRange} onChange={(e) => setPriceRange(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none">
                {priceRanges.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">坪數</label>
              <select value={sizeRange} onChange={(e) => setSizeRange(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none">
                {sizeRanges.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-3">共找到 {filtered.length} 筆物件</p>
        </div>
      </section>

      {/* Listings Grid */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((property, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition">
                <div className="aspect-[16/10] bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center text-4xl relative">
                  &#x1f3e0;
                  <span className={\`absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full \${
                    property.statusBadge === "新上架" ? "bg-emerald-600 text-white" :
                    property.statusBadge === "熱門" ? "bg-red-500 text-white" :
                    property.statusBadge === "降價" ? "bg-orange-500 text-white" :
                    "bg-gray-500 text-white"
                  }\`}>
                    {property.statusBadge}
                  </span>
                </div>
                <div className="p-5">
                  <p className="text-sm text-gray-500 mb-1">{property.address}</p>
                  <p className="text-xl font-bold text-emerald-700 mb-2">NT$ {property.price}</p>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                    <span>{property.size} 坪</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                    <span>{property.rooms}</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                    <span>{property.type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{property.floor}</span>
                    <button className="text-emerald-600 text-sm font-medium hover:text-emerald-700">
                      詳細資訊 &rarr;
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-20">沒有符合條件的物件</p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} {realestateData.company.name}. 版權所有。</p>
        </div>
      </footer>
    </div>
  );
}`;

const ABOUT_PAGE = `"use client";

import Link from "next/link";
import { realestateData } from "@/lib/site-data";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-xl font-bold text-emerald-700">{realestateData.company.name}</Link>
            <div className="hidden md:flex space-x-8">
              <Link href="/" className="text-gray-700 hover:text-emerald-600 font-medium">首頁</Link>
              <Link href="/listings" className="text-gray-700 hover:text-emerald-600 font-medium">物件搜尋</Link>
              <Link href="/about" className="text-emerald-600 font-medium">關於我們</Link>
              <Link href="/contact" className="text-gray-700 hover:text-emerald-600 font-medium">聯絡我們</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Header */}
      <section className="bg-gradient-to-br from-emerald-700 to-emerald-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">關於我們</h1>
          <p className="text-emerald-100 text-lg">深耕在地，專業服務，值得您的信賴</p>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">專業團隊</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {realestateData.agents.map((agent, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-6 text-center hover:shadow-md transition">
                <div className="w-24 h-24 bg-emerald-100 rounded-full mx-auto mb-4 flex items-center justify-center text-emerald-700 text-3xl font-bold">
                  {agent.name[0]}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
                <p className="text-emerald-600 text-sm mb-2">{agent.title}</p>
                <p className="text-gray-500 text-sm mb-3">{agent.phone}</p>
                <p className="text-gray-400 text-xs">{agent.specialty}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">服務區域</h2>
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <div className="aspect-video bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg flex items-center justify-center mb-6">
              <p className="text-gray-400 text-lg">服務區域地圖</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {realestateData.serviceAreas.map((area, i) => (
                <div key={i} className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{area.name}</p>
                  <p className="text-sm text-gray-500">{area.count} 筆在售物件</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Awards */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">榮譽與認證</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {realestateData.awards.map((award, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-6 text-center">
                <div className="text-3xl mb-3">{award.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{award.title}</h3>
                <p className="text-sm text-gray-500">{award.year}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} {realestateData.company.name}. 版權所有。</p>
        </div>
      </footer>
    </div>
  );
}`;

const CONTACT_PAGE = `"use client";

import { useState } from "react";
import Link from "next/link";
import { realestateData } from "@/lib/site-data";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "", phone: "", email: "", propertyType: "公寓", budget: "", area: "", message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-xl font-bold text-emerald-700">{realestateData.company.name}</Link>
            <div className="hidden md:flex space-x-8">
              <Link href="/" className="text-gray-700 hover:text-emerald-600 font-medium">首頁</Link>
              <Link href="/listings" className="text-gray-700 hover:text-emerald-600 font-medium">物件搜尋</Link>
              <Link href="/about" className="text-gray-700 hover:text-emerald-600 font-medium">關於我們</Link>
              <Link href="/contact" className="text-emerald-600 font-medium">聯絡我們</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Header */}
      <section className="bg-gradient-to-br from-emerald-700 to-emerald-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">聯絡我們</h1>
          <p className="text-emerald-100 text-lg">歡迎預約諮詢，讓我們為您找到理想的家</p>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Inquiry Form */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">預約諮詢</h2>
              {submitted ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                  <p className="text-green-700 text-lg font-medium">感謝您的諮詢！</p>
                  <p className="text-green-600 mt-2">我們的經紀人將在 24 小時內與您聯繫。</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
                      <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" placeholder="您的姓名" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">電話 *</label>
                      <input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" placeholder="0912-345-678" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">電子信箱</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" placeholder="email@example.com" />
                  </div>
                  <div className="grid sm:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">物件類型</label>
                      <select value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none">
                        <option>公寓</option>
                        <option>大樓</option>
                        <option>透天</option>
                        <option>店面</option>
                        <option>土地</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">預算範圍</label>
                      <input type="text" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" placeholder="例：2,000-3,000萬" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">偏好區域</label>
                      <input type="text" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" placeholder="例：大安區" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">其他需求說明</label>
                    <textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none" placeholder="請描述您的需求，例如：希望有陽台、近捷運站..." />
                  </div>
                  <button type="submit" className="bg-emerald-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition w-full sm:w-auto">
                    送出諮詢
                  </button>
                </form>
              )}
            </div>

            {/* Office Info */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">門市資訊</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">&#x1f4cd;</div>
                  <div>
                    <p className="font-medium text-gray-900">門市地址</p>
                    <p className="text-gray-600">{realestateData.contact.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">&#x1f4de;</div>
                  <div>
                    <p className="font-medium text-gray-900">聯絡電話</p>
                    <p className="text-gray-600">{realestateData.contact.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">&#x2709;&#xfe0f;</div>
                  <div>
                    <p className="font-medium text-gray-900">電子信箱</p>
                    <p className="text-gray-600">{realestateData.contact.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">&#x1f552;</div>
                  <div>
                    <p className="font-medium text-gray-900">營業時間</p>
                    <p className="text-gray-600">{realestateData.contact.businessHours}</p>
                  </div>
                </div>
              </div>

              <div className="mt-10 bg-gray-50 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-3">LINE 線上諮詢</h3>
                <p className="text-gray-600 text-sm">加入我們的官方 LINE，即時獲取最新物件資訊與專人服務。</p>
                <p className="text-emerald-600 font-medium mt-2">LINE ID: {realestateData.contact.lineId}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} {realestateData.company.name}. 版權所有。</p>
        </div>
      </footer>
    </div>
  );
}`;

const SITE_DATA = `export const realestateData = {
  company: {
    name: "宏遠不動產",
    slogan: "您的安家首選",
  },
  hero: {
    title: "找到您夢想中的家",
    subtitle: "深耕大台北地區超過十年，專業團隊為您提供最優質的購屋、售屋與租賃服務。",
  },
  featuredListings: [
    {
      address: "台北市信義區松仁路 88 號",
      price: "4,880 萬",
      bedrooms: 3,
      size: 42.5,
      type: "大樓",
      status: "新上架",
    },
    {
      address: "台北市大安區復興南路一段",
      price: "3,280 萬",
      bedrooms: 2,
      size: 35.8,
      type: "大樓",
      status: "熱門",
    },
    {
      address: "新北市板橋區文化路二段",
      price: "1,680 萬",
      bedrooms: 3,
      size: 28.6,
      type: "公寓",
      status: "降價",
    },
    {
      address: "新北市新店區中正路",
      price: "5,200 萬",
      bedrooms: 5,
      size: 85.0,
      type: "透天",
      status: "新上架",
    },
  ],
  advantages: [
    {
      icon: "&#x1f4b0;",
      title: "專業估價",
      description: "擁有國家認證估價師，透過大數據分析與實地勘查，為您的不動產提供最精準的市場估價。",
    },
    {
      icon: "&#x1f91d;",
      title: "成交保障",
      description: "嚴格的交易流程管控與法律審查，確保每一筆交易安全透明，保障買賣雙方的權益。",
    },
    {
      icon: "&#x2b50;",
      title: "售後服務",
      description: "成交不是結束，而是服務的開始。提供搬遷協助、裝修建議、社區資訊等全方位售後服務。",
    },
  ],
  recentDeals: [
    { area: "信義區", type: "三房大樓", price: "4,500 萬", date: "2024/03" },
    { area: "大安區", type: "兩房公寓", price: "2,800 萬", date: "2024/03" },
    { area: "中山區", type: "套房", price: "1,200 萬", date: "2024/02" },
    { area: "內湖區", type: "四房大樓", price: "3,600 萬", date: "2024/02" },
    { area: "板橋區", type: "三房公寓", price: "1,850 萬", date: "2024/02" },
    { area: "新店區", type: "透天別墅", price: "5,800 萬", date: "2024/01" },
    { area: "松山區", type: "兩房大樓", price: "2,950 萬", date: "2024/01" },
    { area: "中正區", type: "辦公室", price: "3,200 萬", date: "2024/01" },
  ],
  agents: [
    { name: "陳建宏", title: "資深經紀人 / 店長", phone: "0912-111-222", specialty: "信義區、大安區高端住宅" },
    { name: "林美慧", title: "資深經紀人", phone: "0923-333-444", specialty: "中山區、松山區公寓大樓" },
    { name: "王志明", title: "經紀人", phone: "0934-555-666", specialty: "內湖區、南港區科技園區" },
    { name: "張雅婷", title: "經紀人", phone: "0945-777-888", specialty: "板橋區、新店區首購族" },
  ],
  serviceAreas: [
    { name: "信義區", count: 24 },
    { name: "大安區", count: 31 },
    { name: "中山區", count: 18 },
    { name: "內湖區", count: 15 },
    { name: "松山區", count: 12 },
    { name: "板橋區", count: 22 },
    { name: "新店區", count: 14 },
    { name: "永和區", count: 9 },
  ],
  awards: [
    { icon: "&#x1f3c6;", title: "年度最佳不動產經紀公司", year: "2023" },
    { icon: "&#x1f4dc;", title: "內政部不動產經紀業合格認證", year: "2020" },
    { icon: "&#x2b50;", title: "Google 評價 4.9 星 - 超過 500 則評論", year: "2024" },
    { icon: "&#x1f91d;", title: "台北市不動產仲介公會優良會員", year: "2022" },
    { icon: "&#x1f4ca;", title: "年度成交金額突破 30 億元", year: "2023" },
    { icon: "&#x1f3e2;", title: "ISO 9001 品質管理認證", year: "2021" },
  ],
  allListings: [
    { address: "台北市信義區松仁路 88 號 12 樓", price: "4,880 萬", priceNum: 48800000, size: "42.5", sizeNum: 42.5, rooms: "3房2廳2衛", type: "大樓", floor: "12F/28F", statusBadge: "新上架" },
    { address: "台北市大安區復興南路一段 200 號 8 樓", price: "3,280 萬", priceNum: 32800000, size: "35.8", sizeNum: 35.8, rooms: "2房2廳1衛", type: "大樓", floor: "8F/14F", statusBadge: "熱門" },
    { address: "新北市板橋區文化路二段 50 號 5 樓", price: "1,680 萬", priceNum: 16800000, size: "28.6", sizeNum: 28.6, rooms: "3房1廳1衛", type: "公寓", floor: "5F/5F", statusBadge: "降價" },
    { address: "新北市新店區中正路 120 號", price: "5,200 萬", priceNum: 52000000, size: "85.0", sizeNum: 85.0, rooms: "5房3廳3衛", type: "透天", floor: "1-4F", statusBadge: "新上架" },
    { address: "台北市中山區南京東路二段 15 號 5 樓", price: "1,980 萬", priceNum: 19800000, size: "18.5", sizeNum: 18.5, rooms: "1房1廳1衛", type: "大樓", floor: "5F/12F", statusBadge: "熱門" },
    { address: "台北市內湖區瑞光路 513 巷 22 號 3 樓", price: "2,650 萬", priceNum: 26500000, size: "32.0", sizeNum: 32.0, rooms: "2房2廳1衛", type: "大樓", floor: "3F/8F", statusBadge: "新上架" },
    { address: "台北市松山區南京東路五段 88 號 10 樓", price: "3,980 萬", priceNum: 39800000, size: "38.2", sizeNum: 38.2, rooms: "3房2廳2衛", type: "大樓", floor: "10F/20F", statusBadge: "熱門" },
    { address: "新北市永和區永和路一段 200 號 3 樓", price: "1,350 萬", priceNum: 13500000, size: "22.0", sizeNum: 22.0, rooms: "2房1廳1衛", type: "公寓", floor: "3F/5F", statusBadge: "降價" },
    { address: "台北市中正區羅斯福路三段 100 號 7 樓", price: "2,880 萬", priceNum: 28800000, size: "30.5", sizeNum: 30.5, rooms: "2房2廳1衛", type: "大樓", floor: "7F/15F", statusBadge: "新上架" },
    { address: "新北市三重區重新路四段 60 號 4 樓", price: "1,180 萬", priceNum: 11800000, size: "24.8", sizeNum: 24.8, rooms: "3房1廳1衛", type: "公寓", floor: "4F/5F", statusBadge: "降價" },
    { address: "台北市信義區基隆路一段 180 號 15 樓", price: "5,680 萬", priceNum: 56800000, size: "55.0", sizeNum: 55.0, rooms: "4房2廳2衛", type: "大樓", floor: "15F/25F", statusBadge: "熱門" },
    { address: "新北市板橋區民生路三段 75 號 2 樓", price: "1,480 萬", priceNum: 14800000, size: "26.3", sizeNum: 26.3, rooms: "2房1廳1衛", type: "公寓", floor: "2F/5F", statusBadge: "新上架" },
  ],
  contact: {
    address: "台北市大安區忠孝東路四段 200 號 1 樓",
    phone: "02-2771-8888",
    email: "service@hongyuan-realty.com",
    businessHours: "週一至週日 09:00 - 21:00",
    lineId: "@hongyuan-realty",
  },
};`;

export const WEBSITE_REALESTATE: PresetOverlay = {
  templateId: "website",
  files: [
    { path: "src/app/page.tsx", content: HOMEPAGE },
    { path: "src/app/listings/page.tsx", content: LISTINGS_PAGE },
    { path: "src/app/about/page.tsx", content: ABOUT_PAGE },
    { path: "src/app/contact/page.tsx", content: CONTACT_PAGE },
    { path: "src/lib/site-data.ts", content: SITE_DATA },
  ],
  requiredServices: [
    {
      category: "storage",
      suggestedTypes: ["built_in_disk", "s3"],
      purpose: "物件照片儲存",
      optional: true,
    },
    {
      category: "industry",
      suggestedTypes: ["built_in_realestate"],
      purpose: "存取物件資料庫",
      optional: true,
    },
  ],
};
