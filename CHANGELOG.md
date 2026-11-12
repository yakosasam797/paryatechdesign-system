# Changelog

Recorded preview versions. The component library is not published to npm; Storybook is a private application.

Templates own page spacing. Phone layouts reuse the same template slots, semantic tokens and components; smaller screens change their arrangement.

## @parya/design-system

React components, foundations, hooks and page templates.

Source: https://github.com/yakosasam797/paryatechdesign-system

### 0.3.1 · 2026-10-29 — Horizontal logo and documentation polish

#### Fixed

- Replaced the four horizontal logo colors with the supplied full Paryatech wordmark including P.
- Updated the documentation header and shared AppShell logo to the supplied artwork.
- Refreshed original downloads, per-format dimensions, SHA-256 hashes and ZIP packs.

#### Improved

- Simplified the documentation top bar to the logo, wider search and utility controls; navigation stays in the sidebar.
- Removed the preview version and React/TypeScript labels from the sidebar.
- Emphasized documentation resources with teal actions and a primary Copy for LLM button.

#### Added

- A searchable gallery for all 151 Paper icons, available from the sidebar and the Icon component page; select an icon to copy its React usage.

**Adoption:** The asset filenames and component APIs are unchanged. PNG downloads are 2385 � 517 pixels; SVG artboards are 1193 � 259.

### 0.3.0 · 2026-10-29 — Phone layouts and brand assets

#### Improved

- Labelled table cards preserve sorting and selection in narrow containers; scrolling tables remain available.
- Phone navigation uses a focus-managed dialog. Page layouts, forms, board stage navigation and schedule week navigation adapt to smaller screens.
- The playground Phone preview renders in an actual phone viewport.

#### Added

- Package-specific version history, adoption notes and generated release documentation.
- Matching editable 390px Paper references and a release ledger.
- Ten supplied stacked-logo, standalone-symbol and app-tile variants: 14 additional original files, grouped previews, exact colors and refreshed download packs.

**Adoption:** DataTable defaults to cards below 600px container width; use mobileLayout="scroll" for wide comparisons. KanbanBoard defaults to phone stage navigation; use mobileLayout="snap" for swipe-only navigation. No public API is removed.

### 0.2.0 · 2026-10-28 — Collection workflows and practical foundations

#### Added

- FilterMenu, FilterChips, SortMenu, ListToolbar, ListPageTemplate and IconTextCell.
- Typography roles, color guidance, contrast checks and generated foundation documentation.
- Controlled table sorting and selection across pages; typed utility documentation and shared examples.

**Adoption:** filterRows ignores groups without an accessor. paginate clamps pages beyond the last page; invalid page numbers and sizes still throw. sortRows keeps empty values last in both directions.

### 0.1.0 · 2026-10-28 — Initial experimental implementation

#### Added

- Paper tokens and SVG icon inventory; React components and shared examples.
- Documentation site, source/Paper links, generated API tables, Markdown and LLM references.
- Four reusable hooks and a separate connected Storybook application.

**Adoption:** Install from the repository or a locally packed archive. This recorded preview version was not published to npm.

## parya-designsystem-storybook

Private Storybook application using @parya/design-system.

Source: https://github.com/yakosasam797/paryatechdesign-system/tree/main/apps/storybook

### 0.3.1 · 2026-10-29 — Corrected horizontal logo

#### Fixed

- Uses the corrected horizontal wordmark through @parya/design-system 0.3.1.

**Adoption:** Uses the shared library 0.3.1 through the existing repository dependency.

### 0.3.0 · 2026-10-29 — Phone APIs and workspace stories

#### Added

- Application shell and keyboard selection examples.
- Shared workspace, content, notification, calendar, chart, pricing and template stories.
- API documentation synchronized with the library phone layouts and schedule week navigation.

**Adoption:** Uses @parya/design-system 0.3.0 through the shared repository dependency. Run sync after updating the library. This remains a private application.

### 0.2.0 · 2026-10-28 — Shared component and foundation stories

#### Added

- Stories for the shared v0.2 collection controls, foundation roles and typed examples.
- QuantityField controls synchronized with the shared API.

**Adoption:** Run sync after changing shared examples. This is a private application, not a separately published component library.
