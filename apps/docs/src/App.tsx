import React, { useState, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as UI from "@parya/design-system";
import { examples, AppShellDemo } from "@parya/design-system/examples";
import components from "./generated/components.json";
import hooks from "./generated/hooks.json";
import paper from "./paper-catalog.json";
import "@parya/design-system/styles.css";
import "./site.css";
import packageInfo from "../../../packages/web/package.json";
import logoTeal from "../../../packages/web/src/assets/paryatech-logo-teal.svg";
import logoWhite from "../../../packages/web/src/assets/paryatech-logo-white.svg";
import { playgroundCode } from "../../../shared/playground-code.mjs";
const Foundations = React.lazy(() => import("./foundations/Foundations"));
const BrandAssets = React.lazy(() => import("./brand/BrandAssets"));
const Releases = React.lazy(() => import("./Releases"));
const IconLibrary = React.lazy(() => import("./IconLibrary"));

const REPO = packageInfo.repository.url.replace(/\.git$/, "");
const PAPER = "https://app.paper.design/file/01M5KKMF33S23DNN84NAWWBTJR";
const categories = [...new Set(paper.map((c) => c.category))];
const allNames = [
  ...new Set([
    ...paper.map((c) => c.name).filter((n) => !/^0|anatomy|Template/.test(n)),
    ...components.map((c) => c.name),
  ]),
].sort();
const searchEntries = [
  ...[
    ["Overview", "/", "Get started"],
    ["Installation", "/installation", "Get started"],
    ["Foundations · Typography", "/foundations/typography", "Design guidance"],
    ["Foundations · Color", "/foundations/color", "Design guidance"],
    ["Foundations · Spacing & shape", "/foundations/layout", "Design guidance"],
    ["Foundations · Token explorer", "/foundations/tokens", "Design guidance"],
    ["Icons", "/icons", "Design resources"],
    ["Brand Assets", "/brand-assets", "Design resources"],
    ["For AI agents", "/agents", "Developer resources"],
    ["Hooks", "/hooks", "Developer resources"],
    ["Design coverage", "/coverage", "Release readiness"],
    ["Releases", "/releases", "Release history"],
    ...hooks.map((hook) => [hook.name, "/hooks", "React hook"]),
  ].map(([name, route, kind]) => ({ name, route, kind })),
  ...allNames.map((name) => ({
    name,
    route: `/components/${encodeURIComponent(name)}`,
    kind:
      components.find((c) => c.name === name)?.kind === "constant"
        ? "Constant value"
        : components.find((c) => c.name === name)?.kind === "utility"
          ? "Utility function"
          : components.some((c) => c.name === name)
            ? "React component"
            : "Design reference",
  })),
];
const storybookBase = (
  import.meta.env.VITE_STORYBOOK_URL ||
  (import.meta.env.DEV ? "http://127.0.0.1:6008" : "/storybook")
).replace(/\/+$/, "");
const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
type ComponentDoc = (typeof components)[number];

function useRoute() {
  const read = () => {
    try {
      return decodeURIComponent(location.hash.slice(1) || "/");
    } catch {
      return "/not-found";
    }
  };
  const [route, set] = useState(read);
  useEffect(() => {
    const fn = () => {
      set(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  return route;
}
function External({
  href,
  children,
  icon = "external-link",
}: {
  href: string;
  children: React.ReactNode;
  icon?: UI.IconName;
}) {
  return (
    <a className="ds-resource" href={href} target="_blank" rel="noreferrer">
      <UI.Icon name={icon} size="sm" />
      {children}
      <UI.Icon name="external-link" size="xs" />
    </a>
  );
}
async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    UI.toast("Copied to clipboard", { tone: "success" });
    return true;
  } catch {
    window.dispatchEvent(new CustomEvent("ds-manual-copy", { detail: value }));
    return false;
  }
}
function ManualCopyDialog() {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const show = (event: Event) =>
      setText((event as CustomEvent<string>).detail);
    window.addEventListener("ds-manual-copy", show);
    return () => window.removeEventListener("ds-manual-copy", show);
  }, []);
  return (
    <UI.Modal
      open={text !== null}
      onOpenChange={(open) => {
        if (!open) setText(null);
      }}
      title="Copy this text"
      description="Clipboard access is unavailable. Select the text, then use your device’s copy command."
    >
      <textarea
        className="pt-input"
        aria-label="Text to copy"
        rows={12}
        value={text ?? ""}
        readOnly
        onFocus={(event) => event.currentTarget.select()}
      />
    </UI.Modal>
  );
}
function CopyButton({
  value,
  label = "Copy code",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <UI.Button
      size="xs"
      variant="ghost"
      leadingIcon={copied ? "check" : "copy"}
      onClick={async () => {
        if (await copyText(value)) {
          setCopied(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), 2000);
        }
      }}
    >
      {copied ? "Copied" : label}
    </UI.Button>
  );
}
function Code({ code }: { code: string }) {
  return (
    <div className="ds-code">
      <div>
        <span>React · TypeScript</span>
        <CopyButton value={code} />
      </div>
      <pre tabIndex={0} role="region" aria-label="Code example">
        <code>{code}</code>
      </pre>
    </div>
  );
}
function Search({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (open) setQuery("");
  }, [open]);
  const results = searchEntries
    .filter((entry) =>
      `${entry.name} ${entry.kind}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    )
    .slice(0, 30);
  return (
    <UI.Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Search the system"
      description="Find components, foundations, and implementation references."
    >
      <UI.Stack>
        <UI.SearchField
          aria-label="Search the system"
          placeholder="Search components, foundations, hooks…"
          shortcut=""
          value={query}
          onValueChange={setQuery}
          onKeyDown={(event) => {
            if (
              (event.key === "Enter" || event.key === "ArrowDown") &&
              results.length
            ) {
              event.preventDefault();
              const first = document.querySelector<HTMLAnchorElement>(
                ".ds-search-results a",
              );
              if (event.key === "Enter") first?.click();
              else first?.focus();
            }
          }}
          autoFocus
        />
        <div className="ds-search-results">
          {results.map(({ name, route, kind }) => (
            <a
              key={route + name}
              href={`#${route}`}
              onClick={() => onOpenChange(false)}
            >
              <UI.Icon name="packages" />
              <span>{name}</span>
              <small>{kind}</small>
              <UI.Icon name="arrow-right" size="sm" />
            </a>
          ))}
          {results.length === 0 ? (
            <UI.EmptyState
              title="No matching documentation"
              description="Try a shorter name or browse the categories."
            />
          ) : null}
        </div>
      </UI.Stack>
    </UI.Modal>
  );
}
function Sidebar({
  route,
  onNavigate,
}: {
  route: string;
  onNavigate: () => void;
}) {
  return (
    <aside className="ds-sidebar" aria-label="Documentation navigation">
      <nav
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) onNavigate();
        }}
      >
        <p className="ds-nav-label">Get started</p>
        {[
          ["/", "Overview", "home"],
          ["/installation", "Installation", "download"],
          ["/foundations", "Foundations", "sliders"],
          ["/icons", "Icons", "layout-grid"],
          ["/brand-assets", "Brand Assets", "image"],
          ["/agents", "For AI agents", "sparkles"],
        ].map(([url, label, icon]) => (
          <a
            className="ds-nav-item"
            aria-current={
              route === url ||
              (url === "/foundations" && route.startsWith("/foundations/"))
                ? "page"
                : undefined
            }
            href={`#${url}`}
            key={url}
          >
            <UI.Icon name={icon as UI.IconName} size="sm" />
            {label}
          </a>
        ))}
        <div className="ds-nav-section">
          <span>Code references</span>
          <small>{components.length}</small>
        </div>
        {categories.map((category) => (
          <details
            key={category}
            open={
              category === "Primitives" ||
              components.find((c) => route === `/components/${c.name}`)
                ?.category === category
            }
          >
            <summary>
              {category}
              <UI.Icon name="chevron-down" size="xs" />
            </summary>
            <div>
              {[
                ...new Set([
                  ...paper
                    .filter((p) => p.category === category)
                    .map((p) => p.name),
                  ...components
                    .filter((c) => c.category === category)
                    .map((c) => c.name),
                ]),
              ]
                .filter((n) => !/^00 |06.01|Form anatomy/.test(n))
                .map((name) => (
                  <a
                    key={name}
                    href={`#/components/${name}`}
                    className="ds-component-link"
                    aria-current={
                      route === `/components/${name}` ? "page" : undefined
                    }
                  >
                    {name}
                    {components.some((c) => c.name === name) ? null : (
                      <span
                        className="ds-design-dot"
                        title="Design reference"
                      />
                    )}
                  </a>
                ))}
            </div>
          </details>
        ))}
        <div className="ds-nav-section">Resources</div>
        <a
          className="ds-nav-item"
          aria-current={route === "/hooks" ? "page" : undefined}
          href="#/hooks"
        >
          <UI.Icon name="link" size="sm" />
          Hooks
        </a>
        <a
          className="ds-nav-item"
          href="#/coverage"
          aria-current={route === "/coverage" ? "page" : undefined}
        >
          <UI.Icon name="check-circle" size="sm" />
          Design coverage
        </a>
        <a
          className="ds-nav-item"
          href="#/releases"
          aria-current={route === "/releases" ? "page" : undefined}
        >
          <UI.Icon name="history" size="sm" />
          Releases
        </a>
      </nav>
      <div className="ds-sidebar-footer">
        Made for the work
        <br />
        behind every journey.
      </div>
    </aside>
  );
}
function Overview() {
  return (
    <>
      <div className="ds-hero">
        <div className="ds-breadcrumb">Parya Design System</div>
        <h1>
          One system.
          <br />
          Every journey.
        </h1>
        <p>
          The foundations, components, and patterns for building Paryatech
          travel software. Designed in Paper. Built for the web.
        </p>
        <div className="ds-hero-actions">
          <a href="#/installation" className="ds-primary-link">
            Start building <UI.Icon name="arrow-right" />
          </a>
          <a href="#/components/Button" className="ds-quiet-link">
            Explore components
          </a>
        </div>
      </div>
      <div className="ds-feature-stage">
        <div className="ds-feature-label">
          <UI.Icon name="plane" />
          <span>Built for travel operations</span>
          <span className="ds-live-label">
            <span />
            Live components
          </span>
        </div>
        <div className="ds-booking-demo">
          <div className="ds-booking-copy">
            <span className="ds-caption">A shared language for your team</span>
            <h2>
              From the first query
              <br />
              to the final itinerary.
            </h2>
            <p>
              Consistent details. Familiar interactions.
              <br />
              More time for the journey.
            </p>
            <UI.Stack direction="row" gap="2">
              <UI.Tag tone="work" icon="hotel">
                Accommodation
              </UI.Tag>
              <UI.Tag tone="person" icon="users">
                Travelers
              </UI.Tag>
              <UI.Tag icon="credit-card">Payments</UI.Tag>
            </UI.Stack>
          </div>
          <div className="ds-booking-card">
            <UI.RecordHeader
              headingLevel={3}
              title="Mehta family · Bali"
              code="BK-1042"
              status={
                <UI.StatusChip tone="success" size="sm">
                  Confirmed
                </UI.StatusChip>
              }
            />
            <UI.Divider />
            <UI.DescriptionList
              items={[
                { label: "Travel dates", value: "10–15 Nov 2026" },
                { label: "Travelers", value: "2 adults, 1 child" },
                { label: "Booking value", value: <UI.Money value={248000} /> },
                {
                  label: "Deposit received",
                  value: <UI.Money value={62000} tone="success" />,
                },
              ]}
            />
            <UI.Divider />
            <div className="pt-split">
              <UI.PersonInline name="Riya Mehta" />
              <UI.Button
                variant="primary"
                trailingIcon="arrow-right"
                onClick={() => {
                  location.hash = "/components/RecordHeader";
                }}
              >
                View booking
              </UI.Button>
            </div>
          </div>
        </div>
      </div>
      <section className="ds-home-section">
        <div className="ds-section-heading">
          <h2>A toolkit that works together.</h2>
          <a href="#/coverage">
            View coverage <UI.Icon name="arrow-right" size="sm" />
          </a>
        </div>
        <div className="ds-doors">
          {[
            {
              title: "Foundations",
              description:
                "Color, typography, spacing, and the tokens that connect them.",
              icon: "sliders",
              url: "/foundations",
            },
            {
              title: "Components",
              description:
                "React building blocks with typed APIs and live examples.",
              icon: "packages",
              url: "/components/Button",
            },
            {
              title: "For AI agents",
              description:
                "Markdown, usage examples, and a machine-readable component API.",
              icon: "sparkles",
              url: "/agents",
            },
          ].map((item) => (
            <a key={item.title} href={`#${item.url}`}>
              <UI.Icon name={item.icon as UI.IconName} size="xl" />
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <UI.Icon name="arrow-right" />
            </a>
          ))}
        </div>
      </section>
      <section className="ds-bottom-note">
        <UI.Icon name="info" />
        <p>
          This is the first implementation release. Components are experimental;
          design-only references are clearly marked. Production adoption
          requires the checks listed in <a href="#/coverage">design coverage</a>
          .
        </p>
      </section>
    </>
  );
}
function PhonePreview({ name, theme }: { name: string; theme: UI.Theme }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(name === "AppShell" ? 844 : 220);
  useEffect(() => {
    const resize = (event: MessageEvent) => {
      if (
        event.origin !== location.origin ||
        event.source !== frame.current?.contentWindow ||
        event.data?.type !== "parya-preview-size"
      )
        return;
      if (name !== "AppShell" && Number.isFinite(event.data.height))
        setHeight(Math.min(844, Math.max(180, event.data.height)));
    };
    window.addEventListener("message", resize);
    return () => window.removeEventListener("message", resize);
  }, [name]);
  return (
    <div className="ds-phone-preview">
      <iframe
        ref={frame}
        title={`${name} phone preview`}
        src={`#/preview/${encodeURIComponent(name)}?theme=${theme}`}
        style={{ height }}
      />
    </div>
  );
}
function StandalonePreview({ name, theme }: { name: string; theme: UI.Theme }) {
  const root = useRef<HTMLDivElement>(null);
  const entry = examples.find((item) => item.name === name);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const report = () =>
      parent.postMessage(
        {
          type: "parya-preview-size",
          height: Math.ceil(element.getBoundingClientRect().height),
        },
        location.origin,
      );
    const observer = new ResizeObserver(report);
    observer.observe(element);
    report();
    return () => observer.disconnect();
  }, [name]);
  return (
    <UI.ThemeProvider theme={theme}>
      <div
        ref={root}
        className={`ds-standalone-preview ${name === "AppShell" ? "ds-standalone-preview--shell" : ""}`}
      >
        {name === "AppShell" ? (
          <AppShellDemo embedded={false} />
        ) : entry ? (
          <entry.Demo />
        ) : (
          <UI.EmptyState title="Example not found" />
        )}
      </div>
      {name !== "AppShell" ? <UI.Toaster /> : null}
    </UI.ThemeProvider>
  );
}
function PackageInfo({ info }: { info: { name: string; version: string } }) {
  const [scope, name] = info.name.split("/");
  return (
    <UI.Popover
      label="Package information"
      align="end"
      trigger={
        <button
          type="button"
          className="ds-package-badge"
          aria-label={`Package ${info.name}, version ${info.version}`}
        >
          <code>
            {info.name}@{info.version}
          </code>
          <UI.Icon name="info" size="xs" />
        </button>
      }
    >
      <div className="ds-package-info">
        <strong>Shared library version</strong>
        <p>
          This version identifies the package containing this component.
          Components in the package share the release version.
        </p>
        <dl>
          <div>
            <dt>Namespace</dt>
            <dd>{name ? scope : "—"}</dd>
          </div>
          <div>
            <dt>Package</dt>
            <dd>{name ?? scope}</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>{info.version}</dd>
          </div>
        </dl>
        <p className="ds-caption">
          Experimental. This package is not yet published to a registry.
        </p>
        <a href="#/installation">Installation and package setup</a>
      </div>
    </UI.Popover>
  );
}
function ComponentPage({ name }: { name: string }) {
  const doc = components.find((c) => c.name === name);
  const reference = paper.find((c) => c.name === name);
  const example = examples.find((c) => c.name === name);
  const [tab, setTab] = useState("overview");
  const [previewTheme, setPreviewTheme] = useState<UI.Theme>("light");
  const [width, setWidth] = useState("full");
  useEffect(() => {
    setTab("overview");
    setPreviewTheme("light");
  }, [name]);
  useEffect(() => {
    const jump = (event: Event) => {
      setTab("overview");
      const id = (event as CustomEvent<string>).detail;
      requestAnimationFrame(() =>
        document.getElementById(id)?.scrollIntoView({ block: "start" }),
      );
    };
    window.addEventListener("ds-doc-section", jump);
    return () => window.removeEventListener("ds-doc-section", jump);
  }, []);
  if (!doc && !reference)
    return (
      <UI.EmptyState
        title="Component not found"
        description="Use search or choose a component from the sidebar."
      />
    );
  const data = doc ?? reference!;
  const copyLLM = async () => {
    try {
      const response = await fetch(asset(`docs/${name}.md`));
      if (!response.ok) throw new Error();
      const markdown = await response.text();
      if (!markdown.startsWith(`# ${name}\n`)) throw new Error();
      await copyText(markdown);
    } catch {
      UI.toast("Documentation unavailable", {
        description: "Build the documentation before copying this reference.",
        tone: "danger",
      });
    }
  };
  const code = doc?.usage ?? "";
  return (
    <>
      <div className="ds-component-head">
        <div className="ds-breadcrumb">
          {doc?.kind === "constant"
            ? "Constants"
            : doc?.kind === "utility"
              ? "Utilities"
              : "Components"}{" "}
          <UI.Icon name="chevron-right" size="xs" />
          {data.category}
        </div>
        <div className="ds-title-row">
          <h1>{name}</h1>
          <span className={doc ? "ds-status" : "ds-status ds-status--design"}>
            {doc ? "Experimental" : "Design reference"}
          </span>
          {doc ? <PackageInfo info={doc.package} /> : null}
        </div>
        <p className="ds-description">{data.description}</p>
        {name === "Icon" ? (
          <p className="ds-icon-catalog-link">
            <a href="#/icons">
              Browse all {UI.iconNames.length} icons{" "}
              <UI.Icon name="arrow-right" size="sm" />
            </a>
          </p>
        ) : null}
        <div className="ds-resource-row">
          {doc ? (
            <External
              href={`${REPO}/blob/main/${doc.sourcePath}#L${doc.sourceLine}`}
              icon="file-text"
            >
              Source
            </External>
          ) : null}
          <External href={data.paperUrl} icon="layout-grid">
            Paper
          </External>
          {doc && storybookBase ? (
            <External
              href={`${storybookBase}/?path=/docs/${`${doc.category}-${name}`
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "")}--docs`}
              icon="bookmark"
            >
              Storybook
            </External>
          ) : doc ? (
            <a className="ds-resource" href="#/installation">
              Storybook setup <UI.Icon name="external-link" size="xs" />
            </a>
          ) : null}
          {name === "AppShell" && doc ? (
            <a
              className="ds-resource"
              href="#/examples/app-shell"
              target="_blank"
              rel="noreferrer"
            >
              Full-page example <UI.Icon name="external-link" size="xs" />
            </a>
          ) : null}
          {doc ? (
            <div className="ds-ai-actions">
              <UI.Button
                size="sm"
                variant="primary"
                leadingIcon="sparkles"
                onClick={copyLLM}
              >
                Copy for LLM
              </UI.Button>
              <a
                className="ds-resource"
                href={asset(`docs/${name}.md`)}
                target="_blank"
                rel="noreferrer"
              >
                View as Markdown <UI.Icon name="external-link" size="xs" />
              </a>
            </div>
          ) : null}
        </div>
      </div>
      {doc ? (
        <>
          <div
            className="ds-doc-tabs"
            role="tablist"
            aria-label="Component documentation"
          >
            {["overview", "api", "guidelines"].map((t) => (
              <button
                key={t}
                role="tab"
                id={`doc-tab-${t}`}
                aria-controls={`doc-panel-${t}`}
                aria-selected={tab === t}
                tabIndex={tab === t ? 0 : -1}
                onClick={() => setTab(t)}
                onKeyDown={(e) => {
                  const tabs = ["overview", "api", "guidelines"];
                  if (
                    ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
                  ) {
                    e.preventDefault();
                    const next =
                      e.key === "Home"
                        ? 0
                        : e.key === "End"
                          ? 2
                          : (tabs.indexOf(t) +
                              (e.key === "ArrowRight" ? 1 : -1) +
                              3) %
                            3;
                    setTab(tabs[next]);
                    document.getElementById(`doc-tab-${tabs[next]}`)?.focus();
                  }
                }}
              >
                {t === "api"
                  ? "API reference"
                  : t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id={`doc-panel-${tab}`}
            aria-labelledby={`doc-tab-${tab}`}
            tabIndex={0}
          >
            {tab === "overview" ? (
              <>
                <section className="ds-doc-section" id="playground">
                  <div className="ds-section-heading">
                    <h2>Playground</h2>
                    <span className="ds-caption">
                      Interactive React example
                    </span>
                  </div>
                  <div className="ds-playground">
                    <div className="ds-preview-toolbar">
                      <div className="pt-inline">
                        <UI.Icon name="devices" size="sm" />
                        <select
                          aria-label="Preview width"
                          value={width}
                          onChange={(e) => setWidth(e.target.value)}
                        >
                          <option value="full">Responsive</option>
                          <option value="compact">Phone · 390px</option>
                        </select>
                      </div>
                      <UI.SegmentedControl
                        aria-label="Preview theme"
                        value={previewTheme}
                        onValueChange={(v) => setPreviewTheme(v as UI.Theme)}
                        options={[
                          { value: "light", label: "Light", icon: "sun" },
                          {
                            value: "dark",
                            label: "Dark",
                            icon: "moon" as UI.IconName,
                          },
                        ].map((o) => ({
                          ...o,
                          icon: UI.iconNames.includes(o.icon as UI.IconName)
                            ? (o.icon as UI.IconName)
                            : undefined,
                        }))}
                      />
                    </div>
                    {width === "compact" ? (
                      <PhonePreview
                        key={name}
                        name={name}
                        theme={previewTheme}
                      />
                    ) : (
                      <UI.ThemeProvider theme={previewTheme}>
                        <div
                          className={`ds-preview-surface ${name === "AppShell" ? "ds-preview-surface--shell" : ""} ${width === "compact" ? "ds-preview-surface--compact" : ""}`}
                        >
                          <div className="ds-preview-inner">
                            {example ? <example.Demo /> : null}
                          </div>
                        </div>
                      </UI.ThemeProvider>
                    )}
                    <Code code={code} />
                  </div>
                </section>
                {name === "Button" && doc.details ? (
                  <ButtonVariants details={doc.details} />
                ) : null}
                {name !== "Button" && doc.playground ? (
                  <ComponentControls key={name} doc={doc} />
                ) : null}
                <ConnectedFoundations doc={doc} />
                {name === "TextField" ? (
                  <section className="ds-doc-section">
                    <h2>States</h2>
                    <div className="ds-state-grid">
                      <UI.TextField
                        label="Default"
                        placeholder="Enter traveler name"
                      />
                      <UI.TextField
                        label="With error"
                        defaultValue=""
                        error="Traveler name is required."
                      />
                      <UI.TextField
                        label="Disabled"
                        value="Aarav Sharma"
                        disabled
                      />
                      <UI.TextField
                        label="Read only"
                        value="BK-1042"
                        readOnly
                        mono
                      />
                    </div>
                  </section>
                ) : null}
                <UsageGuidance doc={doc} />
              </>
            ) : tab === "api" ? (
              <ApiTable doc={doc} />
            ) : (
              <UsageGuidance doc={doc} detailed />
            )}
          </div>
          <div className="ds-page-footer">
            <span>Design and code, connected.</span>
            <External
              href={`${REPO}/issues/new?title=${encodeURIComponent(`${name}: `)}`}
              icon="message"
            >
              Suggest an improvement
            </External>
          </div>
        </>
      ) : (
        <section className="ds-design-reference">
          <UI.Banner title="Implementation pending" tone="info">
            This design is in Paper. It has no React implementation or Storybook
            story in this release.
          </UI.Banner>
          <h2>Design guidance</h2>
          {reference?.guidance.map((g, i) => (
            <p key={i}>{g}</p>
          ))}
          {reference?.paperApi ? <Code code={reference.paperApi} /> : null}
          <h2>Designed states</h2>
          <ul>
            {reference?.states.slice(0, 20).map((state, i) => (
              <li key={i}>{state}</li>
            ))}
          </ul>
          <a
            className="ds-primary-link"
            href={data.paperUrl}
            target="_blank"
            rel="noreferrer"
          >
            Inspect in Paper <UI.Icon name="external-link" size="sm" />
          </a>
        </section>
      )}
    </>
  );
}
type ComponentDetails = NonNullable<ComponentDoc["details"]>;
function ConnectedFoundations({ doc }: { doc: ComponentDoc }) {
  const guide = doc.documentation;
  const groups = [
    ["Typography", guide.typography],
    ["Semantic colors", guide.colors],
    ["Spacing, size and shape", guide.layout],
  ] as const;
  return (
    <section className="ds-doc-section" id="component-foundations">
      <h2>
        {doc.kind === "component"
          ? "Connected foundations"
          : "Connections and usage"}
      </h2>
      <p className="ds-section-description">{guide.overview}</p>
      {doc.kind === "component" ? (
        <div className="ds-foundation-links">
          <a href="#/foundations/typography">
            Typography <UI.Icon name="arrow-right" size="xs" />
          </a>
          <a href="#/foundations/color">
            Colors <UI.Icon name="arrow-right" size="xs" />
          </a>
          <a href="#/foundations/tokens">
            Tokens <UI.Icon name="arrow-right" size="xs" />
          </a>
          {guide.icons.length ||
          guide.composition.some((name) => String(name) === "Icon") ? (
            <a href="#/icons">
              Icons <UI.Icon name="arrow-right" size="xs" />
            </a>
          ) : null}
        </div>
      ) : null}
      {guide.composition.length ? (
        <p className="ds-section-description">
          Composes shared components:{" "}
          {guide.composition.map((name, index) => (
            <React.Fragment key={name}>
              {index ? ", " : null}
              <a href={`#/components/${name}`}>{name}</a>
            </React.Fragment>
          ))}
          .
        </p>
      ) : null}
      {guide.icons.length && doc.name !== "Button" ? (
        <div id="component-icons">
          <h3>Icons in {doc.name}</h3>
          <p className="ds-section-description">
            Supported icon props:{" "}
            {guide.icons.map((item) => (
              <code key={item.name}>
                {item.name}
                {item.required ? " (required)" : " (optional)"}{" "}
              </code>
            ))}
            . Use the shared icon set; keep decorative icons beside meaningful
            text. Name any icon-only action using its documented label API.
          </p>
          <a href="#/icons">Browse the icon library</a>
        </div>
      ) : null}
      {groups.some(([, tokens]) => tokens.length) ? (
        <details className="ds-token-connections">
          <summary>Inspect the token connections</summary>
          <p className="ds-caption">
            References below come from this component’s CSS selectors. Aliases
            connect to the shared token system; light and dark themes may
            override their values. Composed children retain their own styles.
          </p>
          {groups
            .filter(([, tokens]) => tokens.length)
            .map(([label, tokens]) => (
              <div key={label}>
                <h3>{label}</h3>
                <div className="ds-api-scroll">
                  <table className="ds-api-table">
                    <thead>
                      <tr>
                        <th>Token</th>
                        <th>Shared definition</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokens.map((token) => (
                        <tr key={token.name}>
                          <td>
                            <code>{token.name}</code>
                          </td>
                          <td>
                            <code>{token.value}</code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
        </details>
      ) : doc.kind === "component" ? (
        <p className="ds-section-description">
          This component inherits styling or composes other components. Follow
          those shared styles when adding content.
        </p>
      ) : null}
      {guide.styleSources.length ? (
        <p className="ds-caption">
          Shared styles:{" "}
          {guide.styleSources.map((path, index) => (
            <React.Fragment key={path}>
              {index ? ", " : null}
              <a
                href={`${REPO}/blob/main/${path}`}
                target="_blank"
                rel="noreferrer"
              >
                {path.split("/").pop()}
              </a>
            </React.Fragment>
          ))}
          .
        </p>
      ) : null}
    </section>
  );
}

function ComponentControls({ doc }: { doc: ComponentDoc }) {
  const initial = doc.playground as Record<string, unknown>;
  const [args, setArgs] = useState<Record<string, unknown>>({ ...initial });
  const Component = (
    UI as unknown as Record<
      string,
      React.ComponentType<Record<string, unknown>>
    >
  )[doc.name];
  const update = (key: string, value: unknown) =>
    setArgs((current) => ({ ...current, [key]: value }));
  const names = [
    ...new Set([
      ...Object.keys(initial),
      ...doc.props
        .filter(
          (prop) =>
            !prop.name.startsWith("on") &&
            prop.name !== "type" &&
            (prop.type.includes("IconName") ||
              ((prop as { options?: string[] }).options?.length ?? 0) > 0),
        )
        .map((prop) => prop.name),
    ]),
  ];
  const callbacks: Record<string, (...args: unknown[]) => unknown> =
    Object.fromEntries(
      doc.props
        .filter((prop) => prop.name.startsWith("on") && prop.required)
        .map((prop) => [prop.name, () => UI.toast(`${doc.name} demo action`)]),
    );
  for (const [callback, key] of Object.entries({
    onValueChange: "value",
    onCheckedChange: "checked",
    onCountryCodeChange: "countryCode",
    onPageChange: "page",
  }))
    if (doc.props.some((prop) => prop.name === callback))
      callbacks[callback] = ((value: unknown) =>
        update(key, value)) as () => void;
  return (
    <section className="ds-doc-section" id="component-controls">
      <h2>Variants & controls</h2>
      <p className="ds-section-description">
        Adjust the supported properties. The live component and copied code
        follow these selections; structured sample data stays in the example.
      </p>
      <div className="ds-controls-layout">
        <div
          className="ds-control-stage"
          role="region"
          aria-label={`Configured ${doc.name} preview`}
        >
          <Component {...args} {...callbacks} />
        </div>
        <div className="ds-controls">
          {names.map((name) => {
            const prop = doc.props.find((prop) => prop.name === name);
            const value = args[name];
            const label =
              name === "aria-label"
                ? "Accessible name"
                : name
                    .replace(/([a-z])([A-Z])/g, "$1 $2")
                    .replace(/^./, (character) => character.toUpperCase());
            const icons = prop?.type.includes("IconName");
            const literals =
              (prop as { options?: string[] } | undefined)?.options ?? [];
            if (prop?.type.includes("boolean") && literals.length)
              return (
                <UI.SelectField
                  key={name}
                  label={label}
                  value={String(value)}
                  onValueChange={(next) =>
                    update(
                      name,
                      next === "true" ? true : next === "false" ? false : next,
                    )
                  }
                  options={[
                    { value: "false", label: "Unchecked" },
                    { value: "true", label: "Checked" },
                    ...literals.map((value) => ({ value, label: value })),
                  ]}
                />
              );
            const presets: Record<string, string[]> = {
              locale: ["en-IN", "en-US", "en-GB", "de-DE"],
              currency: ["INR", "USD", "EUR", "GBP"],
            };
            if (presets[name])
              return (
                <UI.SelectField
                  key={name}
                  label={label}
                  value={String(value)}
                  onValueChange={(next) => update(name, next)}
                  options={presets[name].map((value) => ({
                    value,
                    label: value,
                  }))}
                />
              );
            if (
              typeof value === "number" &&
              prop &&
              /^\s*\d+(?:\s*\|\s*\d+)+\s*$/.test(prop.type)
            )
              return (
                <UI.SelectField
                  key={name}
                  label={label}
                  value={String(value)}
                  onValueChange={(next) => update(name, Number(next))}
                  options={prop.type.split("|").map((value) => ({
                    value: value.trim(),
                    label: value.trim(),
                  }))}
                />
              );
            if (icons || literals.length)
              return (
                <UI.SelectField
                  key={name}
                  label={label}
                  value={String(value ?? "__default")}
                  onValueChange={(selected) =>
                    update(
                      name,
                      selected === "__default" ? undefined : selected,
                    )
                  }
                  options={[
                    ...(!prop?.required
                      ? [
                          {
                            value: "__default",
                            label: icons
                              ? "None / default"
                              : "Component default",
                          },
                        ]
                      : []),
                    ...(icons ? UI.iconNames : literals).map((value) => ({
                      value,
                      label: value.replaceAll("-", " "),
                    })),
                  ]}
                />
              );
            if (typeof value === "boolean")
              return (
                <UI.Switch
                  key={name}
                  label={label}
                  checked={value}
                  onCheckedChange={(checked) => update(name, checked)}
                />
              );
            if (typeof value === "string" || typeof value === "number")
              return (
                <UI.TextField
                  key={name}
                  label={label}
                  type={typeof value === "number" ? "number" : "text"}
                  value={String(value)}
                  onValueChange={(next) => {
                    if (
                      typeof value !== "number" ||
                      Number.isFinite(Number(next))
                    )
                      update(
                        name,
                        typeof value === "number"
                          ? name === "decimals"
                            ? Math.min(
                                20,
                                Math.max(0, Math.round(Number(next))),
                              )
                            : Number(next)
                          : [
                                "aria-label",
                                "label",
                                "title",
                                "children",
                              ].includes(name)
                            ? next.trim() || String(initial[name] ?? doc.name)
                            : next,
                      );
                  }}
                />
              );
            return null;
          })}
          <UI.Button
            size="xs"
            variant="ghost"
            onClick={() => setArgs({ ...initial })}
          >
            Reset controls
          </UI.Button>
        </div>
      </div>
      <Code code={playgroundCode(doc, args)} />
    </section>
  );
}
const buttonIconOptions = [
  { value: "none", label: "None" },
  ...UI.iconNames.map((value) => ({
    value,
    label: value.replaceAll("-", " "),
  })),
];
function ButtonVariants({ details }: { details: ComponentDetails }) {
  const [variant, setVariant] = useState<UI.ButtonProps["variant"]>("primary");
  const [size, setSize] = useState<UI.ButtonProps["size"]>("sm");
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [label, setLabel] = useState("Create booking");
  const [leadingIcon, setLeadingIcon] = useState("plus");
  const [trailingIcon, setTrailingIcon] = useState("none");
  const [fullWidth, setFullWidth] = useState(false);
  const buttonLabel = label.trim() || "Create booking";
  const reset = () => {
    setVariant("primary");
    setSize("sm");
    setLoading(false);
    setDisabled(false);
    setLabel("Create booking");
    setLeadingIcon("plus");
    setTrailingIcon("none");
    setFullWidth(false);
  };
  const code = `import {Button} from "@parya/design-system";\nimport "@parya/design-system/styles.css";\n\nexport function ButtonExample() {\n  return (\n    <Button variant="${variant}" size="${size}"${leadingIcon !== "none" ? ` leadingIcon="${leadingIcon}"` : ""}${trailingIcon !== "none" ? ` trailingIcon="${trailingIcon}"` : ""}${loading ? " loading" : ""}${disabled ? " disabled" : ""}${fullWidth ? " fullWidth" : ""}>\n      {${JSON.stringify(buttonLabel)}}\n    </Button>\n  );\n}`;
  return (
    <>
      <section className="ds-doc-section">
        <h2>Variants & controls</h2>
        <p className="ds-section-description">
          Choose the emphasis that matches the action. The preview and copied
          code follow your selections.
        </p>
        <div className="ds-controls-layout ds-controls-layout--button">
          <div
            className="ds-control-stage"
            role="region"
            aria-label="Configured Button preview"
          >
            <UI.Button
              variant={variant}
              size={size}
              loading={loading}
              disabled={disabled}
              leadingIcon={
                leadingIcon === "none"
                  ? undefined
                  : (leadingIcon as UI.IconName)
              }
              trailingIcon={
                trailingIcon === "none"
                  ? undefined
                  : (trailingIcon as UI.IconName)
              }
              fullWidth={fullWidth}
              onClick={() => UI.toast(`${buttonLabel} selected`)}
            >
              {buttonLabel}
            </UI.Button>
          </div>
          <div className="ds-controls ds-button-controls">
            <div className="ds-control-wide">
              <UI.TextField
                label="Button label"
                value={label}
                onValueChange={setLabel}
                maxLength={48}
                hint="Use a short action. An empty preview uses Create booking."
              />
            </div>
            <UI.SelectField
              label="Variant"
              value={variant}
              onValueChange={(v) => setVariant(v as UI.ButtonProps["variant"])}
              options={[
                "primary",
                "brand",
                "secondary",
                "tertiary",
                "ghost",
                "danger",
                "link",
              ].map((value) => ({ value, label: value }))}
            />
            <UI.SelectField
              label="Size"
              value={size}
              onValueChange={(v) => setSize(v as UI.ButtonProps["size"])}
              options={["xs", "sm", "md"].map((value) => ({
                value,
                label: value,
              }))}
            />
            <UI.SelectField
              label="Leading icon"
              value={leadingIcon}
              onValueChange={setLeadingIcon}
              options={buttonIconOptions}
            />
            <UI.SelectField
              label="Trailing icon"
              value={trailingIcon}
              onValueChange={setTrailingIcon}
              options={buttonIconOptions}
            />
            <UI.Switch
              label="Loading"
              checked={loading}
              onCheckedChange={setLoading}
            />
            <UI.Switch
              label="Disabled"
              checked={disabled}
              onCheckedChange={setDisabled}
            />
            <UI.Switch
              label="Full width"
              checked={fullWidth}
              onCheckedChange={setFullWidth}
            />
            <UI.Button variant="ghost" size="xs" onClick={reset}>
              Reset controls
            </UI.Button>
          </div>
        </div>
        <Code code={code} />
        <p className="ds-section-description">{details.defaults}</p>
      </section>
      <section className="ds-doc-section" id="button-typography">
        <h2>Button typography</h2>
        <p className="ds-section-description">
          {details.typography.description}
        </p>
        <p className="ds-button-type-summary">
          <strong>{details.typography.family}</strong> · Weight{" "}
          {details.typography.weight} · Action label
        </p>
        <div className="ds-api-scroll">
          <table className="ds-api-table ds-button-type-table">
            <caption>
              Text sizes from the shared tokens. Current preview size: {size}.
            </caption>
            <thead>
              <tr>
                <th>Button size</th>
                <th>Text size</th>
                <th>Token</th>
              </tr>
            </thead>
            <tbody>
              {details.typography.sizes.map((item) => (
                <tr
                  key={item.size}
                  data-selected={item.size === size || undefined}
                >
                  <td>{item.size}</td>
                  <td>{item.value}</td>
                  <td>
                    <code>{item.token}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ds-section-description">
          Use the{" "}
          <a href="#/foundations/typography">Foundations typography guide</a>{" "}
          for the complete type system.
        </p>
      </section>
      <section className="ds-doc-section" id="button-icons">
        <h2>Icons in buttons</h2>
        {details.icons.map((line) => (
          <p className="ds-section-description" key={line}>
            {line}
          </p>
        ))}
        <p className="ds-section-description">
          <a href="#/icons">Browse all icons</a> ·{" "}
          <a href="#/components/IconButton">IconButton guidance</a>
        </p>
      </section>
    </>
  );
}
function ApiTable({ doc }: { doc: ComponentDoc }) {
  if (doc.kind === "constant")
    return (
      <section className="ds-doc-section">
        <h2>Constant value</h2>
        <p>
          Read this lookup as data. It is not a function or a React component.
        </p>
        <Code code={doc.returnType ?? doc.name} />
      </section>
    );
  return (
    <section className="ds-doc-section">
      <h2>{doc.kind === "utility" ? "Parameters" : "Props"}</h2>
      <p className="ds-section-description">
        {doc.kind === "utility"
          ? "Generated from the TypeScript function signature. Call this function with your application data."
          : "Generated from the current TypeScript source. Native attributes are supported where the interface extends a native element."}
      </p>
      <div className="ds-api-scroll">
        <table className="ds-api-table">
          <thead>
            <tr>
              <th>{doc.kind === "utility" ? "Parameter" : "Prop"}</th>
              <th>Type</th>
              <th>Required</th>
            </tr>
          </thead>
          <tbody>
            {doc.props.map((prop) => (
              <tr key={prop.name}>
                <td>
                  <code>{prop.name}</code>
                </td>
                <td>
                  <code>{prop.type}</code>
                </td>
                <td>{prop.required ? "Yes" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {doc.props.length === 0 ? (
        <p>See the typed source for the full signature.</p>
      ) : null}
      {doc.returnType ? (
        <p>
          Returns <code>{doc.returnType}</code>. This is a utility function.
        </p>
      ) : null}
      {doc.types.length ? (
        <>
          <h3>Referenced types</h3>
          <Code code={doc.types.map((type) => type.definition).join("\n\n")} />
        </>
      ) : null}
    </section>
  );
}
function UsageGuidance({
  doc,
  detailed = false,
}: {
  doc: ComponentDoc;
  detailed?: boolean;
}) {
  return (
    <section className="ds-doc-section" id="usage-guidelines">
      <h2>Usage guidelines</h2>
      <div className="ds-guidelines">
        {doc.guidance.map((line, i) => (
          <p key={i}>
            {line
              .replace(/^USE · /, "Use: ")
              .replace(" / AVOID · ", "\nAvoid: ")}
          </p>
        ))}
      </div>
      {doc.details ? (
        <div id="button-accessibility" className="ds-button-accessibility">
          <h3>Accessibility for Button</h3>
          <ul>
            {doc.details.accessibility.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <Code code={doc.details.accessibleExample} />
          <h3>Related components</h3>
          <ul>
            {doc.details.related.map((item) => (
              <li key={item.name}>
                <a href={`#/components/${item.name}`}>{item.name}</a> —{" "}
                {item.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div
          id="component-accessibility"
          className="ds-component-accessibility"
        >
          <h3>Accessibility for {doc.name}</h3>
          <ul>
            {doc.documentation.accessibility.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {detailed ? (
        <>
          <h3>Production readiness</h3>
          <p>
            This release is experimental. Automated checks and accessible
            primitives support implementation; they do not establish WCAG
            conformance or replace assistive technology testing.
          </p>
        </>
      ) : null}
    </section>
  );
}
function Installation() {
  return (
    <article className="ds-prose">
      <div className="ds-breadcrumb">Get started</div>
      <h1>Start building.</h1>
      <p className="ds-lede">One React library. A shared visual language.</p>
      <UI.Banner title="Preview release" tone="info">
        The package has not been published to npm yet. Build it from the code
        repository or install a locally packed release.
      </UI.Banner>
      <h2>1. Get the code</h2>
      <p>
        Requires Node.js 22.12 or later, React 19, and TypeScript. The code
        repository contains the library, shared examples, and this documentation
        website.
      </p>
      <Code
        code={`git clone ${REPO}.git\ncd ${REPO.split("/").at(-1)}\nnpm ci\nnpm run pack:lib`}
      />
      <h2>2. Add it to your application</h2>
      <Code
        code={`npm install /path/to/parya-design-system-${packageInfo.version}.tgz`}
      />
      <p>
        The archive filename includes the package version. Use the filename
        printed by npm pack.
      </p>
      <Code
        code={
          'import {ThemeProvider, Button, Toaster} from "@parya/design-system";\nimport "@parya/design-system/styles.css";\n\nexport function App() {\n  return (\n    <ThemeProvider theme="light">\n      <Button variant="primary">Create booking</Button>\n      <Toaster />\n    </ThemeProvider>\n  );\n}'
        }
      />
      <h2>3. Run Storybook</h2>
      <p>
        One repository contains the component library, this documentation
        website, and Storybook. Both applications use the shared library and
        examples.
      </p>
      <Code
        code={`# From the repository root:\nnpm run dev\n\n# Or start just Storybook:\nnpm run dev:storybook`}
      />
      <p>
        Keep Storybook running in its own terminal. Its local address is{" "}
        <a href="http://127.0.0.1:6008/" target="_blank" rel="noreferrer">
          http://127.0.0.1:6008/
        </a>
        . Run <code>npm run dev</code> from the repository root to start the
        documentation and Storybook together. One <code>npm ci</code> installs
        all workspaces.
      </p>
      <h2>How the pieces connect</h2>
      <div className="ds-architecture">
        <div>
          <UI.Icon name="layout-grid" />
          <strong>Paper</strong>
          <span>Design specifications & tokens</span>
        </div>
        <UI.Icon name="arrow-right" />
        <div>
          <UI.Icon name="file-text" />
          <strong>Shared component library</strong>
          <span>packages/web · typography, colors, icons & components</span>
        </div>
        <UI.Icon name="arrow-right" />
        <div>
          <UI.Icon name="bookmark" />
          <strong>Documentation & Storybook</strong>
          <span>apps/docs & apps/storybook · one repository</span>
        </div>
      </div>
      <h2>Publishing</h2>
      <p>
        Connect this repository to one Vercel project with its root directory
        set to the repository root. Documentation is served at / and Storybook
        at /storybook/ on the same website. Deploying the websites does not
        publish the component package.
      </p>
    </article>
  );
}
function Agents() {
  return (
    <article className="ds-prose">
      <div className="ds-breadcrumb">For AI agents</div>
      <h1>
        Give your agent
        <br />
        the right context.
      </h1>
      <p className="ds-lede">
        The same components and rules, in a format an AI coding assistant can
        read.
      </p>
      <div className="ds-agent-links">
        <a href={asset("llms.txt")} target="_blank" rel="noreferrer">
          <UI.Icon name="file-text" />
          <strong>llms.txt</strong>
          <span>A compact index of the system</span>
          <UI.Icon name="external-link" size="sm" />
        </a>
        <a href={asset("llms-full.txt")} target="_blank" rel="noreferrer">
          <UI.Icon name="packages" />
          <strong>Complete documentation</strong>
          <span>All component references in one file</span>
          <UI.Icon name="external-link" size="sm" />
        </a>
        <a href={asset("api/components.json")} target="_blank" rel="noreferrer">
          <UI.Icon name="devices" />
          <strong>Component API</strong>
          <span>Machine-readable props and types</span>
          <UI.Icon name="external-link" size="sm" />
        </a>
        <a href={asset("agents.md")} target="_blank" rel="noreferrer">
          <UI.Icon name="sparkles" />
          <strong>Agent instructions</strong>
          <span>Conventions and implementation boundaries</span>
          <UI.Icon name="external-link" size="sm" />
        </a>
      </div>
      <h2>Use a component with your agent</h2>
      <p>
        Open a component and select “Copy for LLM.” Paste it into your coding
        assistant with the screen or workflow you want to build. It includes the
        current API, usage example, source link, and design guidance.
      </p>
      <Code
        code={
          "Build a booking form using the Parya design system.\nUse the attached component documentation and semantic --pt-* tokens.\nUse only implemented components and their documented props.\nKeep internal supplier costs and margins out of traveler-facing views.\n\n[Paste the component reference here]"
        }
      />
      <h2>What this provides</h2>
      <p>
        Readable context for AI assistants and automation. The files do not
        generate screens on their own and this release does not include a hosted
        AI service or an MCP server.
      </p>
    </article>
  );
}
function Hooks() {
  return (
    <article className="ds-prose">
      <div className="ds-breadcrumb">Developer resources</div>
      <h1>Hooks</h1>
      <p className="ds-lede">
        Reusable React behavior, without a visual component.
      </p>
      <p>
        Call hooks inside a React component or another hook. They cannot run at
        the top level of a module.
      </p>
      {hooks.map((hook) => (
        <section key={hook.name} id={hook.name} className="ds-doc-section">
          <h2>{hook.name}</h2>
          <p>{hook.description}</p>
          <Code
            code={`import {${hook.name}} from "@parya/design-system";\n\n${hook.code}`}
          />
          <External
            href={`${REPO}/blob/main/packages/web/src/${hook.name === "useTheme" ? "theme.tsx" : "hooks.ts"}`}
            icon="file-text"
          >
            Source
          </External>
        </section>
      ))}
    </article>
  );
}
function Coverage() {
  return (
    <article className="ds-prose ds-prose--wide">
      <div className="ds-breadcrumb">Release readiness</div>
      <h1>Design coverage.</h1>
      <p className="ds-lede">
        An explicit view of what exists in design and what you can use in React.
      </p>
      <div className="ds-coverage-metrics">
        <div>
          <strong>18</strong>
          <span>Paper pages</span>
        </div>
        <div>
          <strong>518</strong>
          <span>Paper tokens</span>
        </div>
        <div>
          <strong>{components.length}</strong>
          <span>Live code references</span>
        </div>
        <div>
          <strong>151</strong>
          <span>SVG icons</span>
        </div>
      </div>
      <UI.Banner title="Experimental implementation" tone="warning">
        This is a working preview, not an enterprise production certification.
        Paper contains additional variants and specialized patterns that are not
        implemented yet.
      </UI.Banner>
      <h2>Before production adoption</h2>
      <ul>
        <li>
          Finish the design-only components and compare every required state
          with Paper.
        </li>
        <li>
          Review API contracts, business validation, supported locales, browser
          support, and application integration with engineering.
        </li>
        <li>
          Complete screen reader, keyboard, visual regression, and responsive
          acceptance testing.
        </li>
        <li>
          Choose package ownership, version policy, code reviewers, hosting,
          domain, and release permissions.
        </li>
        <li>
          Enable CI and published releases in GitHub, then pilot the library in
          a real travel workflow.
        </li>
      </ul>
      <h2>Design-to-code map</h2>
      <div className="ds-api-scroll">
        <table className="ds-api-table">
          <thead>
            <tr>
              <th>Design</th>
              <th>Category</th>
              <th>Code status</th>
            </tr>
          </thead>
          <tbody>
            {[...new Map(paper.map((p) => [p.name, p])).values()].map((p) => (
              <tr key={p.name}>
                <td>
                  <a href={`#/components/${p.name}`}>{p.name}</a>
                </td>
                <td>{p.category}</td>
                <td>
                  <span
                    className={
                      components.some((c) => c.name === p.name)
                        ? "ds-status"
                        : "ds-status ds-status--design"
                    }
                  >
                    {components.some((c) => c.name === p.name)
                      ? "Experimental"
                      : "Design only"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
export default function App() {
  const route = useRoute();
  const isPreview = route.startsWith("/preview/");
  const [theme, setTheme] = useState<UI.Theme>(() => {
    try {
      if (location.hash.startsWith("#/preview/"))
        return new URLSearchParams(location.hash.split("?")[1]).get("theme") ===
          "dark"
          ? "dark"
          : "light";
      return localStorage.getItem("parya-theme") === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });
  const [search, setSearch] = useState(false);
  const activeTheme = isPreview
    ? new URLSearchParams(route.split("?")[1]).get("theme") === "dark"
      ? "dark"
      : "light"
    : theme;
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const desktop = matchMedia("(min-width: 761px)");
    const close = () => {
      if (desktop.matches) setMenu(false);
    };
    desktop.addEventListener("change", close);
    return () => desktop.removeEventListener("change", close);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = activeTheme;
    try {
      if (!isPreview) localStorage.setItem("parya-theme", theme);
    } catch {}
  }, [theme, activeTheme, isPreview]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (route === "/examples/app-shell" || e.defaultPrevented) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearch((v) => !v);
      }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [route]);
  useEffect(() => {
    const name = route.split("?")[0].split("/").at(-1);
    document.title = `${route === "/" ? "Parya Design System" : (route === "/brand-assets" ? "Brand Assets" : name?.replace(/^./, (x) => x.toUpperCase())) + " · Parya"}`;
  }, [route]);
  if (isPreview)
    return (
      <StandalonePreview
        name={route.slice(9).split("?")[0]}
        theme={activeTheme}
      />
    );
  if (route === "/examples/app-shell")
    return (
      <UI.ThemeProvider theme={theme} setTheme={setTheme}>
        <AppShellDemo embedded={false} />
      </UI.ThemeProvider>
    );
  return (
    <UI.ThemeProvider theme={theme} setTheme={setTheme}>
      <a
        className="ds-skip"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          const main = document.getElementById("main-content");
          main?.focus();
          main?.scrollIntoView({ block: "start" });
        }}
      >
        Skip to content
      </a>
      <header className="ds-topbar">
        <a className="ds-brand" href="#/" aria-label="Parya Design System home">
          <img
            className="ds-brand-logo"
            src={theme === "dark" ? logoWhite : logoTeal}
            alt="Paryatech"
            width="172"
            height="37"
          />
        </a>
        <button
          className="ds-search-trigger"
          aria-label="Search documentation"
          onClick={() => setSearch(true)}
        >
          <UI.Icon name="search" />
          <span>Search documentation</span>
          <UI.Kbd>⌘ K</UI.Kbd>
        </button>
        <div className="ds-topbar-actions">
          <a
            href={REPO}
            target="_blank"
            rel="noreferrer"
            aria-label="Open code repository"
            className="ds-header-icon"
          >
            <UI.Icon name="file-text" />
          </a>
          <UI.IconButton
            variant="ghost"
            icon={theme === "light" ? "sun" : "circle-dashed"}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          />
          <UI.IconButton
            className="ds-menu-button"
            variant="ghost"
            icon={menu ? "x" : "menu"}
            aria-label="Toggle navigation"
            onClick={() => setMenu((v) => !v)}
            aria-expanded={menu}
          />
        </div>
      </header>
      <div className="ds-layout">
        <Sidebar route={route} onNavigate={() => setMenu(false)} />
        <main id="main-content" className="ds-main" tabIndex={-1}>
          {route === "/" ? (
            <Overview />
          ) : route === "/installation" ? (
            <Installation />
          ) : route.startsWith("/foundations") ? (
            <React.Suspense
              fallback={<UI.Spinner label="Loading foundations" />}
            >
              <Foundations section={route.split("/")[2]} copy={copyText} />
            </React.Suspense>
          ) : route === "/icons" ? (
            <React.Suspense fallback={<UI.Spinner label="Loading icons" />}>
              <IconLibrary copy={copyText} />
            </React.Suspense>
          ) : route === "/brand-assets" ? (
            <React.Suspense
              fallback={<UI.Spinner label="Loading brand assets" />}
            >
              <BrandAssets />
            </React.Suspense>
          ) : route === "/agents" ? (
            <Agents />
          ) : route === "/hooks" ? (
            <Hooks />
          ) : route === "/coverage" ? (
            <Coverage />
          ) : route === "/releases" ? (
            <React.Suspense fallback={<UI.Spinner label="Loading releases" />}>
              <Releases />
            </React.Suspense>
          ) : route.startsWith("/components/") ? (
            <ComponentPage name={route.slice(12)} />
          ) : (
            <UI.EmptyState title="Page not found" />
          )}
        </main>
        {route.startsWith("/components/") &&
        route !== "/components/AppShell" &&
        components.some((c) => route === `/components/${c.name}`) ? (
          <aside className="ds-on-this-page">
            <p>On this page</p>
            <a
              href="#main-content"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("main-content")?.scrollIntoView();
              }}
            >
              Overview
            </a>
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("ds-doc-section", { detail: "playground" }),
                )
              }
            >
              Playground
            </button>
            {route === "/components/Button"
              ? [
                  ["button-typography", "Typography"],
                  ["button-icons", "Icons"],
                  ["button-accessibility", "Accessibility"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent("ds-doc-section", { detail: id }),
                      )
                    }
                  >
                    {label}
                  </button>
                ))
              : null}
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("ds-doc-section", {
                    detail: "component-foundations",
                  }),
                )
              }
            >
              Connected foundations
            </button>
            {route !== "/components/Button" ? (
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("ds-doc-section", {
                      detail: "component-accessibility",
                    }),
                  )
                }
              >
                Accessibility
              </button>
            ) : null}
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("ds-doc-section", {
                    detail: "usage-guidelines",
                  }),
                )
              }
            >
              Usage guidelines
            </button>
            <div>
              <UI.Icon name="layout-grid" />
              <strong>Designed in Paper</strong>
              <p>Explore anatomy, variants, and visual states.</p>
              <a href={PAPER} target="_blank" rel="noreferrer">
                Open design library <UI.Icon name="external-link" size="xs" />
              </a>
            </div>
          </aside>
        ) : null}
      </div>
      <Dialog.Root open={menu} onOpenChange={setMenu}>
        <Dialog.Portal>
          <Dialog.Overlay className="ds-mobile-scrim" data-theme={theme} />
          <Dialog.Content
            className="ds-mobile-navigation"
            data-theme={theme}
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              document
                .querySelector<HTMLButtonElement>(".ds-menu-button")
                ?.focus();
            }}
          >
            <div className="ds-mobile-navigation-head">
              <Dialog.Title>Navigation</Dialog.Title>
              <Dialog.Close asChild>
                <UI.IconButton
                  icon="x"
                  variant="ghost"
                  aria-label="Close navigation"
                />
              </Dialog.Close>
            </div>
            <Sidebar route={route} onNavigate={() => setMenu(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Search open={search} onOpenChange={setSearch} />
      <ManualCopyDialog />
      <UI.Toaster />
    </UI.ThemeProvider>
  );
}
