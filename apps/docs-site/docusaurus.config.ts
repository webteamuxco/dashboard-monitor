import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const GITHUB_REPO = 'https://github.com/webteamuxco/dashboard-monitor';

const config: Config = {
  title: 'dashboard-monitor',
  tagline: 'Provider-agnostic kiosk dashboard for errors, logs and visitor analytics',
  favicon: 'img/favicon.ico',

  markdown: {
    mermaid: true,
  },

  themes: [
    '@docusaurus/theme-mermaid',
  ],
  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  url: "https://dashboard.uxco-group.com",
  baseUrl: "/docs/",

  organizationName: 'webteamuxco',
  projectName: 'dashboard-monitor',

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          // The docs are the whole site: `intro.md` carries `slug: /`.
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: `${GITHUB_REPO}/tree/main/apps/docs-site/`,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'dashboard-monitor',
      logo: {
        alt: 'dashboard-monitor logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: GITHUB_REPO,
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Start here',
          items: [
            {label: 'Introduction', to: '/'},
            {label: 'Getting started', to: '/getting-started'},
            {label: 'Configuration', to: '/configuration'},
          ],
        },
        {
          title: 'Architecture',
          items: [
            {label: 'Overview', to: '/architecture'},
            {label: 'Panels', to: '/panels'},
            {label: 'Monitors', to: '/monitors'},
            {label: 'Data flow', to: '/data-flow'},
          ],
        },
        {
          title: 'More',
          items: [
            {label: 'Features', to: '/features'},
            {label: 'State management', to: '/state-management'},
            {label: 'GitHub', href: GITHUB_REPO},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} UXCO Group.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
