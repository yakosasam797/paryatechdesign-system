import type { StorybookConfig } from "@storybook/react-vite";
import { fileURLToPath } from "node:url";
import { packageAliases } from "../../../shared/vite-aliases.ts";
const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.tsx"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: "@storybook/react-vite",
  docs: { defaultName: "Docs" },
  core: { disableTelemetry: true },
  async viteFinal(config) {
    // Keep preview assets relative so both /storybook/ and standalone previews work.
    config.base = "./";
    config.resolve = {
      ...config.resolve,
      dedupe: ["react", "react-dom"],
      alias: [
        ...packageAliases,
        ...(Array.isArray(config.resolve?.alias) ? config.resolve.alias : []),
      ],
    };
    config.server = {
      ...config.server,
      fs: { allow: [fileURLToPath(new URL("../../..", import.meta.url))] },
    };
    return config;
  },
};
export default config;
