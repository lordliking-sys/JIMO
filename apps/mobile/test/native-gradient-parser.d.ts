/** Test-only contract; esbuild resolves this module to the installed native implementation. */
import type { ReactElement } from 'react';
export default function extractGradient(
  props: { id?: string; children?: ReactElement[] },
  parent: unknown,
): {
  gradient: number[];
  children: ReactElement<Record<string, unknown>>[];
} | null;
