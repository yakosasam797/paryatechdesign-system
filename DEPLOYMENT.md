# Hosting Parya

One GitHub repository contains the library and both applications. No second checkout or Git submodule is needed.

## Vercel

Import this repository once as one Vercel project. Set the project's Root Directory to the repository root (`.`), rather than either application folder. The root `vercel.json` defines two independently built services on one domain:

| Setting | Documentation service | Storybook service |
| --- | --- | --- |
| Name | `app` | `storybook` |
| Service root | `apps/docs` | `apps/storybook` |
| Framework | Vite | Storybook |
| Install, from service root | `npm --prefix ../.. ci` | `npm --prefix ../.. ci` |
| Build, from service root | `npm --prefix ../.. run build:docs` | `npm --prefix ../.. run build:storybook` |
| Output, relative to app | `dist` | `storybook-static` |
| Public path | `/` (all paths outside Storybook) | `/storybook/` |

All build and runtime settings live inside each service in the root configuration. Remove old project-level build, output, install, and development overrides when migrating an existing Vercel project. Use Node.js 22.12 or newer. Each service installs from the root lockfile; npm's prepare step builds the shared library and catalog. Builds use the same repository commit. Generated `storybook-static/` and `dist/` folders are not stored in Git.

Public routing belongs to the top level. `/storybook` redirects to `/storybook/`, which is necessary for Storybook's relative assets. The first rewrite selects the Storybook service and maps `/storybook/<path>` to the static output route `/<path>` using `destination.path`; the catch-all selects documentation last. Storybook's preview assets use relative URLs, including when opening `iframe.html` directly. Documentation uses hash routes, so component URLs such as `/#/components/Button` need no SPA rewrite that might swallow `/docs/*.md` or `/api/*.json`.

Documentation links default to the same-origin `/storybook/` in production. No `VITE_STORYBOOK_URL` is required. Remove an old localhost or separate-host override from Vercel's environment settings. For an intentionally separate public Storybook host, set `VITE_STORYBOOK_URL` to that public URL and rebuild documentation. This is a browser-facing build setting, not an internal binding. Keep `DOCS_BASE=/` for this routing configuration.

### Service bindings

No bindings are declared. Both services are static frontends: browser links open Storybook, documentation fetches its own generated Markdown, and both import the library from the npm workspace at build time. There are no server functions calling another service. Runtime bindings cannot be read by a static frontend, during builds, or by middleware. If a future server function calls an internal service, declare its binding on the caller and read the injected URL only in that function. Do not create a `VITE_*` variable for an internal binding or manually assign its generated URL.

### Local verification

From the repository root:

```sh
npm ci
npx vercel@latest dev --local
```

`vercel dev` runs both services through the shared routes. The service development helper generates shared inputs, uses the port Vercel assigns, and configures documentation links to `/storybook/`. Documentation uses Vite's development server. Storybook uses a freshly built static preview mounted at `/storybook/`, because its native development server assumes it owns `/`; restart `vercel dev` to rebuild Storybook after edits, or use `npm run dev` for Storybook hot reload. Check `/`, `/#/components/Button`, `/docs/Button.md`, `/api/components.json`, `/storybook/`, and `/storybook/iframe.html?id=primitives-button--default&viewMode=story`. Also check that `/storybook` redirects and Storybook assets load under `/storybook/`.

Use the canonical `/storybook/` path, including its trailing slash, for links with query parameters. All generated component links already use it. In local testing with Vercel CLI 65.14.0, the bare `/storybook?path=...` redirect dropped the query string; canonical component links, the manager, direct iframes, and their assets worked. Query preservation for the bare redirect still needs verification on a real Vercel deployment.

`npm run dev` remains available for two standalone development servers (documentation on port 5190, Storybook on port 6008). Copy `.env.example` to `.env.local` only when an override is needed; the documentation app loads environment files from the repository root. Keep these files and Vercel's `.vercel/` links out of Git.

This configuration does not create or deploy a Vercel project. Confirm the service names and public paths before enabling deployment.

Vercel references: [Services](https://vercel.com/docs/services), [routing](https://vercel.com/docs/services/routing), [bindings](https://vercel.com/docs/services/bindings), [configuration](https://vercel.com/docs/services/config-reference).

## Component distribution

Hosting the websites does not publish the library. Your SaaS consumes `@parya/design-system` as a separate versioned package:

```sh
npm run build:lib
npm run pack:lib
```

Install the archive path printed by npm into the SaaS. A future registry release can use the same package name and exports. The root workspace and both applications are private; only `packages/web` is the distributable library. No registry publication is enabled.

## Moving from two repositories

Use this repository for future component, documentation and Storybook changes. The old Storybook repository is no longer a dependency. Its existing history can remain available for reference; archiving or redirecting it is a separate repository administration action.
