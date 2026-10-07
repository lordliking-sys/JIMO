export interface TokenProvider {
  getToken(refresh?: boolean): Promise<string | null>;
  unauthorized(): void;
}
let provider: TokenProvider | null = null;
let generation = 0;
export function configureTokenProvider(next: TokenProvider | null) {
  provider = next;
  generation++;
}
export const tokenProvider = () => provider;
export const authGeneration = () => generation;
