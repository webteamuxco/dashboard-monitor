import type { Schema, Struct } from '@strapi/strapi';

export interface ConfigGlitchtipConfiguration extends Struct.ComponentSchema {
  collectionName: 'components_config_glitchtip_configurations';
  info: {
    displayName: 'GlitchtipConfiguration';
    icon: 'chartPie';
  };
  attributes: {
    organization: Schema.Attribute.String;
    projectId: Schema.Attribute.String & Schema.Attribute.Required;
    token: Schema.Attribute.Password;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ConfigPosthogConfiguration extends Struct.ComponentSchema {
  collectionName: 'components_config_posthog_configurations';
  info: {
    displayName: 'PosthogConfiguration';
    icon: 'chartCircle';
  };
  attributes: {
    apiKey: Schema.Attribute.Password;
    projectId: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ConfigProjectDefaultConfig extends Struct.ComponentSchema {
  collectionName: 'components_config_project_default_configs';
  info: {
    displayName: 'ProjectDefaultConfig';
    icon: 'layout';
  };
  attributes: {
    DefaultPollingIntervalSeconds: Schema.Attribute.Integer;
    DefautltRefreshIntervalMS: Schema.Attribute.BigInteger &
      Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'config.glitchtip-configuration': ConfigGlitchtipConfiguration;
      'config.posthog-configuration': ConfigPosthogConfiguration;
      'config.project-default-config': ConfigProjectDefaultConfig;
    }
  }
}
