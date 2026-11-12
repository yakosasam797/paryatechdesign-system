import ts from "typescript";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { generateFoundations } from "./generate-foundations.mjs";
import { componentReference } from "./component-reference.mjs";
import { playgroundCode } from "../shared/playground-code.mjs";
await import("./build-releases.mjs");
const foundationsMarkdown = await generateFoundations();
const pkg = JSON.parse(await readFile("packages/web/package.json", "utf8"));
const repositoryUrl = pkg.repository.url.replace(/\.git$/, "");
const paper = JSON.parse(
  await readFile("apps/docs/src/paper-catalog.json", "utf8"),
);
const componentGuidance = JSON.parse(
  await readFile("design/component-guidance.json", "utf8"),
);
const tokenSnapshot = JSON.parse(
  await readFile("design/paper-tokens.json", "utf8"),
);
const tokenValues = new Map(
  tokenSnapshot.tokens.map((token) => [token.name, String(token.value)]),
);
// Report the definitions the components actually load, including the fluid
// typography restored from Paper specimens and any shared base overrides.
for (const file of [
  "packages/web/src/tokens.css",
  "packages/web/src/styles.css",
]) {
  const css = await readFile(file, "utf8");
  for (const block of css.matchAll(/:root\s*\{([^}]+)\}/g))
    for (const token of block[1].matchAll(/(--pt-[\w-]+):\s*([^;]+);/g))
      tokenValues.set(token[1], token[2].trim());
}
const playgrounds = JSON.parse(
  await readFile("design/playground-controls.json", "utf8"),
);
const implementations = new Map();
function resolveGuidanceToken(name, seen = new Set()) {
  if (seen.has(name) || !tokenValues.has(name))
    throw new Error(`Invalid guidance token: ${name}`);
  const next = new Set(seen).add(name);
  return tokenValues
    .get(name)
    .replace(/var\((--[\w-]+)\)/g, (_, reference) =>
      resolveGuidanceToken(reference, next),
    );
}
const examplesSource = await readFile("packages/web/src/examples.tsx", "utf8");
const exampleFile = ts.createSourceFile(
  "examples.tsx",
  examplesSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const exampleEntries = [];
const migrationFile = ts.createSourceFile(
  "migration-examples.tsx",
  await readFile("packages/web/src/migration-examples.tsx", "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
function collectExamples(node) {
  if (
    ts.isVariableDeclaration(node) &&
    node.name.getText(exampleFile) === "examples" &&
    node.initializer &&
    ts.isArrayLiteralExpression(node.initializer)
  ) {
    for (const element of node.initializer.elements) {
      if (!ts.isObjectLiteralExpression(element)) continue;
      const entry = {};
      for (const prop of element.properties) {
        if (
          ts.isPropertyAssignment(prop) &&
          ts.isStringLiteralLike(prop.initializer)
        )
          entry[prop.name.getText(exampleFile)] = prop.initializer.text;
      }
      if (entry.source) {
        const demo = [
          ...exampleFile.statements,
          ...migrationFile.statements,
        ].find(
          (statement) =>
            ts.isFunctionDeclaration(statement) &&
            statement.name?.text === entry.source,
        );
        if (!demo) throw new Error(`Missing example source: ${entry.source}`);
        entry.code = demo.getText().replace(/\bUI\./g, "");
      }
      if (entry.name && entry.code) {
        if (/^(export )?function\s/.test(entry.code.trim())) {
          entry.code = entry.code.replace(/^function\s/, "export function ");
        } else {
          const snippet = ts.createSourceFile(
            "snippet.tsx",
            entry.code,
            ts.ScriptTarget.Latest,
            true,
            ts.ScriptKind.TSX,
          );
          const statements = [...snippet.statements];
          const last = statements.at(-1);
          if (last && ts.isExpressionStatement(last)) {
            const before = statements
              .slice(0, -1)
              .map((statement) => statement.getText(snippet))
              .join("\n");
            entry.code = `export function ${entry.name[0].toUpperCase() + entry.name.slice(1)}Example() {\n${before}\nreturn (${last.expression.getText(snippet)});\n}`;
          }
        }
        exampleEntries.push(entry);
      }
    }
  }
  ts.forEachChild(node, collectExamples);
}
collectExamples(exampleFile);
if (!exampleEntries.length)
  throw new Error(
    "No examples found; refusing to generate an empty component catalog.",
  );
const names = exampleEntries.map((e) => e.name);
const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, ".");
const program = ts.createProgram(parsed.fileNames, parsed.options);
const checker = program.getTypeChecker();
function literalOptions(symbol, declaration) {
  const type = checker.getTypeOfSymbolAtLocation(symbol, declaration);
  const values = (type.isUnion() ? type.types : [type])
    .filter((item) => item.flags & ts.TypeFlags.StringLiteral)
    .map((item) => item.value);
  return values.length < 64 ? values : [];
}
const source = program.getSourceFile("packages/web/src/index.ts");
const symbols = checker.getExportsOfModule(checker.getSymbolAtLocation(source));
const fallbackCategory = {
  Icon: "Icons",
  DataTable: "Tables & collections",
  Heading: "Primitives",
  ListToolbar: "Tables & collections",
  pageCount: "Tables & collections",
};
const extraDescriptions = {
  ListToolbar:
    "One list control row for search, filters, sorting and actions, with applied filter chips below. Controls wrap on narrow screens.",
  pageCount:
    "Return the number of pages for a nonnegative total and a positive integer page size. Empty collections have zero pages.",
};
const supportedTypes = new Map(
  symbols
    .map((symbol) => {
      const resolved =
        symbol.flags & ts.SymbolFlags.Alias
          ? checker.getAliasedSymbol(symbol)
          : symbol;
      return [
        symbol.name,
        resolved.declarations?.find(
          (declaration) =>
            ts.isInterfaceDeclaration(declaration) ||
            ts.isTypeAliasDeclaration(declaration),
        ),
      ];
    })
    .filter(
      ([, declaration]) =>
        declaration &&
        path
          .resolve(declaration.getSourceFile().fileName)
          .startsWith(path.resolve("packages/web/src")),
    ),
);
function referencedTypes(typeTexts) {
  const collected = new Map();
  function collect(text) {
    for (const identifier of text.match(/\b[A-Za-z_]\w*/g) ?? []) {
      const declaration = supportedTypes.get(identifier);
      if (!declaration || collected.has(identifier)) continue;
      const definition = declaration.getText();
      collected.set(identifier, definition);
      collect(definition);
    }
  }
  typeTexts.forEach(collect);
  return [...collected].map(([name, definition]) => ({ name, definition }));
}
const baseComponents = names.map((name) => {
  const example = exampleEntries.find((entry) => entry.name === name);
  const kind = ["EVENT_KINDS", "PRIORITY_LEVELS", "VENDOR_TYPES"].includes(name)
    ? "constant"
    : (example.kind ?? (name === "toast" ? "utility" : "component"));
  let symbol = symbols.find((s) => s.name === name);
  if (!symbol) throw new Error(`Example ${name} has no export`);
  if (symbol.flags & ts.SymbolFlags.Alias)
    symbol = checker.getAliasedSymbol(symbol);
  const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
  const file = declaration.getSourceFile();
  implementations.set(name, declaration.getText());
  const type = checker.getTypeOfSymbolAtLocation(symbol, declaration);
  const signature = checker.getSignaturesOfType(type, ts.SignatureKind.Call)[0];
  const param = signature?.parameters[0];
  const propsType = param
    ? checker.getTypeOfSymbolAtLocation(param, declaration)
    : null;
  const props =
    kind === "utility"
      ? (signature?.parameters ?? []).map((parameter) => {
          const declaration = parameter.declarations[0];
          return {
            name: parameter.name,
            type:
              declaration.type?.getText() ??
              checker.typeToString(
                checker.getTypeOfSymbolAtLocation(parameter, declaration),
              ),
            required: !declaration.questionToken && !declaration.initializer,
          };
        })
      : propsType
        ? checker
            .getPropertiesOfType(propsType)
            .filter((p) =>
              p.declarations?.some((d) =>
                path
                  .resolve(d.getSourceFile().fileName)
                  .startsWith(path.resolve("packages/web/src")),
              ),
            )
            .map((p) => ({
              name: p.name,
              options: literalOptions(p, declaration),
              type:
                p.declarations?.find((d) => d.type)?.type.getText() ??
                checker.typeToString(
                  checker.getTypeOfSymbolAtLocation(p, declaration),
                  declaration,
                  ts.TypeFormatFlags.NoTruncation,
                ),
              required: !(p.flags & ts.SymbolFlags.Optional),
            }))
        : [];
  const design = paper.find((p) => p.name === name);
  const filePath = path.relative(".", file.fileName).replaceAll("\\", "/");
  const details = componentGuidance[name]
    ? structuredClone(componentGuidance[name])
    : null;
  if (details?.typography) {
    details.typography.family = resolveGuidanceToken(
      details.typography.familyToken,
    ).replaceAll('"', "");
    details.typography.weight = resolveGuidanceToken(
      details.typography.weightToken,
    );
    details.typography.sizes = details.typography.sizes.map((item) => ({
      ...item,
      value: resolveGuidanceToken(item.token),
    }));
  }
  return {
    name,
    package: { name: pkg.name, version: pkg.version },
    details,
    kind,
    exampleCode: example.code,
    usage: `${example.code.includes("useState") ? 'import {useState} from "react";\n' : ""}import {${symbols
      .filter((symbol) => new RegExp(`\\b${symbol.name}\\b`).test(example.code))
      .map((symbol) => {
        const resolved =
          symbol.flags & ts.SymbolFlags.Alias
            ? checker.getAliasedSymbol(symbol)
            : symbol;
        return `${resolved.flags & ts.SymbolFlags.Value ? "" : "type "}${symbol.name}`;
      })
      .join(
        ", ",
      )}} from "@parya/design-system";\nimport "@parya/design-system/styles.css";\n\n${example.code}`,
    types: referencedTypes(props.map((prop) => prop.type)),
    returnType:
      kind === "utility" || kind === "constant"
        ? signature
          ? checker.typeToString(checker.getReturnTypeOfSignature(signature))
          : checker.typeToString(
              type,
              undefined,
              ts.TypeFormatFlags.NoTruncation,
            )
        : null,
    category:
      design?.category ?? fallbackCategory[name] ?? "Overlays & feedback",
    description:
      design?.description ??
      {
        Icon: "151 exact SVG icons from the Paper library.",
        DataTable:
          "A semantic table with sorting, controlled row selection, and responsive overflow.",
        Heading: "A heading that follows the nearest HeadingLevelProvider.",
      }[name] ??
      extraDescriptions[name] ??
      "Parya React component.",
    guidance: [...(design?.guidance ?? []), ...(details?.guidance ?? [])],
    paperApi: design?.paperApi ?? "",
    paperUrl:
      design?.paperUrl ??
      "https://app.paper.design/file/01M5KKMF33S23DNN84NAWWBTJR",
    states: design?.states ?? [],
    status: "experimental",
    sourcePath: filePath,
    sourceLine:
      file.getLineAndCharacterOfPosition(declaration.getStart()).line + 1,
    props,
  };
});
const components = baseComponents.map((doc) => ({
  ...doc,
  playground: playgrounds[doc.name] ?? null,
  documentation: componentReference(
    doc,
    implementations.get(doc.name),
    names,
    tokenValues,
  ),
}));
const hooks = [
  {
    name: "useDisclosure",
    description: "Control open, closed, and toggle behavior for an overlay.",
    code: "export function DisclosureExample() {\n  const {open, toggle} = useDisclosure();\n  return <><button onClick={toggle} aria-expanded={open}>Travel details</button><p hidden={!open}>Bali · 10–15 November</p></>;\n}",
  },
  {
    name: "useControllableState",
    description:
      "Support a controlled value and an uncontrolled default with one state interface.",
    code: 'export function ControllableExample() {\n  const [value, setValue] = useControllableState<string>(undefined, "Aarav Sharma");\n  return <label>Traveler name<input value={value} onChange={event => setValue(event.target.value)} /></label>;\n}',
  },
  {
    name: "useMediaQuery",
    description:
      "Subscribe to a media query. Returns false on the server and updates after mounting.",
    code: 'export function MediaQueryExample() {\n  const compact = useMediaQuery("(max-width: 620px)");\n  return <p>{compact ? "Phone layout" : "Wide layout"}</p>;\n}',
  },
  {
    name: "useTheme",
    description:
      "Read the nearest Parya ThemeProvider and its optional theme setter.",
    code: 'export function ThemeExample() {\n  const {theme, setTheme} = useTheme();\n  return <button disabled={!setTheme} onClick={() => setTheme?.(theme === "light" ? "dark" : "light")}>Current theme: {theme}</button>;\n}',
  },
];
// Validate copyable examples against the same public exports as consumers.
// Virtual files keep generated checks out of the working tree.
const exampleFiles = new Map(
  exampleEntries.map((entry) => [
    path.resolve("packages/web/src", `.docs-example-${entry.name}.tsx`),
    components
      .find((component) => component.name === entry.name)
      .usage.replaceAll('from "@parya/design-system"', 'from "./index"'),
  ]),
);
for (const [name, details] of Object.entries(componentGuidance)) {
  if (details.accessibleExample)
    exampleFiles.set(
      path.resolve("packages/web/src", `.docs-accessibility-${name}.tsx`),
      details.accessibleExample.replaceAll(
        'from "@parya/design-system"',
        'from "./index"',
      ),
    );
}
for (const doc of components.filter((doc) => doc.playground))
  exampleFiles.set(
    path.resolve("packages/web/src", `.docs-controls-${doc.name}.tsx`),
    playgroundCode(doc, doc.playground).replaceAll(
      'from "@parya/design-system"',
      'from "./index"',
    ),
  );
for (const hook of hooks)
  exampleFiles.set(
    path.resolve("packages/web/src", `.docs-example-${hook.name}.tsx`),
    `import {${hook.name}} from "./index";\n${hook.code}`,
  );
const host = ts.createCompilerHost(parsed.options);
const getSourceFile = host.getSourceFile.bind(host);
host.getSourceFile = (
  fileName,
  languageVersion,
  onError,
  shouldCreateNewSourceFile,
) => {
  const text = exampleFiles.get(path.resolve(fileName));
  return text === undefined
    ? getSourceFile(
        fileName,
        languageVersion,
        onError,
        shouldCreateNewSourceFile,
      )
    : ts.createSourceFile(
        fileName,
        text,
        languageVersion,
        true,
        ts.ScriptKind.TSX,
      );
};
const copyProgram = ts.createProgram(
  [...exampleFiles.keys()],
  parsed.options,
  host,
);
const copyErrors = ts
  .getPreEmitDiagnostics(copyProgram)
  .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
if (copyErrors.length)
  throw new Error(
    ts.formatDiagnosticsWithColorAndContext(copyErrors, {
      getCurrentDirectory: () => process.cwd(),
      getCanonicalFileName: (name) => name,
      getNewLine: () => "\n",
    }),
  );
await mkdir("apps/docs/src/generated", { recursive: true });
await mkdir("apps/docs/public/docs", { recursive: true });
await mkdir("apps/docs/public/api", { recursive: true });
await writeFile(
  "apps/docs/src/generated/components.json",
  JSON.stringify(components, null, 2),
);
await writeFile(
  "apps/docs/src/generated/hooks.json",
  JSON.stringify(hooks, null, 2),
);
await writeFile(
  "apps/docs/public/api/components.json",
  JSON.stringify(
    { package: pkg.name, version: pkg.version, components, hooks },
    null,
    2,
  ),
);
const blocks = [
  foundationsMarkdown,
  await readFile("apps/docs/public/docs/releases.md", "utf8"),
];
for (const c of components) {
  const snippet = exampleEntries.find((e) => e.name === c.name).code;
  const usage = c.usage;
  const md = `# ${c.name}\n\n${c.description}\n\nVersion: ${pkg.version}\nStatus: experimental. Not yet approved for production.\n\n## Installation\n\nThe package is not yet published to an npm registry. Use a locally built package or the repository checkout; see README.md.\n\n## Usage\n\nProvide application data, event handlers, and any referenced application components in the example. Render components inside ThemeProvider; mount Toaster once if using toast.\n\n\`\`\`tsx\n${usage}\n\`\`\`\n\n## API\n\n${c.props.length ? "| Prop | Type | Required |\n| --- | --- | --- |\n" + c.props.map((p) => `| ${p.name} | \`${p.type.replaceAll("|", " / ").replaceAll("\n", " ")}\` | ${p.required ? "Yes" : "No"} |`).join("\n") : "See the typed source for the full signature."}\n\nNative element attributes are supported where the public interface extends them.\n\n## Design guidance\n\n${c.guidance.join("\n\n") || "Use the Paper design reference and semantic tokens."}\n\n## Accessibility\n\nPreserve visible labels and accessible names. Test the complete workflow with keyboard navigation and assistive technology. Automated checks do not establish WCAG conformance.\n\n## References\n\n- [Source](${repositoryUrl}/blob/main/${c.sourcePath}#L${c.sourceLine})\n- [Paper](${c.paperUrl})\n- [Storybook source](${repositoryUrl}/tree/main/apps/storybook)\n\n## Agent instructions\n\nUse only APIs documented above. Do not assume parity with the historical design system or invent unsupported props from Paper labels. Use --pt-* semantic tokens; preserve keyboard and screen reader behavior.\n`;
  let reference = md;
  reference = reference.replace(
    `Version: ${pkg.version}`,
    `Package: ${pkg.name}\nVersion: ${pkg.version}`,
  );
  if (c.details) {
    const details = c.details;
    const typography = details.typography;
    reference = reference.replace(
      "## Design guidance",
      `## Typography\n\n${typography.description}\n\nFamily: ${typography.family} (\`${typography.familyToken}\`). Weight: ${typography.weight} (\`${typography.weightToken}\`).\n\n| Button size | Text size | Token |\n| --- | --- | --- |\n${typography.sizes.map((item) => `| ${item.size} | ${item.value} | \`${item.token}\` |`).join("\n")}\n\nUse the Foundations typography guide for the complete type system.\n\n## Icons and width\n\n${details.icons.join("\n\n")}\n\n## Design guidance\n\n${details.defaults}\n`,
    );
    reference = reference.replace(
      "Preserve visible labels and accessible names. Test the complete workflow with keyboard navigation and assistive technology. Automated checks do not establish WCAG conformance.",
      `${details.accessibility.map((item) => `- ${item}`).join("\n")}\n\n\`\`\`tsx\n${details.accessibleExample}\n\`\`\`\n\nTest the complete workflow with keyboard navigation and assistive technology. Automated checks do not establish WCAG conformance.`,
    );
    reference = reference.replace(
      "## References",
      `## Related components\n\n${details.related.map((item) => `- ${item.name}: ${item.reason}`).join("\n")}\n\n## References`,
    );
  }
  if (c.name === "AppShell")
    reference = reference.replace(
      "mount Toaster once if using toast.",
      "AppShell mounts Toaster by default; do not mount a second one in its pages.",
    );
  if (c.kind === "utility")
    reference = reference
      .replace("| Prop |", "| Parameter |")
      .replace(
        "Native element attributes are supported where the public interface extends them.",
        `Returns: \`${c.returnType}\`. This is a function, not a React component. It returns a new array where applicable and does not mutate the input rows.`,
      );
  if (c.kind === "constant")
    reference = reference.replace(
      /## API[\s\S]*?## Design guidance/,
      `## API\n\nThis export is a constant lookup value. Read it as data; do not call it as a function or render it as a React component.\n\nValue type: \`${c.returnType}\`\n\n## Design guidance`,
    );
  if (c.types.length)
    reference = reference.replace(
      "## Design guidance",
      `## Referenced types\n\n\`\`\`ts\n${c.types.map((type) => type.definition).join("\n\n")}\n\`\`\`\n\n## Design guidance`,
    );
  const connections = c.documentation;
  if (!c.details)
    reference = reference.replace(
      "Preserve visible labels and accessible names. Test the complete workflow with keyboard navigation and assistive technology. Automated checks do not establish WCAG conformance.",
      connections.accessibility.map((line) => `- ${line}`).join("\n") +
        "\n\nTest the complete workflow with keyboard navigation and assistive technology. Automated checks do not establish WCAG conformance.",
    );
  const tokenGroups = [
    ["Typography", connections.typography],
    ["Semantic colors", connections.colors],
    ["Spacing, size and shape", connections.layout],
  ];
  const connectionMarkdown = `## Connected foundations\n\n${connections.overview}\n\n${c.kind === "component" ? "[Typography](../#/foundations/typography) · [Colors](../#/foundations/color) · [Tokens](../#/foundations/tokens)\n\n" : ""}${connections.composition.length ? "Composes: " + connections.composition.map((name) => `[${name}](./${name}.md)`).join(", ") + ".\n\n" : ""}${connections.icons.length ? "Icon props: " + connections.icons.map((item) => `\`${item.name}\``).join(", ") + ". [Shared icon library](../#/icons).\n\n" : ""}${tokenGroups
    .filter(([, tokens]) => tokens.length)
    .map(
      ([label, tokens]) =>
        `### ${label}\n\n| Token | Shared definition |\n| --- | --- |\n${tokens.map((token) => `| \`${token.name}\` | \`${token.value}\` |`).join("\n")}`,
    )
    .join(
      "\n\n",
    )}\n\nToken references come from the component's CSS selectors. Theme overrides and composed children retain their shared styles.\n\n`;
  reference = reference.replace(
    "## References",
    connectionMarkdown + "## References",
  );
  await writeFile(`apps/docs/public/docs/${c.name}.md`, reference);
  blocks.push(reference);
}
for (const hook of hooks) {
  const reference = `# ${hook.name}\n\n${hook.description}\n\nVersion: ${pkg.version}. Call hooks inside a React component or another hook. Render inside ThemeProvider; useTheme can change the theme only when the provider receives setTheme.\n\n\`\`\`tsx\nimport {${hook.name}} from "@parya/design-system";\n${hook.code}\n\`\`\`\n\n[Source](${repositoryUrl}/blob/main/packages/web/src/${hook.name === "useTheme" ? "theme.tsx" : "hooks.ts"})\n`;
  await writeFile(`apps/docs/public/docs/${hook.name}.md`, reference);
  blocks.push(reference);
}
await writeFile(
  "apps/docs/public/llms.txt",
  `# Parya Design System\n\n> React and TypeScript components for travel SaaS. Version ${pkg.version}; experimental.\n\n## Start here\n\n- [Foundations: typography, color and accessibility](./docs/foundations.md)\n- [Machine-readable foundation roles](./api/foundations.json)\n- [Agent instructions](./agents.md)\n- [Complete documentation](./llms-full.txt)\n- [Machine-readable component API](./api/components.json)\n\n## Components\n\n${components.map((c) => `- [${c.name}](./docs/${c.name}.md): ${c.description.split(".")[0]}`).join("\n")}\n`,
);
await writeFile(
  "apps/docs/public/llms.txt",
  (await readFile("apps/docs/public/llms.txt", "utf8")) +
    `\n\n## Hooks\n\n${hooks.map((hook) => `- [${hook.name}](./docs/${hook.name}.md): ${hook.description}`).join("\n")}\n`,
);
await writeFile("apps/docs/public/llms-full.txt", blocks.join("\n\n---\n\n"));
await writeFile(
  "apps/docs/public/agents.md",
  await readFile("AGENTS.md", "utf8"),
);
await writeFile(
  "apps/docs/public/design-coverage.json",
  JSON.stringify(
    paper.map((p) => ({
      ...p,
      status: components.some((c) => c.name === p.name)
        ? "experimental"
        : "design-only",
    })),
    null,
    2,
  ),
);
console.log(
  `Generated ${components.length} code references, ${hooks.length} hooks, Markdown, and LLM endpoints; ${exampleFiles.size} complete examples type-checked.`,
);
