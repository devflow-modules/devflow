import { sendError } from "@/modules/financeiro/lib/api-response";
import { HOUSEHOLD_REF_NOT_FOUND } from "@/modules/financeiro/services/_shared/assertHouseholdRefs";

/** Same 404 for missing FK and cross-tenant FK — do not distinguish. */
export function sendHouseholdRefNotFound() {
  return sendError(
    "Recurso não encontrado ou não pertence à sua casa",
    404,
    undefined,
    HOUSEHOLD_REF_NOT_FOUND
  );
}
