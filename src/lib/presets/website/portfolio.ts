import type { PresetOverlay } from "../index";

const HOMEPAGE = `"use client";

import Link from "next/link";
import { portfolioData } from "@/lib/site-data";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <span className="text-xl font-bold text-gray-900">{portfolioData.personal.name}</span>
            <div className="hidden md:flex space-x-8">
              <Link href="/" className="text-gray-700 hover:text-indigo-600 font-medium">首頁</Link>
              <Link href="/projects" className="text-gray-700 hover:text-indigo-600 font-medium">作品集</Link>
              <Link href="/blog" className="text-gray-700 hover:text-indigo-600 font-medium">部落格</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-24 lg:py-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-indigo-600 font-medium mb-4">{portfolioData.personal.greeting}</p>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">{portfolioData.personal.name}</h1>
            <h2 className="text-2xl text-gray-500 mb-6">{portfolioData.personal.title}</h2>
            <p className="text-lg text-gray-600 mb-10 leading-relaxed">{portfolioData.personal.bio}</p>
            <div className="flex gap-4 flex-wrap">
              <Link href="/projects" className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition">
                瀏覽作品
              </Link>
              <a href={"mailto:" + portfolioData.personal.email} className="border-2 border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:border-indigo-600 hover:text-indigo-600 transition">
                聯絡我
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">精選作品</h2>
              <p className="text-gray-500">近期完成的代表性專案</p>
            </div>
            <Link href="/projects" className="text-indigo-600 font-medium hover:text-indigo-700">
              查看全部 &rarr;
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {portfolioData.featuredProjects.map((project, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition group">
                <div className="aspect-video bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-4xl">
                  {project.icon}
                </div>
                <div className="p-6">
                  <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">{project.category}</span>
                  <h3 className="text-lg font-semibold text-gray-900 mt-3 mb-2 group-hover:text-indigo-600 transition">{project.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{project.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Skills Section */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">專業技能</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {portfolioData.skills.map((group, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4">{group.category}</h3>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((skill, j) => (
                    <span key={j} className="text-sm bg-white text-gray-700 px-3 py-1 rounded-full border border-gray-200">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-20 bg-indigo-600 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">有專案想合作？</h2>
          <p className="text-indigo-100 mb-8 text-lg">歡迎來信討論您的想法，一起打造出色的數位體驗。</p>
          <a href={"mailto:" + portfolioData.personal.email} className="bg-white text-indigo-700 px-8 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition inline-block">
            寄信給我
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} {portfolioData.personal.name}. 保留所有權利。</p>
        </div>
      </footer>
    </div>
  );
}`;

const PROJECTS_PAGE = `"use client";

import { useState } from "react";
import Link from "next/link";
import { portfolioData } from "@/lib/site-data";

const categories = ["全部", "網頁設計", "品牌識別", "UI/UX", "行動裝置"];

export default function ProjectsPage() {
  const [activeCategory, setActiveCategory] = useState("全部");

  const filtered = activeCategory === "全部"
    ? portfolioData.projects
    : portfolioData.projects.filter((p) => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">{portfolioData.personal.name}</Link>
            <div className="hidden md:flex space-x-8">
              <Link href="/" className="text-gray-700 hover:text-indigo-600 font-medium">首頁</Link>
              <Link href="/projects" className="text-indigo-600 font-medium">作品集</Link>
              <Link href="/blog" className="text-gray-700 hover:text-indigo-600 font-medium">部落格</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Header */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">作品集</h1>
          <p className="text-gray-500 text-lg">精心設計的每一個專案，都承載著對品質的堅持</p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-8 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 flex-wrap justify-center">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={\`px-5 py-2 rounded-full text-sm font-medium transition \${
                  activeCategory === cat
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }\`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((project, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="aspect-[4/3] bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl overflow-hidden mb-4 flex items-center justify-center text-5xl group-hover:shadow-lg transition">
                  {project.icon}
                </div>
                <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                  {project.category}
                </span>
                <h3 className="text-lg font-semibold text-gray-900 mt-2 mb-1 group-hover:text-indigo-600 transition">
                  {project.title}
                </h3>
                <p className="text-gray-500 text-sm">{project.description}</p>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-20">此分類目前沒有作品</p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} {portfolioData.personal.name}. 保留所有權利。</p>
        </div>
      </footer>
    </div>
  );
}`;

const BLOG_PAGE = `"use client";

import Link from "next/link";
import { portfolioData } from "@/lib/site-data";

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">{portfolioData.personal.name}</Link>
            <div className="hidden md:flex space-x-8">
              <Link href="/" className="text-gray-700 hover:text-indigo-600 font-medium">首頁</Link>
              <Link href="/projects" className="text-gray-700 hover:text-indigo-600 font-medium">作品集</Link>
              <Link href="/blog" className="text-indigo-600 font-medium">部落格</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Header */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">部落格</h1>
          <p className="text-gray-500 text-lg">分享設計心得、技術筆記與產業觀察</p>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-10">
            {portfolioData.blogPosts.map((post, i) => (
              <article key={i} className="border-b border-gray-100 pb-10 last:border-0">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                    {post.category}
                  </span>
                  <span className="text-sm text-gray-400">{post.date}</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3 hover:text-indigo-600 transition cursor-pointer">
                  {post.title}
                </h2>
                <p className="text-gray-600 leading-relaxed">{post.excerpt}</p>
                <span className="inline-block mt-4 text-indigo-600 font-medium text-sm cursor-pointer hover:text-indigo-700">
                  閱讀全文 &rarr;
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} {portfolioData.personal.name}. 保留所有權利。</p>
        </div>
      </footer>
    </div>
  );
}`;

const SITE_DATA = `export const portfolioData = {
  personal: {
    name: "林柏翰",
    title: "資深 UI/UX 設計師 & 前端工程師",
    greeting: "你好，我是",
    bio: "擁有八年數位產品設計經驗，專注於使用者體驗設計與前端開發。擅長將複雜的商業需求轉化為直覺且美觀的數位介面，協助企業打造令人印象深刻的數位體驗。",
    email: "hello@bohan-lin.design",
  },
  featuredProjects: [
    {
      icon: "&#x1f3e0;",
      title: "好室家居 品牌官網",
      category: "網頁設計",
      description: "為高端家居品牌打造的形象官網，結合 3D 產品展示與流暢的瀏覽體驗。",
    },
    {
      icon: "&#x1f4b3;",
      title: "PayEasy 行動支付",
      category: "UI/UX",
      description: "行動支付 App 全面改版，優化付款流程，提升使用者轉換率 35%。",
    },
    {
      icon: "&#x1f33f;",
      title: "綠生活 品牌識別",
      category: "品牌識別",
      description: "有機食品品牌的完整識別系統設計，從 Logo 到包裝視覺。",
    },
  ],
  skills: [
    { category: "設計工具", items: ["Figma", "Sketch", "Adobe XD", "Photoshop", "Illustrator"] },
    { category: "前端技術", items: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Framer Motion"] },
    { category: "設計方法", items: ["使用者研究", "原型設計", "互動設計", "設計系統", "可用性測試"] },
    { category: "其他技能", items: ["Git", "Responsive Design", "SEO 優化", "動態圖形", "3D 建模"] },
  ],
  projects: [
    { icon: "&#x1f3e0;", title: "好室家居 品牌官網", category: "網頁設計", description: "為高端家居品牌打造的形象官網，結合 3D 產品展示與流暢的瀏覽體驗。" },
    { icon: "&#x1f4b3;", title: "PayEasy 行動支付", category: "UI/UX", description: "行動支付 App 全面改版，優化付款流程，提升使用者轉換率 35%。" },
    { icon: "&#x1f33f;", title: "綠生活 品牌識別", category: "品牌識別", description: "有機食品品牌的完整識別系統設計，從 Logo 到包裝視覺。" },
    { icon: "&#x1f4f1;", title: "健康日記 App", category: "行動裝置", description: "健康管理 App 的 UI/UX 設計，包含飲食記錄、運動追蹤與睡眠分析。" },
    { icon: "&#x2615;", title: "拾光咖啡 官方網站", category: "網頁設計", description: "精品咖啡品牌的電商網站設計，營造溫暖的品牌氛圍。" },
    { icon: "&#x1f3a8;", title: "ArtHub 藝術平台", category: "UI/UX", description: "線上藝廊平台的使用者介面設計，打造沉浸式觀展體驗。" },
    { icon: "&#x1f4d0;", title: "建築事務所 品牌重塑", category: "品牌識別", description: "知名建築事務所的品牌識別翻新，展現現代簡約的設計語言。" },
    { icon: "&#x1f6d2;", title: "鮮食到家 App", category: "行動裝置", description: "生鮮電商的行動 App 設計，強調快速下單與新鮮食材的視覺呈現。" },
    { icon: "&#x1f4bb;", title: "TechBoard 後台系統", category: "UI/UX", description: "SaaS 產品管理後台的設計系統建置，統一超過 50 個頁面的設計語言。" },
    { icon: "&#x1f308;", title: "童趣教育 網站", category: "網頁設計", description: "兒童線上教育平台的官方網站，活潑生動的插畫風格。" },
  ],
  blogPosts: [
    {
      title: "設計系統的建構指南：從零到一",
      date: "2024-03-15",
      category: "設計心得",
      excerpt: "分享在實際專案中建構設計系統的完整流程，包含元件規劃、命名規範、文件撰寫，以及如何讓設計與開發團隊高效協作。",
    },
    {
      title: "React Server Components 對前端設計的影響",
      date: "2024-02-28",
      category: "技術筆記",
      excerpt: "探討 React Server Components 如何改變前端架構思維，以及身為設計師需要了解的技術趨勢與互動設計上的調整。",
    },
    {
      title: "從使用者研究到設計決策：一個 B2B 產品的改版歷程",
      date: "2024-02-10",
      category: "案例分享",
      excerpt: "記錄一個 B2B SaaS 產品的完整改版過程，從使用者訪談、痛點歸納到設計驗證，如何用數據支持每個設計決策。",
    },
    {
      title: "2024 台灣設計產業趨勢觀察",
      date: "2024-01-20",
      category: "產業觀察",
      excerpt: "觀察台灣數位設計產業在 AI 工具興起後的變化，設計師的角色轉變，以及未來需要培養的核心能力。",
    },
    {
      title: "Tailwind CSS 與設計系統的完美結合",
      date: "2024-01-05",
      category: "技術筆記",
      excerpt: "分享如何運用 Tailwind CSS 的特性來實作設計系統，包含自訂主題、元件封裝與響應式設計的最佳實踐。",
    },
  ],
};`;

export const WEBSITE_PORTFOLIO: PresetOverlay = {
  templateId: "website",
  files: [
    { path: "src/app/page.tsx", content: HOMEPAGE },
    { path: "src/app/projects/page.tsx", content: PROJECTS_PAGE },
    { path: "src/app/blog/page.tsx", content: BLOG_PAGE },
    { path: "src/lib/site-data.ts", content: SITE_DATA },
  ],
  requiredServices: [
    {
      category: "storage",
      suggestedTypes: ["built_in_disk", "s3"],
      purpose: "作品圖片儲存",
      optional: true,
    },
  ],
};
