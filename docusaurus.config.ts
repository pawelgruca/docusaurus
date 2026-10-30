import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import documentInfo from './src/data/document.json';

const appName = 'eSklep · Podręcznik Administratora';

const config: Config = {
  title: appName,
  tagline: `${documentInfo.subtitle} — wersja ${documentInfo.version}`,
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://example.com',
  baseUrl: '/',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'pl',
    locales: ['pl'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        language: ['en'],
        indexBlog: false,
        docsRouteBasePath: '/docs',
        highlightSearchTermsOnTargetPage: true,
      },
    ],
  ],

  plugins: ['docusaurus-plugin-image-zoom'],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: appName,
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'manualSidebar',
          position: 'left',
          label: 'Podręcznik',
        },
        {to: '/druk', label: 'Wersja do druku', position: 'right'},
        {href: 'pathname:///podrecznik.pdf', label: 'Pobierz PDF', position: 'right'},
      ],
    },
    footer: {
      style: 'light',
      copyright: `${documentInfo.title} ${documentInfo.subtitle} · wersja ${documentInfo.version}`,
    },
    zoom: {
      selector: '.markdown img:not([alt="Logo"])',
      background: {
        light: 'rgb(255, 255, 255)',
        dark: 'rgb(27, 27, 29)',
      },
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
