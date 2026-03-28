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

let _presets: Record<string, () => PresetOverlay> | null = null;

function getPresetRegistry(): Record<string, () => PresetOverlay> {
  if (_presets) return _presets;

  _presets = {
    // CRM
    "crm-sales-pipeline": () => require("./crm/sales-pipeline").CRM_SALES_PIPELINE,
    "crm-realestate": () => require("./crm/realestate").CRM_REALESTATE,
    "crm-client-portal": () => require("./crm/client-portal").CRM_CLIENT_PORTAL,

    // ERP
    "erp-retail": () => require("./erp/retail").ERP_RETAIL,
    "erp-realestate": () => require("./erp/realestate").ERP_REALESTATE,
    "erp-accounting": () => require("./erp/accounting").ERP_ACCOUNTING,

    // LINE Bot
    "linebot-customer-service": () => require("./linebot/customer-service").LINEBOT_CUSTOMER_SERVICE,
    "linebot-booking": () => require("./linebot/booking").LINEBOT_BOOKING,
    "linebot-order-notify": () => require("./linebot/order-notify").LINEBOT_ORDER_NOTIFY,
    "linebot-membership": () => require("./linebot/membership").LINEBOT_MEMBERSHIP,

    // Website
    "website-corporate": () => require("./website/corporate").WEBSITE_CORPORATE,
    "website-portfolio": () => require("./website/portfolio").WEBSITE_PORTFOLIO,
    "website-realestate": () => require("./website/realestate").WEBSITE_REALESTATE,

    // E-commerce
    "ecommerce-storefront": () => require("./ecommerce/storefront").ECOMMERCE_STOREFRONT,
    "ecommerce-order-mgmt": () => require("./ecommerce/order-mgmt").ECOMMERCE_ORDER_MGMT,

    // Booking
    "booking-appointment": () => require("./booking/appointment").BOOKING_APPOINTMENT,
    "booking-restaurant": () => require("./booking/restaurant").BOOKING_RESTAURANT,

    // Internal
    "internal-hr": () => require("./internal/hr").INTERNAL_HR,
    "internal-project": () => require("./internal/project").INTERNAL_PROJECT,
    "internal-helpdesk": () => require("./internal/helpdesk").INTERNAL_HELPDESK,

    // Dashboard
    "dashboard-analytics": () => require("./dashboard/analytics").DASHBOARD_ANALYTICS,
  };

  return _presets;
}

/* ---------- Public API ---------- */

export function getPresetOverlay(presetId: string): PresetOverlay | null {
  const registry = getPresetRegistry();
  const factory = registry[presetId];
  if (!factory) return null;
  return factory();
}

export function listPresetIds(): string[] {
  return Object.keys(getPresetRegistry());
}
