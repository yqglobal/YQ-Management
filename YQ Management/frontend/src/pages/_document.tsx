import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#006194" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Geist+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>
      <body className="antialiased bg-canvas dark:bg-dark-canvas text-on-surface dark:text-white font-body-md">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
