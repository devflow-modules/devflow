export const resolveHouseholdId = (searchParams: URLSearchParams) => {
  const fallbackId =
    process.env.NEXT_PUBLIC_DEFAULT_HOUSEHOLD_ID ?? "household-demo";
  return searchParams.get("householdId") ?? fallbackId;
};
