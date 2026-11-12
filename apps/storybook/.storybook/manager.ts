import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";
addons.setConfig({
  theme: create({
    base: "light",
    brandTitle: "Parya Design System",
    brandUrl: "/",
    colorPrimary: "#A5537E",
    colorSecondary: "#0F6E63",
    appBg: "#F6F8FA",
    appContentBg: "#FFFFFF",
    fontBase: '"Public Sans",sans-serif',
    fontCode: '"JetBrains Mono",monospace',
  }),
  sidebar: { showRoots: true },
});
