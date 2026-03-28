import type { PresetOverlay } from "../index";

const HOMEPAGE = `"use client";

import Link from "next/link";
import { siteData } from "@/lib/site-data";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <span className="text-xl font-bold text-blue-700">{siteData.company.name}</span>
            <div className="hidden md:flex space-x-8">
              <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium">首頁</Link>
              <Link href="/about" className="text-gray-700 hover:text-blue-600 font-medium">關於我們</Link>
              <Link href="/services" className="text-gray-700 hover:text-blue-600 font-medium">服務項目</Link>
              <Link href="/contact" className="text-gray-700 hover:text-blue-600 font-medium">聯絡我們</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">{siteData.hero.title}</h1>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">{siteData.hero.subtitle}</p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link href="/services" className="bg-white text-blue-700 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition">
              {siteData.hero.ctaPrimary}
            </Link>
            <Link href="/contact" className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition">
              {siteData.hero.ctaSecondary}
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">為什麼選擇我們</h2>
          <p className="text-gray-500 text-center mb-12 max-w-2xl mx-auto">我們致力於為客戶提供最優質的服務與解決方案</p>
          <div className="grid md:grid-cols-3 gap-8">
            {siteData.features.map((feature, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {siteData.stats.map((stat, i) => (
              <div key={i}>
                <p className="text-4xl font-bold mb-2">{stat.value}</p>
                <p className="text-blue-200">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">客戶好評</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {siteData.testimonials.map((t, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-8">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold text-lg">
                    {t.name[0]}
                  </div>
                  <div className="ml-4">
                    <p className="font-semibold text-gray-900">{t.name}</p>
                    <p className="text-sm text-gray-500">{t.role}</p>
                  </div>
                </div>
                <p className="text-gray-600 leading-relaxed italic">&ldquo;{t.content}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">{siteData.cta.title}</h2>
          <p className="text-gray-300 mb-8">{siteData.cta.subtitle}</p>
          <Link href="/contact" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
            {siteData.cta.buttonText}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} {siteData.company.name}. 版權所有。</p>
        </div>
      </footer>
    </div>
  );
}`;

const ABOUT_PAGE = `"use client";

import Link from "next/link";
import { siteData } from "@/lib/site-data";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-xl font-bold text-blue-700">{siteData.company.name}</Link>
            <div className="hidden md:flex space-x-8">
              <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium">首頁</Link>
              <Link href="/about" className="text-blue-600 font-medium">關於我們</Link>
              <Link href="/services" className="text-gray-700 hover:text-blue-600 font-medium">服務項目</Link>
              <Link href="/contact" className="text-gray-700 hover:text-blue-600 font-medium">聯絡我們</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Header */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">關於我們</h1>
          <p className="text-blue-100 text-lg">了解我們的故事、理念與團隊</p>
        </div>
      </section>

      {/* Company Story */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">公司故事</h2>
          <div className="prose prose-lg text-gray-600 space-y-4">
            {siteData.about.story.map((paragraph, i) => (
              <p key={i} className="leading-relaxed">{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">核心團隊</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {siteData.about.team.map((member, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-6 text-center hover:shadow-md transition">
                <div className="w-24 h-24 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center text-blue-700 text-3xl font-bold">
                  {member.name[0]}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                <p className="text-blue-600 text-sm mb-3">{member.role}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">發展歷程</h2>
          <div className="space-y-8">
            {siteData.about.milestones.map((milestone, i) => (
              <div key={i} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {milestone.year}
                  </div>
                  {i < siteData.about.milestones.length - 1 && <div className="w-0.5 h-full bg-blue-200 mt-2" />}
                </div>
                <div className="pb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{milestone.title}</h3>
                  <p className="text-gray-600">{milestone.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} {siteData.company.name}. 版權所有。</p>
        </div>
      </footer>
    </div>
  );
}`;

const SERVICES_PAGE = `"use client";

import Link from "next/link";
import { siteData } from "@/lib/site-data";

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-xl font-bold text-blue-700">{siteData.company.name}</Link>
            <div className="hidden md:flex space-x-8">
              <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium">首頁</Link>
              <Link href="/about" className="text-gray-700 hover:text-blue-600 font-medium">關於我們</Link>
              <Link href="/services" className="text-blue-600 font-medium">服務項目</Link>
              <Link href="/contact" className="text-gray-700 hover:text-blue-600 font-medium">聯絡我們</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Header */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">服務項目</h1>
          <p className="text-blue-100 text-lg">全方位的專業解決方案，助您達成商業目標</p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {siteData.services.map((service, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-8 hover:shadow-lg transition group">
                <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center text-2xl mb-5 group-hover:bg-blue-600 group-hover:text-white transition">
                  {service.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{service.title}</h3>
                <p className="text-gray-600 mb-5 leading-relaxed">{service.description}</p>
                <ul className="space-y-2">
                  {service.features.map((feature, j) => (
                    <li key={j} className="flex items-center text-sm text-gray-500">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-3 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">需要客製化方案？</h2>
          <p className="text-gray-500 mb-8">歡迎與我們聯繫，討論您的需求</p>
          <Link href="/contact" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
            立即諮詢
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} {siteData.company.name}. 版權所有。</p>
        </div>
      </footer>
    </div>
  );
}`;

const CONTACT_PAGE = `"use client";

import { useState } from "react";
import Link from "next/link";
import { siteData } from "@/lib/site-data";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
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
            <Link href="/" className="text-xl font-bold text-blue-700">{siteData.company.name}</Link>
            <div className="hidden md:flex space-x-8">
              <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium">首頁</Link>
              <Link href="/about" className="text-gray-700 hover:text-blue-600 font-medium">關於我們</Link>
              <Link href="/services" className="text-gray-700 hover:text-blue-600 font-medium">服務項目</Link>
              <Link href="/contact" className="text-blue-600 font-medium">聯絡我們</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Header */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">聯絡我們</h1>
          <p className="text-blue-100 text-lg">有任何問題或需求，歡迎隨時與我們聯繫</p>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">聯絡表單</h2>
              {submitted ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                  <p className="text-green-700 text-lg font-medium">感謝您的來信！</p>
                  <p className="text-green-600 mt-2">我們將在 1-2 個工作日內回覆您。</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
                      <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="您的姓名" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">電子信箱 *</label>
                      <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="email@example.com" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">電話</label>
                      <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="02-1234-5678" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">主旨 *</label>
                      <input type="text" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="諮詢主題" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">訊息內容 *</label>
                    <textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none" placeholder="請描述您的需求或問題..." />
                  </div>
                  <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition w-full sm:w-auto">
                    送出訊息
                  </button>
                </form>
              )}
            </div>

            {/* Office Info */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">聯絡資訊</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 shrink-0">&#x1f4cd;</div>
                  <div>
                    <p className="font-medium text-gray-900">辦公室地址</p>
                    <p className="text-gray-600">{siteData.contact.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 shrink-0">&#x1f4de;</div>
                  <div>
                    <p className="font-medium text-gray-900">聯絡電話</p>
                    <p className="text-gray-600">{siteData.contact.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 shrink-0">&#x2709;&#xfe0f;</div>
                  <div>
                    <p className="font-medium text-gray-900">電子信箱</p>
                    <p className="text-gray-600">{siteData.contact.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 shrink-0">&#x1f552;</div>
                  <div>
                    <p className="font-medium text-gray-900">營業時間</p>
                    <p className="text-gray-600">{siteData.contact.businessHours}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} {siteData.company.name}. 版權所有。</p>
        </div>
      </footer>
    </div>
  );
}`;

const SITE_DATA = `export const siteData = {
  company: {
    name: "鼎新科技股份有限公司",
    slogan: "數位轉型的最佳夥伴",
  },
  hero: {
    title: "以科技驅動企業成長",
    subtitle: "我們提供全方位的數位轉型解決方案，協助企業提升效率、降低成本、開創新局。",
    ctaPrimary: "了解服務",
    ctaSecondary: "聯絡我們",
  },
  features: [
    {
      icon: "&#x1f4ca;",
      title: "數據驅動決策",
      description: "透過大數據分析與 AI 技術，將企業資料轉化為可執行的商業洞察，協助高層做出精準決策。",
    },
    {
      icon: "&#x2601;&#xfe0f;",
      title: "雲端架構規劃",
      description: "為企業量身打造雲端遷移策略，確保系統穩定性與擴展性，同時優化營運成本。",
    },
    {
      icon: "&#x1f512;",
      title: "資安防護方案",
      description: "完善的資訊安全架構，從端點防護到雲端安全，全面守護企業數位資產。",
    },
  ],
  stats: [
    { value: "15+", label: "年豐富經驗" },
    { value: "500+", label: "服務企業客戶" },
    { value: "1,200+", label: "成功專案" },
    { value: "98%", label: "客戶滿意度" },
  ],
  testimonials: [
    {
      name: "王建明",
      role: "台灣電子 執行長",
      content: "鼎新科技協助我們完成數位轉型，系統整合的效果超出預期，大幅提升了營運效率。",
    },
    {
      name: "林淑芬",
      role: "綠能科技 資訊長",
      content: "專業的顧問團隊深入了解我們的需求，提供的雲端架構方案非常穩定可靠。",
    },
    {
      name: "陳志豪",
      role: "新創科技 技術總監",
      content: "從前期規劃到後期維運，鼎新科技始終提供卓越的技術支援，是值得信賴的合作夥伴。",
    },
  ],
  cta: {
    title: "準備好開啟數位轉型了嗎？",
    subtitle: "立即與我們的顧問團隊聯繫，量身規劃最適合您的解決方案。",
    buttonText: "免費諮詢",
  },
  about: {
    story: [
      "鼎新科技成立於 2009 年，由一群充滿熱情的技術專家共同創立。我們深信科技是推動企業成長的關鍵力量。",
      "十五年來，我們從最初的三人團隊發展為超過百人的專業顧問公司，服務範疇涵蓋製造業、金融業、零售業及醫療產業。",
      "我們始終秉持「以客戶為本、以品質為先」的經營理念，致力於為每一位客戶提供最優質的數位轉型服務。",
    ],
    team: [
      { name: "張宏達", role: "執行長暨創辦人", bio: "擁有 20 年科技產業經驗，曾任職於國際知名科技公司，專精企業策略規劃與數位轉型。" },
      { name: "李美玲", role: "技術長", bio: "資深雲端架構師，帶領技術團隊完成超過 300 個專案，擅長大規模系統設計。" },
      { name: "陳家偉", role: "營運長", bio: "具備豐富的專案管理與企業營運經驗，確保每個專案準時交付並超越客戶期望。" },
      { name: "黃雅琪", role: "行銷總監", bio: "數位行銷專家，負責品牌策略與市場開發，推動公司持續成長。" },
    ],
    milestones: [
      { year: "2009", title: "公司成立", description: "三位創辦人在台北市成立鼎新科技，專注於企業系統整合服務。" },
      { year: "2013", title: "雲端服務啟航", description: "正式推出雲端架構顧問服務，協助企業進行雲端遷移。" },
      { year: "2016", title: "突破百人規模", description: "團隊成長至 100 人，服務客戶突破 200 家。" },
      { year: "2019", title: "AI 解決方案", description: "成立 AI 研發中心，推出智慧數據分析與預測服務。" },
      { year: "2022", title: "國際市場拓展", description: "服務延伸至東南亞市場，設立新加坡辦公室。" },
      { year: "2024", title: "永續科技", description: "推出綠色科技服務線，協助企業實現 ESG 永續目標。" },
    ],
  },
  services: [
    {
      icon: "&#x1f4ca;",
      title: "大數據分析",
      description: "運用先進的數據分析技術，協助企業從海量資料中挖掘商業價值與市場趨勢。",
      features: ["資料倉儲建置", "商業智慧報表", "預測分析模型", "即時數據監控"],
    },
    {
      icon: "&#x2601;&#xfe0f;",
      title: "雲端架構服務",
      description: "提供完整的雲端遷移與架構設計服務，確保企業系統的穩定性與可擴展性。",
      features: ["雲端遷移規劃", "混合雲架構", "容器化部署", "自動化維運"],
    },
    {
      icon: "&#x1f512;",
      title: "資安防護",
      description: "建構全方位的資訊安全防護體系，保護企業的核心數位資產免受威脅。",
      features: ["弱點掃描評估", "滲透測試", "SOC 監控中心", "合規稽核輔導"],
    },
    {
      icon: "&#x1f916;",
      title: "AI 智慧應用",
      description: "開發客製化 AI 解決方案，從自然語言處理到電腦視覺，全面提升企業智能化。",
      features: ["智慧客服機器人", "文件自動化處理", "影像辨識系統", "推薦引擎開發"],
    },
    {
      icon: "&#x1f4f1;",
      title: "數位產品開發",
      description: "從需求分析到上線維運，提供完整的數位產品開發流程。",
      features: ["使用者研究", "UI/UX 設計", "敏捷開發", "持續整合部署"],
    },
    {
      icon: "&#x1f4c8;",
      title: "數位轉型顧問",
      description: "深入了解企業現況，量身規劃數位轉型藍圖，陪伴企業走過每個轉型階段。",
      features: ["現況診斷分析", "轉型策略規劃", "變革管理輔導", "成效追蹤評估"],
    },
  ],
  contact: {
    address: "台北市信義區松仁路 100 號 15 樓",
    phone: "02-2345-6789",
    email: "contact@dingxin-tech.com",
    businessHours: "週一至週五 09:00 - 18:00",
  },
};`;

export const WEBSITE_CORPORATE: PresetOverlay = {
  templateId: "website",
  files: [
    { path: "src/app/page.tsx", content: HOMEPAGE },
    { path: "src/app/about/page.tsx", content: ABOUT_PAGE },
    { path: "src/app/services/page.tsx", content: SERVICES_PAGE },
    { path: "src/app/contact/page.tsx", content: CONTACT_PAGE },
    { path: "src/lib/site-data.ts", content: SITE_DATA },
  ],
  requiredServices: [
    {
      category: "storage",
      suggestedTypes: ["built_in_disk", "s3"],
      purpose: "圖片與資源儲存",
      optional: true,
    },
  ],
};
