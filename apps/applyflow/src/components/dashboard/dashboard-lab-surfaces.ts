export function shouldShowProviderConsentOnDashboard(): boolean {
  return true;
}

export function shouldShowInterviewLabExport(applicationCount: number): boolean {
  return applicationCount > 0;
}
