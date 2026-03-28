"use client";

import { useTranslations } from "next-intl";
import { FileText, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarkdownContent } from "@/components/chat/markdown-content";
import { prdToMarkdown, type PRDData } from "@/lib/prd";
import { getCompatibleServiceTypes, isBuiltInServiceType } from "@/lib/service-types";
import type { ServiceType } from "@prisma/client";

interface ServiceInstance {
  id: string;
  name: string;
  type: string;
}

interface ServiceTestResult {
  success: boolean;
  message: string;
}

export interface PRDPanelProps {
  prdData: PRDData | null;
  requiredServiceTypes: string[];
  serviceInstances: ServiceInstance[];
  allowedServices: string[];
  selectedServices: Record<string, string>;
  onServiceChange: (serviceType: string, instanceId: string) => void;
  serviceTestResults: Record<string, ServiceTestResult | null>;
}

const SERVICE_TYPE_LABELS: Record<string, { zh: string; en: string }> = {
  postgresql: { zh: "資料庫 (PostgreSQL)", en: "Database (PostgreSQL)" },
  mysql: { zh: "資料庫 (MySQL)", en: "Database (MySQL)" },
  mongodb: { zh: "資料庫 (MongoDB)", en: "Database (MongoDB)" },
  s3: { zh: "檔案儲存 (S3)", en: "File Storage (S3)" },
  gcs: { zh: "檔案儲存 (GCS)", en: "File Storage (GCS)" },
  azure_blob: { zh: "檔案儲存 (Azure)", en: "File Storage (Azure)" },
  google_drive: { zh: "Google 雲端硬碟", en: "Google Drive" },
  stripe: { zh: "收款 (Stripe)", en: "Payment (Stripe)" },
  paypal: { zh: "收款 (PayPal)", en: "Payment (PayPal)" },
  ecpay: { zh: "收款 (綠界)", en: "Payment (ECPay)" },
  sendgrid: { zh: "寄信 (SendGrid)", en: "Email (SendGrid)" },
  ses: { zh: "寄信 (SES)", en: "Email (SES)" },
  mailgun: { zh: "寄信 (Mailgun)", en: "Email (Mailgun)" },
  twilio: { zh: "簡訊 (Twilio)", en: "SMS (Twilio)" },
  vonage: { zh: "簡訊 (Vonage)", en: "SMS (Vonage)" },
  aws_sns: { zh: "推播 (SNS)", en: "Push (SNS)" },
  auth0: { zh: "會員登入 (Auth0)", en: "Auth (Auth0)" },
  firebase_auth: { zh: "會員登入 (Firebase)", en: "Auth (Firebase)" },
  line_login: { zh: "LINE 登入", en: "LINE Login" },
  supabase: { zh: "全方位平台 (Supabase)", en: "Platform (Supabase)" },
  hasura: { zh: "全方位平台 (Hasura)", en: "Platform (Hasura)" },
  line_bot: { zh: "LINE 聊天機器人", en: "LINE Bot" },
  whatsapp: { zh: "WhatsApp", en: "WhatsApp" },
  discord: { zh: "Discord", en: "Discord" },
  telegram: { zh: "Telegram", en: "Telegram" },
  built_in_pg: { zh: "內建資料庫", en: "Built-in Database" },
  built_in_disk: { zh: "內建檔案儲存", en: "Built-in Storage" },
};

function getServiceLabel(type: string, locale: string): string {
  const entry = SERVICE_TYPE_LABELS[type];
  if (entry) return locale === "en" ? entry.en : entry.zh;
  return type;
}

function ServiceStatusIcon({ result }: { result: ServiceTestResult | null | undefined }) {
  if (result === undefined || result === null) {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
  }
  if (result.success) {
    return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
  }
  return <XCircle className="h-3.5 w-3.5 text-red-500" />;
}

export function PRDPanel({
  prdData,
  requiredServiceTypes,
  serviceInstances,
  allowedServices,
  selectedServices,
  onServiceChange,
  serviceTestResults,
}: PRDPanelProps) {
  const t = useTranslations("create");
  // Detect locale from the translation function — if prdTitle translation exists and starts with ASCII, it's likely English
  const prdTitle = t("prdTitle");
  const locale = /^[A-Z]/.test(prdTitle) ? "en" : "zh";

  return (
    <div className="hidden lg:flex w-96 shrink-0 flex-col gap-4 overflow-y-auto">
      {/* PRD Summary */}
      <Card className="flex-1 min-h-0 overflow-y-auto">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">{t("prdTitle")}</h3>
          </div>
          {prdData && (prdData.appName || prdData.features.length > 0) ? (
            <div className="text-sm">
              <MarkdownContent content={prdToMarkdown(prdData)} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("prdEmpty")}</p>
          )}
        </CardContent>
      </Card>

      {/* Service Selector */}
      {requiredServiceTypes.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-3">{t("servicesTitle")}</h3>
            <div className="space-y-3">
              {requiredServiceTypes.map((svcType) => {
                const isAllowed = allowedServices.includes(svcType);
                const compatibleTypes = getCompatibleServiceTypes(svcType as ServiceType);
                const instances = serviceInstances
                  .filter((s) => compatibleTypes.includes(s.type as ServiceType))
                  .sort((a, b) => {
                    const aBuiltIn = isBuiltInServiceType(a.type as ServiceType) ? 0 : 1;
                    const bBuiltIn = isBuiltInServiceType(b.type as ServiceType) ? 0 : 1;
                    return aBuiltIn - bBuiltIn;
                  });
                const selectedId = selectedServices[svcType] || "";
                const testResult = serviceTestResults[svcType];

                return (
                  <div key={svcType} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {getServiceLabel(svcType, locale)}
                      </span>
                      {selectedId && <ServiceStatusIcon result={testResult} />}
                    </div>

                    {!isAllowed ? (
                      <div className="flex items-center gap-1.5 text-xs text-red-500">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{t("serviceNotEnabled")}</span>
                      </div>
                    ) : instances.length === 0 ? (
                      <div className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{t("serviceNoInstance")}</span>
                      </div>
                    ) : instances.length === 1 ? (
                      <div className="text-xs text-foreground px-1">{instances[0].name}</div>
                    ) : (
                      <Select
                        value={selectedId}
                        onValueChange={(val) => onServiceChange(svcType, val)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {instances.map((inst) => (
                            <SelectItem key={inst.id} value={inst.id}>
                              {inst.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {testResult && !testResult.success && (
                      <div className="flex items-center gap-1.5 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-2 py-1.5 text-xs text-red-600 dark:text-red-400">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        <span>{testResult.message}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
