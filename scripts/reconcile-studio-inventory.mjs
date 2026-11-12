import { readFile, writeFile, access } from "node:fs/promises";
import * as runtime from "../packages/web/dist/index.js";
const pkg = JSON.parse(await readFile("packages/web/package.json", "utf8"));
const repositoryUrl = pkg.repository.url.replace(/\.git$/, "");

// Studio contributes inventory names and design guidance only, never implementation.
const source = JSON.parse(
  await readFile("design/studio-inventory-source.json", "utf8"),
);
const catalog = JSON.parse(
  await readFile("apps/docs/src/generated/components.json", "utf8"),
);
const paper = JSON.parse(await readFile("apps/docs/src/paper-catalog.json", "utf8"));
const codeByName = new Map(catalog.map((entry) => [entry.name, entry]));
const paperByName = new Map(paper.map((entry) => [entry.name, entry]));
const hasFile = async (path) =>
  access(path).then(
    () => true,
    () => false,
  );
const items = await Promise.all(
  source.items.map(async (entry) => {
    const code = codeByName.get(entry.name);
    const design = paperByName.get(entry.name);
    const implemented = !!code && Object.hasOwn(runtime, entry.name);
    return {
      ...entry,
      paperPresent: !!design,
      implemented,
      status: implemented
        ? "experimental"
        : design
          ? "paper-ready"
          : "needs-paper",
      paperUrl: design?.paperUrl ?? null,
      sourcePath: code?.sourcePath ?? null,
      sourceUrl: code
        ? `${repositoryUrl}/blob/main/${code.sourcePath}#L${code.sourceLine}`
        : null,
      documentationUrl: code
        ? `http://127.0.0.1:5190/#/components/${entry.name}`
        : null,
      storyFilePresent: await hasFile(
        `apps/storybook/stories/${entry.name}.stories.tsx`,
      ),
    };
  }),
);
const sourceNames = new Set(source.items.map((entry) => entry.name));
const audit = {
  date: "2026-10-29",
  scope:
    "Same-name inventory reconciliation after fresh Paper extraction and implementation. This does not establish API, behavior, variant, or visual parity with Studio.",
  studioUrl: source.studioUrl,
  paperFileUrl: source.paperFileUrl,
  paperEvidence:
    "Live Paper inventory and static specimen exports captured on 29 October 2026 in paper-inventory.json and paper-migration-samples.json. Historical Studio implementation was not copied.",
  counts: {
    studioEntries: items.length,
    implementedNames: items.filter((entry) => entry.implemented).length,
    paperReady: items.filter((entry) => entry.status === "paper-ready").length,
    needsPaper: items.filter((entry) => entry.status === "needs-paper").length,
    newCatalogEntries: catalog.length,
    extraNewNames: catalog
      .filter((entry) => !sourceNames.has(entry.name))
      .map((entry) => entry.name),
    missingDedicatedPaperButImplemented: items
      .filter((entry) => entry.implemented && !entry.paperPresent)
      .map((entry) => entry.name),
  },
  checks: {
    catalogNamesHaveRuntimeExport: catalog.every((entry) =>
      Object.hasOwn(runtime, entry.name),
    ),
    matchingStudioNamesHaveStoryFile: items
      .filter((entry) => entry.implemented)
      .every((entry) => entry.storyFilePresent),
    allOldInteractionsTested: false,
    allOldVariantsCompared: false,
    wcagConformanceAssessed: false,
  },
  cautions: [
    "NotesPanel has four Paper review directions; its final visual direction is not frozen.",
    "MinorRateMatrix is absent from the captured live Paper inventory and this package. Keep it separate from the major-unit RateMatrix.",
    "RecordPreviewPanel, RecordPreviewSection and Sheet are compatibility surfaces. Prefer full pages for new long record workflows.",
    "Email delivery, attachment uploads, persistence, authorization, navigation guards and application business rules belong to the consuming application.",
  ],
  guidelines: source.guidelines,
  items,
};
if (!audit.checks.catalogNamesHaveRuntimeExport)
  throw new Error("Catalog contains a missing runtime export");
await writeFile(
  "design/studio-inventory-audit.json",
  JSON.stringify(audit, null, 2) + "\n",
);

const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const link = (url, label) =>
  url ? `<a href="${escape(url)}">${label}</a>` : "";
const rows = items
  .map(
    (entry) =>
      `<tr data-status="${entry.status}"><th scope="row">${escape(entry.name)}<small>${escape(entry.kind)}</small></th><td>${escape(entry.category)}</td><td>${entry.implemented ? "Experimental implementation" : entry.paperPresent ? "In Paper; awaiting implementation" : "Awaiting Paper design"}${entry.name === "NotesPanel" ? "<small>Final visual direction is not frozen.</small>" : ""}<small>${escape(entry.purpose)}</small></td><td>${[link(entry.documentationUrl, "Docs"), link(entry.sourceUrl, "Source"), link(entry.paperUrl, "Paper"), link(entry.studioUrl, "Studio")].filter(Boolean).join(" · ")}</td></tr>`,
  )
  .join("\n");
const style = `:root{font-family:system-ui,sans-serif;color:#172b4d;background:#fff;line-height:1.6}body{max-width:1160px;margin:0 auto;padding:32px 24px}h1{font-size:32px;line-height:1.2}a{color:#096761}small{display:block;color:#526075;font-size:12px;font-weight:400}.callout{padding:16px 20px;background:#f5f7fa;border-left:4px solid #12746e}.metrics{display:flex;gap:16px;flex-wrap:wrap;margin:24px 0}.metrics p{padding:16px;border:1px solid #dbe1e9;border-radius:8px;margin:0}.metrics strong{display:block;font-size:28px}.filters{display:flex;gap:16px;flex-wrap:wrap;margin:18px 0}label{display:grid;gap:6px}input,select{font:inherit;padding:8px;border:1px solid #8a98ab;border-radius:6px;max-width:100%}.table-wrap{overflow:auto;border:1px solid #dbe1e9;border-radius:8px}table{border-collapse:collapse;width:100%;min-width:760px;text-align:left;font-size:13px}th,td{padding:12px 16px;vertical-align:top;border-bottom:1px solid #e2e7ed}thead{background:#f5f7fa}tbody th{width:190px}li{margin:10px 0}a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #157f79;outline-offset:3px}@media(max-width:700px){body{padding:20px 14px}h1{font-size:26px}}`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Parya component migration audit</title><style>${style}</style></head><body><p>Parya · Inventory update · 29 October 2026</p><h1>Shared workspace sections are now implemented</h1><p>Notes, communication, recent activity, notifications, calendars, charts, boards, rates, domain labels and templates now have fresh React implementations based on Paper.</p><div class="callout">${escape(audit.scope)}<br>${escape(audit.paperEvidence)}</div><div class="metrics"><p><strong>${audit.counts.implementedNames} / ${items.length}</strong>Studio names implemented</p><p><strong>${catalog.length}</strong>Total live code references</p><p><strong>${audit.counts.needsPaper}</strong>Awaiting Paper</p></div><h2>Remaining work and limits</h2><ul>${audit.cautions.map((note) => `<li>${escape(note)}</li>`).join("")}</ul><p>DataTable and ListToolbar now also have dedicated artboards in the captured Paper catalog. Reconcile individual variants with the product team before adoption. Hosting remains undecided.</p><h2>Full component matrix</h2><div class="filters"><label>Find a component<input id="query" type="search" placeholder="Name or category"></label><label>Implementation status<select id="status"><option value="all">All entries</option><option value="experimental">Experimental implementation</option><option value="needs-paper">Awaiting Paper</option><option value="paper-ready">Awaiting implementation</option></select></label></div><p id="count" role="status">${items.length} entries</p><div class="table-wrap"><table><thead><tr><th scope="col">Entry</th><th scope="col">Area</th><th scope="col">Current status and guidance</th><th scope="col">References</th></tr></thead><tbody>${rows}</tbody></table></div><h2>Guidance pages</h2><p>These ${source.guidelines.length} entries are guidelines, not importable components: ${source.guidelines.map((entry) => escape(entry.name)).join(", ")}.</p><script>const query=document.getElementById('query'),status=document.getElementById('status');function filter(){let visible=0;for(const row of document.querySelectorAll('tbody tr')){row.hidden=!(row.textContent.toLowerCase().includes(query.value.toLowerCase())&&(status.value==='all'||row.dataset.status===status.value));if(!row.hidden)visible++}document.getElementById('count').textContent=visible+' entries'}query.addEventListener('input',filter);status.addEventListener('change',filter);</script></body></html>\n`;
await writeFile("design/studio-inventory-audit.html", html);
console.log(JSON.stringify(audit.counts));
