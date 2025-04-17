import { defineUserConfig } from 'vuepress'
import { defaultTheme } from '@vuepress/theme-default'
import { searchPlugin } from '@vuepress/plugin-search'
import { mediumZoomPlugin } from '@vuepress/plugin-medium-zoom'
import { viteBundler } from '@vuepress/bundler-vite'

export default defineUserConfig({
  bundler: viteBundler(),
  lang: 'en-US',
  title: 'DomainDrivenJS',
  description: 'A modern, composition-based Domain-Driven Design library for JavaScript',
  base: '/domaindrivenjs/',
  head: [
    ['link', { rel: 'icon', href: '/images/logo.png' }],
    ['meta', { name: 'theme-color', content: '#3498db' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }]
  ],

  theme: defaultTheme({
    logo: '/images/logo.png',
    repo: 'MarcoMuellner/DomainDrivenJS',
    docsDir: 'docs',
    editLink: true,
    editLinkText: 'Help us improve this page!',
    lastUpdated: true,

    navbar: [
      { text: 'Home', link: '/' },
      {
        text: 'Guide',
        children: [
          { text: 'Getting Started', link: '/guide/getting-started.md' },
          { text: 'Quick Start', link: '/guide/quick-start.md' },
          { text: 'DDD Fundamentals', link: '/guide/ddd/' },
          { text: 'Core Concepts', link: '/guide/core/' },
          { text: 'Advanced Topics', link: '/guide/advanced/' }
        ]
      },
      { text: 'API', link: '/api/' },
      { text: 'Examples', link: '/examples/' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          collapsible: false,
          children: [
            '/guide/getting-started.md',
            '/guide/quick-start.md'
          ]
        },
        {
          text: 'DDD Fundamentals',
          collapsible: false,
          children: [
            '/guide/ddd/index.md',
            '/guide/ddd/strategic-design.md',
            '/guide/ddd/tactical-design.md',
            '/guide/ddd/ubiquitous-language.md'
          ]
        },
        {
          text: 'Core Concepts',
          collapsible: false,
          children: [
            '/guide/core/value-objects.md',
            '/guide/core/entities.md',
            '/guide/core/aggregates.md',
            '/guide/core/repositories.md',
            '/guide/core/domain-events.md',
            '/guide/core/specifications.md',
            '/guide/core/domain-services.md'
          ]
        },
        {
          text: 'Advanced Topics',
          collapsible: false,
          children: [
            '/guide/advanced/extending-components.md',
            '/guide/advanced/testing.md',
            '/guide/advanced/best-practices.md',
            '/guide/advanced/antipatterns.md'
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          children: [
            '/api/index.md',
            '/api/value-objects.md',
            '/api/entities.md',
            '/api/aggregates.md',
            '/api/repositories.md',
            '/api/domain-events.md',
            '/api/specifications.md',
            '/api/domain-services.md'
          ]
        }
      ],
      '/examples/': [
        {
          text: 'Examples',
          children: [
            '/examples/index.md',
            '/examples/e-commerce.md',
            '/examples/task-management.md',
            '/examples/banking.md'
          ]
        }
      ]
    }
  }),

  plugins: [
    searchPlugin({
      locales: {
        '/': {
          placeholder: 'Search documentation',
        }
      },
      maxSuggestions: 10,
      getExtraFields: (page) => page.frontmatter.tags ?? []
    }),
    mediumZoomPlugin({
      selector: '.theme-default-content :not(a) > img'
    })
  ]
})
