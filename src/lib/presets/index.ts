/* ---------- Preset types ---------- */

export interface PresetServiceRequirement {
  category: string;
  suggestedTypes: string[];
  purpose: string;
  optional?: boolean;
}

export interface PresetOverlay {
  /** System template ID (crm, erp, linebot, etc.) */
  templateId: string;
  files: Array<{ path: string; content: string }>;
  npmPackages?: string[];
  requiredServices?: PresetServiceRequirement[];
}

/* ---------- Lazy imports — resolved on first call ---------- */

const PRESET_LOADERS: Record<string, () => Promise<PresetOverlay>> = {
  // ── CRM ──────────────────────────────────────────────────
  "crm-sales-pipeline": () => import("./crm/sales-pipeline").then((m) => m.CRM_SALES_PIPELINE),
  "crm-realestate": () => import("./crm/realestate").then((m) => m.CRM_REALESTATE),
  "crm-client-portal": () => import("./crm/client-portal").then((m) => m.CRM_CLIENT_PORTAL),

  // ── ERP ──────────────────────────────────────────────────
  "erp-retail": () => import("./erp/retail").then((m) => m.ERP_RETAIL),
  "erp-realestate": () => import("./erp/realestate").then((m) => m.ERP_REALESTATE),
  "erp-accounting": () => import("./erp/accounting").then((m) => m.ERP_ACCOUNTING),

  // ── LINE Bot ─────────────────────────────────────────────
  "linebot-customer-service": () => import("./linebot/customer-service").then((m) => m.LINEBOT_CUSTOMER_SERVICE),
  "linebot-booking": () => import("./linebot/booking").then((m) => m.LINEBOT_BOOKING),
  "linebot-order-notify": () => import("./linebot/order-notify").then((m) => m.LINEBOT_ORDER_NOTIFY),
  "linebot-membership": () => import("./linebot/membership").then((m) => m.LINEBOT_MEMBERSHIP),

  // ── Website ──────────────────────────────────────────────
  "website-corporate": () => import("./website/corporate").then((m) => m.WEBSITE_CORPORATE),
  "website-portfolio": () => import("./website/portfolio").then((m) => m.WEBSITE_PORTFOLIO),
  "website-realestate": () => import("./website/realestate").then((m) => m.WEBSITE_REALESTATE),

  // ── E-commerce ───────────────────────────────────────────
  "ecommerce-storefront": () => import("./ecommerce/storefront").then((m) => m.ECOMMERCE_STOREFRONT),
  "ecommerce-order-mgmt": () => import("./ecommerce/order-mgmt").then((m) => m.ECOMMERCE_ORDER_MGMT),

  // ── Booking ──────────────────────────────────────────────
  "booking-appointment": () => import("./booking/appointment").then((m) => m.BOOKING_APPOINTMENT),
  "booking-restaurant": () => import("./booking/restaurant").then((m) => m.BOOKING_RESTAURANT),

  // ── Internal ─────────────────────────────────────────────
  "internal-hr": () => import("./internal/hr").then((m) => m.INTERNAL_HR),
  "internal-project": () => import("./internal/project").then((m) => m.INTERNAL_PROJECT),
  "internal-helpdesk": () => import("./internal/helpdesk").then((m) => m.INTERNAL_HELPDESK),

  // ── Dashboard ────────────────────────────────────────────
  "dashboard-analytics": () => import("./dashboard/analytics").then((m) => m.DASHBOARD_ANALYTICS),

  // ================================================================
  // UI preset aliases — map create-page preset IDs to overlay modules
  // ================================================================

  // Finance → ERP accounting
  "finance-expense-report": () => import("./erp/accounting").then((m) => m.ERP_ACCOUNTING),
  "finance-invoice-manager": () => import("./erp/accounting").then((m) => m.ERP_ACCOUNTING),
  "finance-budget-tracker": () => import("./erp/accounting").then((m) => m.ERP_ACCOUNTING),
  "finance-accounts-receivable": () => import("./erp/accounting").then((m) => m.ERP_ACCOUNTING),
  "finance-accounts-payable": () => import("./erp/accounting").then((m) => m.ERP_ACCOUNTING),
  "finance-payroll": () => import("./erp/accounting").then((m) => m.ERP_ACCOUNTING),
  "finance-tax-filing": () => import("./erp/accounting").then((m) => m.ERP_ACCOUNTING),
  "finance-cashflow": () => import("./erp/accounting").then((m) => m.ERP_ACCOUNTING),

  // Legal → internal helpdesk (case/ticket tracking)
  "legal-contract-manager": () => import("./internal/helpdesk").then((m) => m.INTERNAL_HELPDESK),
  "legal-case-tracker": () => import("./internal/helpdesk").then((m) => m.INTERNAL_HELPDESK),
  "legal-compliance-checklist": () => import("./internal/helpdesk").then((m) => m.INTERNAL_HELPDESK),

  // Sales → CRM sales pipeline
  "sales-crm": () => import("./crm/sales-pipeline").then((m) => m.CRM_SALES_PIPELINE),
  "sales-quote-generator": () => import("./crm/sales-pipeline").then((m) => m.CRM_SALES_PIPELINE),
  "sales-lead-tracker": () => import("./crm/sales-pipeline").then((m) => m.CRM_SALES_PIPELINE),
  "sales-order-management": () => import("./crm/sales-pipeline").then((m) => m.CRM_SALES_PIPELINE),
  "sales-commission": () => import("./crm/sales-pipeline").then((m) => m.CRM_SALES_PIPELINE),
  "sales-visit-log": () => import("./crm/sales-pipeline").then((m) => m.CRM_SALES_PIPELINE),
  "sales-territory-map": () => import("./crm/sales-pipeline").then((m) => m.CRM_SALES_PIPELINE),
  "sales-product-catalog": () => import("./erp/retail").then((m) => m.ERP_RETAIL),

  // HR → internal HR
  "hr-leave-system": () => import("./internal/hr").then((m) => m.INTERNAL_HR),
  "hr-recruitment": () => import("./internal/hr").then((m) => m.INTERNAL_HR),
  "hr-onboarding": () => import("./internal/hr").then((m) => m.INTERNAL_HR),

  // Marketing → dashboard analytics (campaign analytics) / internal project (content calendar)
  "marketing-campaign": () => import("./dashboard/analytics").then((m) => m.DASHBOARD_ANALYTICS),
  "marketing-content-calendar": () => import("./internal/project").then((m) => m.INTERNAL_PROJECT),

  // PM → internal project
  "pm-task-board": () => import("./internal/project").then((m) => m.INTERNAL_PROJECT),
  "pm-meeting-notes": () => import("./internal/project").then((m) => m.INTERNAL_PROJECT),

  // IT → internal helpdesk
  "it-helpdesk": () => import("./internal/helpdesk").then((m) => m.INTERNAL_HELPDESK),

  // Ops → ERP retail (inventory)
  "ops-inventory": () => import("./erp/retail").then((m) => m.ERP_RETAIL),

  // Real Estate → CRM realestate / ERP realestate
  "realestate-listing": () => import("./crm/realestate").then((m) => m.CRM_REALESTATE),
  "realestate-client-matching": () => import("./crm/realestate").then((m) => m.CRM_REALESTATE),
  "realestate-commission": () => import("./erp/realestate").then((m) => m.ERP_REALESTATE),
  "realestate-owner-negotiation": () => import("./crm/realestate").then((m) => m.CRM_REALESTATE),

  // LINE Bot aliases
  "linebot-payment-notify": () => import("./linebot/order-notify").then((m) => m.LINEBOT_ORDER_NOTIFY),
  "linebot-contract-alert": () => import("./linebot/customer-service").then((m) => m.LINEBOT_CUSTOMER_SERVICE),
  "linebot-ecommerce": () => import("./linebot/customer-service").then((m) => m.LINEBOT_CUSTOMER_SERVICE),
  "linebot-order-tracking": () => import("./linebot/order-notify").then((m) => m.LINEBOT_ORDER_NOTIFY),
  "linebot-leave": () => import("./linebot/customer-service").then((m) => m.LINEBOT_CUSTOMER_SERVICE),
  "linebot-member-card": () => import("./linebot/membership").then((m) => m.LINEBOT_MEMBERSHIP),
  "linebot-survey": () => import("./linebot/customer-service").then((m) => m.LINEBOT_CUSTOMER_SERVICE),
  "linebot-notification": () => import("./linebot/order-notify").then((m) => m.LINEBOT_ORDER_NOTIFY),
  "linebot-faq": () => import("./linebot/customer-service").then((m) => m.LINEBOT_CUSTOMER_SERVICE),
  "linebot-property-inquiry": () => import("./linebot/customer-service").then((m) => m.LINEBOT_CUSTOMER_SERVICE),
};

/* ---------- Public API ---------- */

export async function getPresetOverlay(presetId: string): Promise<PresetOverlay | null> {
  const loader = PRESET_LOADERS[presetId];
  if (!loader) return null;
  return loader();
}

export function listPresetIds(): string[] {
  return Object.keys(PRESET_LOADERS);
}
