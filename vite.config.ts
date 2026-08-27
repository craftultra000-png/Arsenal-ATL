import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { INDEXABLE_SEO_PAGES, SEO_BY_PATH, SEO_IMAGE_PATH, SEO_LAST_MODIFIED, SEO_PAGES, SEO_SITE_ORIGIN, type SeoPage } from './src/shared/seo';

const page = (path: string) => resolve(import.meta.dirname, path);
const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless'
};
const serviceWorkerTemplate = readFileSync(page('src/shared/service-worker.template.js'), 'utf8');
const cacheableExtensions = new Set(['.css', '.html', '.js', '.json', '.mjs', '.ts', '.wasm', '.png', '.svg', '.webp', '.ico', '.webmanifest']);
const excludedDefaultPrecache = ['/assets/runtime/onnx/'];
const applicationRoutes = [
  '/', '/guide/', '/settings/',
  '/tools/video-editor/', '/tools/video-compressor/', '/tools/video-to-audio/',
  '/tools/audio-converter/', '/tools/noise-remover/', '/tools/audio-rate/',
  '/tools/image-editor/', '/tools/background-remover/', '/tools/image-compressor/',
  '/tools/pdf-create/', '/tools/pdf-compressor/', '/tools/pdf-editor/',
  '/tools/text-encryption/', '/tools/text-filter/', '/tools/text-comparison/',
  '/tools/qr-generator/', '/tools/archive-encryption/', '/tools/local-share/'
];

function siteFiles(directory: string, urlPrefix = ''): string[] {
  if (!existsSync(directory)) return [];
  const result: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    const nextPrefix = `${urlPrefix}/${entry.name}`;
    if (entry.isDirectory()) result.push(...siteFiles(absolute, nextPrefix));
    else if (cacheableExtensions.has(extname(entry.name)) && !excludedDefaultPrecache.some((prefix) => nextPrefix.startsWith(prefix))) result.push(nextPrefix);
  }
  return result;
}

function workerSource(precache: string[], revision = ''): string {
  const version = createHash('sha256').update(`${precache.join('|')}|${serviceWorkerTemplate}|${revision}`).digest('hex').slice(0, 12);
  return serviceWorkerTemplate
    .replace('__ARSENAL_CACHE_VERSION__', version)
    .replace('__ARSENAL_PRECACHE__', JSON.stringify(precache));
}

function absoluteSiteUrl(path: string): string {
  return `${SEO_SITE_ORIGIN}${path}`;
}

function normalizedPagePath(pathname: string): string {
  const withoutIndex = pathname === '/index.html' ? '/' : pathname.replace(/\/index\.html$/, '/');
  return withoutIndex === '/' ? '/' : (withoutIndex.endsWith('/') ? withoutIndex : `${withoutIndex}/`);
}

function structuredData(page: SeoPage): Record<string, unknown> | undefined {
  const url = absoluteSiteUrl(page.path);
  const webPage = {
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: page.name,
    description: page.description,
    inLanguage: 'ar',
    isPartOf: { '@id': `${SEO_SITE_ORIGIN}/#website` }
  };

  if (page.kind === 'settings') return undefined;
  if (page.kind === 'home') {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${SEO_SITE_ORIGIN}/#website`,
          url: absoluteSiteUrl('/'),
          name: 'Arsenal ATL',
          alternateName: 'الترسانة',
          inLanguage: 'ar'
        },
        webPage,
        {
          '@type': 'WebApplication',
          name: 'Arsenal ATL',
          alternateName: 'الترسانة',
          url,
          description: page.description,
          applicationCategory: 'MultimediaApplication',
          operatingSystem: 'Web Browser',
          isAccessibleForFree: true,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          image: absoluteSiteUrl(SEO_IMAGE_PATH),
          inLanguage: 'ar'
        }
      ]
    };
  }
  if (page.kind === 'guide') {
    const tools = SEO_PAGES.filter((item) => item.kind === 'tool');
    return {
      '@context': 'https://schema.org',
      '@graph': [
        webPage,
        {
          '@type': 'CollectionPage',
          name: page.name,
          url,
          description: page.description,
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: tools.length,
            itemListElement: tools.map((tool, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: tool.name,
              url: absoluteSiteUrl(tool.path)
            }))
          },
          inLanguage: 'ar'
        }
      ]
    };
  }
  return {
    '@context': 'https://schema.org',
    '@graph': [
      webPage,
      {
        '@type': 'SoftwareApplication',
        name: page.name,
        url,
        description: page.description,
        applicationCategory: page.applicationCategory,
        operatingSystem: 'Web Browser',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        image: absoluteSiteUrl(SEO_IMAGE_PATH),
        inLanguage: 'ar',
        browserRequirements: 'يتطلب متصفح ويب حديثاً مع تفعيل JavaScript.'
      }
    ]
  };
}

function sitemapXml(): string {
  const entries = INDEXABLE_SEO_PAGES.map((page) => `  <url>\n    <loc>${absoluteSiteUrl(page.path)}</loc>\n    <lastmod>${SEO_LAST_MODIFIED}</lastmod>\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
}

function noScriptContent(page: SeoPage): string {
  const guideLink = page.path === '/guide/' ? '' : '<p><a href="/guide/" style="color:#00d4aa">افتح دليل الأدوات</a></p>';
  return `<noscript><main style="max-width:720px;margin:0 auto;padding:32px;background:#070b12;color:#f0f6ff;font-family:system-ui;text-align:right;line-height:1.7" dir="rtl"><img src="${SEO_IMAGE_PATH}" width="72" height="72" alt="Arsenal ATL" style="display:block;margin:0 0 16px auto"><h1>${escapeHtml(page.name)}</h1><p>${escapeHtml(page.description)}</p><p>تعمل أدوات Arsenal داخل المتصفح وتعالج الملفات محلياً على جهازك. فعّل JavaScript لاستخدام الأداة أو فتح الواجهة التفاعلية.</p>${guideLink}</main></noscript>`;
}

function searchTags(page: SeoPage) {
  const url = absoluteSiteUrl(page.path);
  const schema = structuredData(page);
  const image = absoluteSiteUrl(SEO_IMAGE_PATH);
  return [
    { tag: 'title', children: page.title, injectTo: 'head' as const },
    { tag: 'meta', attrs: { name: 'description', content: page.description }, injectTo: 'head' as const },
    { tag: 'meta', attrs: { name: 'robots', content: page.noIndex ? 'noindex, follow' : 'index, follow' }, injectTo: 'head' as const },
    { tag: 'link', attrs: { rel: 'canonical', href: url }, injectTo: 'head' as const },
    { tag: 'meta', attrs: { property: 'og:type', content: 'website' }, injectTo: 'head' as const },
    { tag: 'meta', attrs: { property: 'og:url', content: url }, injectTo: 'head' as const },
    { tag: 'meta', attrs: { property: 'og:title', content: page.title }, injectTo: 'head' as const },
    { tag: 'meta', attrs: { property: 'og:description', content: page.description }, injectTo: 'head' as const },
    { tag: 'meta', attrs: { property: 'og:image', content: image }, injectTo: 'head' as const },
    { tag: 'meta', attrs: { property: 'og:image:width', content: '1024' }, injectTo: 'head' as const },
    { tag: 'meta', attrs: { property: 'og:image:height', content: '1024' }, injectTo: 'head' as const },
    { tag: 'meta', attrs: { property: 'og:image:alt', content: page.name }, injectTo: 'head' as const },
    { tag: 'meta', attrs: { property: 'og:locale', content: 'ar_AR' }, injectTo: 'head' as const },
    { tag: 'meta', attrs: { property: 'og:site_name', content: 'Arsenal ATL' }, injectTo: 'head' as const },
    { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' }, injectTo: 'head' as const },
    { tag: 'meta', attrs: { name: 'twitter:title', content: page.title }, injectTo: 'head' as const },
    { tag: 'meta', attrs: { name: 'twitter:description', content: page.description }, injectTo: 'head' as const },
    { tag: 'meta', attrs: { name: 'twitter:image', content: image }, injectTo: 'head' as const },
    { tag: 'meta', attrs: { name: 'twitter:image:alt', content: page.name }, injectTo: 'head' as const },
    ...(schema ? [{ tag: 'script', attrs: { type: 'application/ld+json' }, children: JSON.stringify(schema), injectTo: 'head' as const }] : [])
  ];
}

function seoAndPwaTags(): Plugin {
  return {
    name: 'arsenal-seo-and-pwa-assets',
    transformIndexHtml: {
      order: 'pre',
      handler: (html, context) => {
        const seoPage = SEO_BY_PATH.get(normalizedPagePath(context.path));
        const cleanHtml = html
          .replace(/<title[^>]*>[\s\S]*?<\/title>\s*/i, '')
          .replace(/<meta\s+(?:name|property)=["'](?:description|keywords|robots|og:[^"']+|twitter:[^"']+)["'][^>]*>\s*/gi, '')
          .replace(/<link\s+rel=["'](?:canonical|manifest)["'][^>]*>\s*/gi, '')
          .replace(/<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>\s*/gi, '')
          .replace(/<noscript>[\s\S]*?<\/noscript>\s*/gi, '');
        return {
          html: seoPage ? cleanHtml.replace(/<body([^>]*)>/i, `<body$1>${noScriptContent(seoPage)}`) : cleanHtml,
          tags: [
            ...(seoPage ? searchTags(seoPage) : []),
            { tag: 'link', attrs: { rel: 'manifest', href: '/manifest.webmanifest' }, injectTo: 'head' },
            { tag: 'meta', attrs: { name: 'theme-color', content: '#070b12' }, injectTo: 'head' },
            { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/icons/arsenal-192.png' }, injectTo: 'head' },
            { tag: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' }, injectTo: 'head' },
            { tag: 'meta', attrs: { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }, injectTo: 'head' }
          ]
        };
      }
    },
    buildStart() {
      writeFileSync(page('public/sitemap.xml'), sitemapXml(), 'utf8');
    },
    configureServer(server) {
      server.middlewares.use('/service-worker.js', (_request, response) => {
        const precache = [...new Set([
          ...applicationRoutes,
          ...siteFiles(page('public')),
          ...siteFiles(page('src')).map((file) => `/src${file}`),
          ...siteFiles(page('node_modules/.vite/deps')).map((file) => `/node_modules/.vite/deps${file}`)
        ])];
        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        response.setHeader('Cache-Control', 'no-cache');
        response.setHeader('Service-Worker-Allowed', '/');
        response.end(workerSource(precache));
      });
    },
    generateBundle(_options, bundle) {
      const builtAssets = Object.keys(bundle)
        .filter((name) => name !== 'service-worker.js' && extname(name) !== '.html' && cacheableExtensions.has(extname(name)))
        .map((name) => `/${name}`);
      const publicFiles = siteFiles(page('public'));
      const precache = [...new Set([...applicationRoutes, ...publicFiles, ...builtAssets])];
      const publicFingerprint = publicFiles.map((file) => `${file}:${createHash('sha256').update(readFileSync(page(`public${file}`))).digest('hex')}`).join('|');
      const buildFingerprint = `${Object.entries(bundle).map(([name, item]) => `${name}:${item.type === 'asset' ? item.source : item.code}`).join('|')}|${publicFingerprint}`;
      this.emitFile({ type: 'asset', fileName: 'service-worker.js', source: workerSource(precache, buildFingerprint) });
    }
  };
}

export default defineConfig({
  plugins: [seoAndPwaTags()],
  resolve: {
    alias: {
      '@shared': page('src/shared'),
      '@tools': page('src/tools'),
      '@pages': page('src/pages')
    }
  },
  server: {
    host: '0.0.0.0',
    headers: isolationHeaders
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
    headers: isolationHeaders
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: page('index.html'),
        guide: page('guide/index.html'),
        settings: page('settings/index.html'),
        videoEditor: page('tools/video-editor/index.html'),
        videoCompressor: page('tools/video-compressor/index.html'),
        videoToAudio: page('tools/video-to-audio/index.html'),
        audioConverter: page('tools/audio-converter/index.html'),
        noiseRemover: page('tools/noise-remover/index.html'),
        audioRate: page('tools/audio-rate/index.html'),
        imageEditor: page('tools/image-editor/index.html'),
        backgroundRemover: page('tools/background-remover/index.html'),
        imageCompressor: page('tools/image-compressor/index.html'),
        pdfCreate: page('tools/pdf-create/index.html'),
        pdfCompressor: page('tools/pdf-compressor/index.html'),
        pdfEditor: page('tools/pdf-editor/index.html'),
        textEncryption: page('tools/text-encryption/index.html'),
        textFilter: page('tools/text-filter/index.html'),
        textComparison: page('tools/text-comparison/index.html'),
        qrGenerator: page('tools/qr-generator/index.html'),
        archiveEncryption: page('tools/archive-encryption/index.html'),
        localShare: page('tools/local-share/index.html')
      }
    }
  }
});
