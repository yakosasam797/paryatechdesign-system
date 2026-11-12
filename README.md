# Parya Design System

A fresh React 19 and TypeScript implementation of the Paryatech Paper library, with a documentation website and Storybook in one npm workspace repository. Created from Paper specifications, not copied from the historical Paryatech implementation.

**Version 0.3.1 is experimental.** It includes 151 live code references, including collection and domain utilities, four hooks, 518 exported Paper tokens, and 151 exact SVG icons. The original 219-artboard Paper inventory is documented, with later phone and brand references recorded separately. It includes designs that have not yet been implemented. A component's presence in Paper does not imply it is available in this package or that all its designed variants are implemented.

## Open locally

```sh
npm ci
npm run dev
```

Documentation: http://127.0.0.1:5190/ ? Storybook: http://127.0.0.1:6008/.

One `npm ci` installs all workspaces. `npm run dev` starts both applications; Ctrl+C stops them. Use `npm run dev:docs` or `npm run dev:storybook` for a single application.

## Repository structure

```text
parya.designsystem.code/
??? packages/web/       @parya/design-system: components, tokens, fonts, icons, examples
??? apps/docs/          Documentation website
??? apps/storybook/     Storybook configuration, generated stories and browser tests
??? design/             Paper references and shared editorial/control configuration
??? shared/             Source aliases and copyable playground code
??? scripts/            Shared generation, build and package checks
??? tests/              Documentation and cross-workspace browser tests
??? package-lock.json   One reproducible install for the whole repository
```

Both applications use `@parya/design-system`; development and application builds resolve it to the same `packages/web/src` source. Storybook and documentation share component examples, API metadata, foundation references, accessibility guidance and the control defaults in `design/playground-controls.json`. Do not maintain a second component implementation in either app.

`npm run check` type-checks both applications and the library, runs unit tests, and builds all three workspaces. `npm run test:e2e` checks documentation, `npm run test:storybook` checks the built Storybook, and `npm run test:package` installs and builds the actual library archive in an isolated consumer. Use `npm run pack:lib` to pack the library, rather than packing the private workspace root.

## Website features

- Searchable component navigation and direct links to GitHub source, Paper, and Storybook.
- Interactive examples, light/dark previews, compact preview widths, and Button controls.
- TypeScript-generated API tables and current implementation signatures.
- A complete vendor-list workflow with search, filter groups, removable chips, shared sorting, pagination and selection across pages.
- Utility parameter tables, referenced type definitions, and complete collection snippets type-checked against the public exports.
- Copy code, Copy for LLM, standalone Markdown views, `/llms.txt`, `/llms-full.txt`, `/agents.md`, and `/api/components.json`.
- Foundations browser, hooks documentation, release notes, and a design-to-code coverage map.
- Brand Assets with 14 Paryatech logo variants across horizontal, stacked, symbol and app-tile forms, 22 original files, format-specific ZIP packs, and usage guidance. The header uses the supplied horizontal logo in teal for light mode and white for dark mode.

The AI features provide documentation context. This version has no hosted LLM service or MCP server.

## Library usage

```tsx
import {
  ThemeProvider,
  Button,
  TextField,
  Toaster,
} from "@parya/design-system";
import "@parya/design-system/styles.css";

export function App() {
  return (
    <ThemeProvider theme="light">
      <TextField label="Traveler name" leadingIcon="user" />
      <Button variant="primary">Create booking</Button>
      <Toaster />
    </ThemeProvider>
  );
}
```

The package is not published to npm. Run `npm run build:lib` then `npm run pack:lib`; install the resulting `.tgz` in a consumer application. Package registry ownership and publishing credentials remain to be chosen.

React 19 is a peer dependency. Node.js 22.12+ is required for tooling. The package includes a client entry point for React frameworks. Supported browsers and Next.js integration still require acceptance testing in the real application.

## Application shell

Use `AppShell` as the application frame: primary navigation stays in the left card, while each page renders inside the right workspace. The shell provides collapse, child destinations, breadcrumbs, search and account action slots, a mobile navigation dialog, and independent sidebar/workspace scrolling. It uses the exact Paper sidebar width, topbar height, gap, and surface tokens. It does not supply authentication or business services.

Open `/#/components/AppShell` for the live example and API, or `/#/examples/app-shell` for the full-page travel workspace. `Sidebar` and `Topbar` have their own reference pages and Storybook stories. The shell mounts `Toaster` by default; avoid mounting a second one. Use `embedded` when nesting it in an existing main landmark.

```tsx
const [activeNavId, setActiveNavId] = useState("bookings");

<ThemeProvider theme="light">
  <AppShell
    navGroups={[
      {
        id: "travel",
        items: [{ id: "bookings", label: "Bookings", icon: "bookings" }],
      },
    ]}
    activeNavId={activeNavId}
    onNavigate={setActiveNavId}
    breadcrumbs={[{ label: "Bookings" }]}
  >
    <PageHeader title="Bookings" />
    {/* Render the active page here. */}
  </AppShell>
</ThemeProvider>;
```

## Shared workspace sections

Use `NotesPanel` for internal notes scoped to a module or record, `EmailCommunication` for mailbox threads and an inline composer, and `ActivityTimeline` / `ActivityTable` for recent updates and searchable history. Each has a live documentation page and a shared Storybook example. The full-page AppShell example connects notes, communication, activity, credits, open records, account controls, and notifications.

Applications supply records, draft state, permissions, and async save/send callbacks. Examples keep data in memory; they do not deliver email, upload attachments, or persist changes. Keep internal notes out of customer-facing views. Paper currently offers four NotesPanel review directions; the final direction remains unfrozen.

The Studio inventory audit covers all 150 non-guideline names. This package now has 149 matching names plus `Heading` and `pageCount`. `MinorRateMatrix` is the only Studio entry absent from live Paper and is intentionally awaiting its design. `RateMatrix` uses major-unit amounts; it must not be substituted for a minor-unit matrix. Same-name coverage does not establish API, behavior, or visual parity with Studio. See `design/studio-inventory-audit.json` for the full reconciliation.

Open `design/studio-inventory-audit.html` for the searchable matrix. After building the library and synchronizing Storybook, run `node scripts/reconcile-studio-inventory.mjs` to refresh it from the captured Studio names, current Paper catalog, runtime exports, and generated stories. The original Studio inventory is a reference for names and guidance, not component implementation.

## Foundations guidance

Open `/#/foundations` for typography roles, font and weight guidance, semantic color pairings, a theme-aware contrast calculator, spacing and shape examples, and the full token explorer. Examples use the existing Paper values. The typography specimens can be edited and enlarged to 200%.

Load `@parya/design-system/styles.css` once to use the generated typography classes:

```tsx
<h1 className="pt-type-page-title">Bookings</h1>
<h2 className="pt-type-section-title">Traveler details</h2>
<p className="pt-type-body">Confirm the passport name before issuing the ticket.</p>
```

Choose the HTML element by meaning, independently of the visual role. Use the real components for controls and data formatting. `design/foundation-guidance.json` combines the Paper role declarations with authored usage guidance; `scripts/generate-foundations.mjs` generates `packages/web/src/typography.css`, `/docs/foundations.md`, and `/api/foundations.json`. The guide is included in LLM documentation and the packaged catalog. Contrast results evaluate one combination; they are not a WCAG conformance claim.

## Icon library

Open `/#/icons` or select Icons in the sidebar to browse all 151 icons imported from Paper. Search by name and select an icon to copy its React usage. The Icon component preview shows a small sample and links to the complete gallery.

## Phone layouts and release history

The playground's **Phone · 390px** option uses a separate browser viewport. Tables default to labelled cards below a 600px container width while retaining sorting and selection; pass `mobileLayout="scroll"` for wide comparison tables. Forms, record rails and dashboard panels stack within narrow containers. Board stages and schedule weeks use compact navigation. The same components and semantic tokens serve both sizes.

Open `/#/releases` for history by package and version. Edit `design/release-history.json`; `npm run build:docs` generates `CHANGELOG.md`, the Releases page data, `/docs/releases.md` and `/api/releases.json`. Completed updates are recorded with a version and date. The matching Paper references are on **17 · Phone layouts**, with the release ledger on **16 · Coverage & handoff**.

`node scripts/audit-phone.mjs` captures the local phone examples (optionally pass a viewport width). With the documentation server running, `node scripts/export-phone-paper.mjs` exports measured editable visual groups and screenshots to `artifacts/paper-phone/`, using `design/paper-tokens.json`. Pass component case IDs, such as `agenda`, to limit the capture. These are static design references; code remains the source for interactions.

`design/phone-references.json` maps the 22 editable phone artboards, guide and release ledger to their Paper pages. The older desktop-width captures are labelled as historical references and point to page 17.

## Development

The logo library is available at `/#/brand-assets`. Original downloads live in `apps/docs/public/brand/svg/` and `apps/docs/public/brand/png/`; descriptive filenames preserve the supplied file bytes. `apps/docs/src/brand/manifest.json` drives previews, colors, filenames, and file sizes. Run `python scripts/build-brand-assets.py` after updates to verify original hashes, dimensions and duplicates, synchronize `apps/docs/public/brand/manifest.json`, and rebuild the three ZIP packs. The matching Paper brand sheet is on 01 · Foundations & tokens. The headers use exact copies of the current teal and white horizontal SVG downloads. Usage notes are in `apps/docs/public/brand/README.md`.

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:package
```

`npm run check` runs types, unit/interaction tests, library build, and documentation build. All 151 copied examples and four hook examples are type-checked during generation. Playwright verifies navigation, component previews in both themes, clipboard recovery, real menu downloads, Markdown, phone reflow, and automated accessibility. Install its browser with `npx playwright install chromium` when needed. `npm run test:package` installs the actual archive in a fresh consumer, checks every copied example with NodeNext and Bundler resolution, verifies runtime exports, and builds an application with the shipped styles and fonts.

Source is in `packages/web/src/components/`. Shared examples are in `packages/web/src/examples.tsx`. `scripts/generate-docs.mjs` reads TypeScript to generate API references and Markdown. `design/` contains the exact Paper token snapshot, page inventory, and representative JSX reference exports. Paper family names are preserved through font aliases generated by `scripts/build-fonts.mjs`.

## Hosting

Connect this GitHub repository to one Vercel project at the repository root. The root `vercel.json` builds documentation as the `app` service at `/` and Storybook as the `storybook` service at `/storybook/`. Both are public; neither makes server-to-server calls, so no internal bindings are needed. See [DEPLOYMENT.md](DEPLOYMENT.md) for routing, project settings, and local verification with `npx vercel@latest dev --local`.

`npm run build:docs` generates `apps/docs/dist/`; `npm run build:storybook` generates `apps/storybook/storybook-static/`. These are build output, not source folders. Public documentation links default to `/storybook/`; `VITE_STORYBOOK_URL` is only an optional override for a separately hosted public Storybook. Keep `DOCS_BASE=/` with the root services configuration. CI validates both applications from one checkout; deployment and npm publication remain separate actions.

## Production adoption

See [PRODUCTION.md](PRODUCTION.md) for the remaining work and decisions. In particular, design-only components, incomplete Paper variants, assistive technology testing, visual baselines, localization, application validation rules, ownership, versioning, package distribution, and hosting need completion or confirmation.

No open-source license has been granted. The package is marked UNLICENSED until its owner chooses licensing terms.
