import type { ReactNode } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';
import { colors } from '@jimo/ui';
export default function RootHtml({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `html, body { background: ${colors.background}; color: ${colors.text}; }`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
