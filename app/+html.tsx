import type { ReactNode } from "react";

/**
 * Root HTML document wrapper for Expo Router.
 *
 * Adds inline background-color so the dark theme renders immediately
 * before React hydration, preventing a white flash.
 */
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        {/* Force dark background before JS loads to prevent white flash */}
        <style>{`
          html, body, #root {
            background-color: #050505 !important;
            min-height: 100vh;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
