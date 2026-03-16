/**
 * Shared testing utilities and mock factories.
 * Products can extend with their own mocks.
 */

export function noop(): void {}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
