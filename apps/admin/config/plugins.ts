import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  documentation: {
    enabled: true,
    config: {
      openapi: '3.0.0',
      info: {
        version: '1.0.0',
        title: 'Dashboard Monitor API',
        description: 'Strapi backend for dashboard-monitor',
      },
      'x-strapi-config': {
        plugins: ['users-permissions'], // ajoute ici les plugins dont tu veux documenter les routes
        path: '/documentation',
      },
      servers: [
        { url: env('STRAPI_URL', 'http://localhost:1337'), description: 'Dev server' },
      ],
      security: [{ bearerAuth: [] }],
    },
  },
});

export default config;