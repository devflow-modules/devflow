import { describe, expect, it } from "vitest";
import { getFinanceiroRouteLabel } from "../routeLabels";
import { FINANCEIRO_BASE_PATH } from "../../constants";

describe("getFinanceiroRouteLabel", () => {
  it("mapeia rotas conhecidas", () => {
    expect(getFinanceiroRouteLabel(`${FINANCEIRO_BASE_PATH}/dashboard`)).toBe("Dashboard");
    expect(getFinanceiroRouteLabel(`${FINANCEIRO_BASE_PATH}/expenses`)).toBe("Lançamentos");
    expect(getFinanceiroRouteLabel(`${FINANCEIRO_BASE_PATH}/rules`)).toBe("Regras");
  });
});
