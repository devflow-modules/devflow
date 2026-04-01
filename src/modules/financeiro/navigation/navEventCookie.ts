export type FinanceiroRedirectType = "from_landing" | "from_auth";

export type FinanceiroNavEventPayload = {
  source_path: string;
  target_path: string;
  has_last_route: boolean;
  redirect_type: FinanceiroRedirectType;
};
