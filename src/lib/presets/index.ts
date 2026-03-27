import {
  FINANCE_EXPENSE_REPORT_PAGE,
  FINANCE_INVOICE_MANAGER_PAGE,
  FINANCE_BUDGET_TRACKER_PAGE,
  FINANCE_ACCOUNTS_RECEIVABLE_PAGE,
  FINANCE_ACCOUNTS_PAYABLE_PAGE,
  FINANCE_PAYROLL_PAGE,
  FINANCE_TAX_FILING_PAGE,
  FINANCE_CASHFLOW_PAGE,
} from "./nextjs/finance";
import {
  LEGAL_CONTRACT_MANAGER_PAGE,
  LEGAL_CASE_TRACKER_PAGE,
  LEGAL_COMPLIANCE_CHECKLIST_PAGE,
} from "./nextjs/legal";
import {
  SALES_CRM_PAGE,
  SALES_QUOTE_GENERATOR_PAGE,
  SALES_LEAD_TRACKER_PAGE,
  SALES_ORDER_MANAGEMENT_PAGE,
  SALES_COMMISSION_PAGE,
  SALES_VISIT_LOG_PAGE,
  SALES_TERRITORY_MAP_PAGE,
  SALES_PRODUCT_CATALOG_PAGE,
} from "./nextjs/sales";
import {
  HR_LEAVE_SYSTEM_PAGE,
  HR_RECRUITMENT_PAGE,
  HR_ONBOARDING_PAGE,
} from "./nextjs/hr";
import {
  MARKETING_CAMPAIGN_PAGE,
  MARKETING_CONTENT_CALENDAR_PAGE,
} from "./nextjs/marketing";
import {
  PM_TASK_BOARD_PAGE,
  PM_MEETING_NOTES_PAGE,
} from "./nextjs/pm";
import { IT_HELPDESK_PAGE } from "./nextjs/it";
import { OPS_INVENTORY_PAGE } from "./nextjs/ops";

import { LINEBOT_PAYMENT_NOTIFY } from "./linebot/finance";
import { LINEBOT_CONTRACT_ALERT } from "./linebot/legal";
import {
  LINEBOT_CUSTOMER_SERVICE,
  LINEBOT_ECOMMERCE,
  LINEBOT_ORDER_TRACKING,
} from "./linebot/sales";
import { LINEBOT_LEAVE } from "./linebot/hr";
import {
  LINEBOT_MEMBER_CARD,
  LINEBOT_SURVEY,
} from "./linebot/marketing";
import { LINEBOT_NOTIFICATION } from "./linebot/pm";
import { LINEBOT_FAQ } from "./linebot/it";
import { LINEBOT_BOOKING } from "./linebot/ops";

export interface PresetOverlay {
  files: Array<{ path: string; content: string }>;
  npmPackages?: string[];
}

const NEXTJS_PRESETS: Record<string, string> = {
  "finance-expense-report": FINANCE_EXPENSE_REPORT_PAGE,
  "finance-invoice-manager": FINANCE_INVOICE_MANAGER_PAGE,
  "finance-budget-tracker": FINANCE_BUDGET_TRACKER_PAGE,
  "finance-accounts-receivable": FINANCE_ACCOUNTS_RECEIVABLE_PAGE,
  "finance-accounts-payable": FINANCE_ACCOUNTS_PAYABLE_PAGE,
  "finance-payroll": FINANCE_PAYROLL_PAGE,
  "finance-tax-filing": FINANCE_TAX_FILING_PAGE,
  "finance-cashflow": FINANCE_CASHFLOW_PAGE,
  "legal-contract-manager": LEGAL_CONTRACT_MANAGER_PAGE,
  "legal-case-tracker": LEGAL_CASE_TRACKER_PAGE,
  "legal-compliance-checklist": LEGAL_COMPLIANCE_CHECKLIST_PAGE,
  "sales-crm": SALES_CRM_PAGE,
  "sales-quote-generator": SALES_QUOTE_GENERATOR_PAGE,
  "sales-lead-tracker": SALES_LEAD_TRACKER_PAGE,
  "sales-order-management": SALES_ORDER_MANAGEMENT_PAGE,
  "sales-commission": SALES_COMMISSION_PAGE,
  "sales-visit-log": SALES_VISIT_LOG_PAGE,
  "sales-territory-map": SALES_TERRITORY_MAP_PAGE,
  "sales-product-catalog": SALES_PRODUCT_CATALOG_PAGE,
  "hr-leave-system": HR_LEAVE_SYSTEM_PAGE,
  "hr-recruitment": HR_RECRUITMENT_PAGE,
  "hr-onboarding": HR_ONBOARDING_PAGE,
  "marketing-campaign": MARKETING_CAMPAIGN_PAGE,
  "marketing-content-calendar": MARKETING_CONTENT_CALENDAR_PAGE,
  "pm-task-board": PM_TASK_BOARD_PAGE,
  "pm-meeting-notes": PM_MEETING_NOTES_PAGE,
  "it-helpdesk": IT_HELPDESK_PAGE,
  "ops-inventory": OPS_INVENTORY_PAGE,
};

const LINEBOT_PRESETS: Record<string, string> = {
  "linebot-payment-notify": LINEBOT_PAYMENT_NOTIFY,
  "linebot-contract-alert": LINEBOT_CONTRACT_ALERT,
  "linebot-customer-service": LINEBOT_CUSTOMER_SERVICE,
  "linebot-ecommerce": LINEBOT_ECOMMERCE,
  "linebot-order-tracking": LINEBOT_ORDER_TRACKING,
  "linebot-leave": LINEBOT_LEAVE,
  "linebot-member-card": LINEBOT_MEMBER_CARD,
  "linebot-survey": LINEBOT_SURVEY,
  "linebot-notification": LINEBOT_NOTIFICATION,
  "linebot-faq": LINEBOT_FAQ,
  "linebot-booking": LINEBOT_BOOKING,
};

export function getPresetOverlay(presetId: string): PresetOverlay | null {
  if (NEXTJS_PRESETS[presetId]) {
    return {
      files: [{ path: "src/app/page.tsx", content: NEXTJS_PRESETS[presetId] }],
    };
  }
  if (LINEBOT_PRESETS[presetId]) {
    return {
      files: [{ path: "src/index.ts", content: LINEBOT_PRESETS[presetId] }],
    };
  }
  return null;
}
