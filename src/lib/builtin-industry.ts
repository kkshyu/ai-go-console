import type { ServiceType } from "@prisma/client";
import { isIndustryServiceType } from "./service-types";
import { handleRequest as handleRestaurant } from "./builtin-services/restaurant";
import { handleRequest as handleMedical } from "./builtin-services/medical";
import { handleRequest as handleBeauty } from "./builtin-services/beauty";
import { handleRequest as handleEducation } from "./builtin-services/education";
import { handleRequest as handleRealestate } from "./builtin-services/realestate";
import { handleRequest as handleFitness } from "./builtin-services/fitness";
import { handleRequest as handleRetail } from "./builtin-services/retail";
import { handleRequest as handleHospitality } from "./builtin-services/hospitality";
import { handleRequest as handleLegal } from "./builtin-services/legal";
import { handleRequest as handleAccounting } from "./builtin-services/accounting";
import { handleRequest as handleAutoRepair } from "./builtin-services/auto-repair";
import { handleRequest as handlePetCare } from "./builtin-services/pet-care";
import { handleRequest as handlePhotography } from "./builtin-services/photography";
import { handleRequest as handleCleaning } from "./builtin-services/cleaning";
import { handleRequest as handleLogistics } from "./builtin-services/logistics";

/**
 * Dispatch layer for industry built-in services.
 *
 * Each service is implemented independently in `./builtin-services/<industry>.ts`
 * and exports its own `handleRequest(body)` with service-specific API contract.
 * There is no shared request/response interface — each service defines its own.
 */

export interface ServiceResponse {
  status: number;
  body: unknown;
}

type RequestHandler = (body: Record<string, unknown>) => ServiceResponse;

const handlers: Partial<Record<ServiceType, RequestHandler>> = {
  built_in_restaurant: handleRestaurant,
  built_in_medical: handleMedical,
  built_in_beauty: handleBeauty,
  built_in_education: handleEducation,
  built_in_realestate: handleRealestate,
  built_in_fitness: handleFitness,
  built_in_retail: handleRetail,
  built_in_hospitality: handleHospitality,
  built_in_legal: handleLegal,
  built_in_accounting: handleAccounting,
  built_in_auto_repair: handleAutoRepair,
  built_in_pet_care: handlePetCare,
  built_in_photography: handlePhotography,
  built_in_cleaning: handleCleaning,
  built_in_logistics: handleLogistics,
};

/**
 * Route a request to the appropriate industry service handler.
 * The body is passed through as-is — each service defines its own API contract.
 */
export function dispatchIndustryRequest(
  serviceType: ServiceType,
  body: Record<string, unknown>
): ServiceResponse {
  if (!isIndustryServiceType(serviceType)) {
    return { status: 400, body: { error: `Not an industry service: ${serviceType}` } };
  }

  const handler = handlers[serviceType];
  if (!handler) {
    return { status: 404, body: { error: `No handler for: ${serviceType}` } };
  }

  return handler(body);
}
