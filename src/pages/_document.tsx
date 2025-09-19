import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="description" content="Post-Op Radar - SMS-first post-operative patient monitoring for surgical practices" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />

        {/* Preload fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />

        {/* Meta tags for PWA-like behavior */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Post-Op Radar" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0F6FFF" />

        {/* OpenGraph tags */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Post-Op Radar" />
        <meta property="og:description" content="SMS-first post-operative patient monitoring for surgical practices" />
        <meta property="og:site_name" content="Post-Op Radar" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}