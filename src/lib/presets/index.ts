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
  // CRM
  "crm-sales-pipeline": () => import("./crm/sales-pipeline").then((m) => m.CRM_SALES_PIPELINE),
  "crm-realestate": () => import("./crm/realestate").then((m) => m.CRM_REALESTATE),
  "crm-client-portal": () => import("./crm/client-portal").then((m) => m.CRM_CLIENT_PORTAL),

  // ERP
  "erp-retail": () => import("./erp/retail").then((m) => m.ERP_RETAIL),
  "erp-realestate": () => import("./erp/realestate").then((m) => m.ERP_REALESTATE),
  "erp-accounting": () => import("./erp/accounting").then((m) => m.ERP_ACCOUNTING),

  // LINE Bot
  "linebot-customer-service": () => import("./linebot/customer-service").then((m) => m.LINEBOT_CUSTOMER_SERVICE),
  "linebot-booking": () => import("./linebot/booking").then((m) => m.LINEBOT_BOOKING),
  "linebot-order-notify": () => import("./linebot/order-notify").then((m) => m.LINEBOT_ORDER_NOTIFY),
  "linebot-membership": () => import("./linebot/membership").then((m) => m.LINEBOT_MEMBERSHIP),

  // Website
  "website-corporate": () => import("./website/corporate").then((m) => m.WEBSITE_CORPORATE),
  "website-portfolio": () => import("./website/portfolio").then((m) => m.WEBSITE_PORTFOLIO),
  "website-realestate": () => import("./website/realestate").then((m) => m.WEBSITE_REALESTATE),

  // E-commerce
  "ecommerce-storefront": () => import("./ecommerce/storefront").then((m) => m.ECOMMERCE_STOREFRONT),
  "ecommerce-order-mgmt": () => import("./ecommerce/order-mgmt").then((m) => m.ECOMMERCE_ORDER_MGMT),

  // Booking
  "booking-appointment": () => import("./booking/appointment").then((m) => m.BOOKING_APPOINTMENT),
  "booking-restaurant": () => import("./booking/restaurant").then((m) => m.BOOKING_RESTAURANT),

  // Internal
  "internal-hr": () => import("./internal/hr").then((m) => m.INTERNAL_HR),
  "internal-project": () => import("./internal/project").then((m) => m.INTERNAL_PROJECT),
  "internal-helpdesk": () => import("./internal/helpdesk").then((m) => m.INTERNAL_HELPDESK),

  // Dashboard
  "dashboard-analytics": () => import("./dashboard/analytics").then((m) => m.DASHBOARD_ANALYTICS),
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
