import { useState } from "react";
import history from "./generated/releases.json";

export default function Releases() {
  const [packageId, setPackageId] = useState(history.packages[0].id);
  const current = history.packages.find((item) => item.id === packageId)!;
  return (
    <article className="ds-prose ds-releases">
      <div className="ds-breadcrumb">Resources</div>
      <h1>Releases</h1>
      <p className="ds-lede">What changed, by package and version.</p>
      <div className="ds-release-package">
        <label htmlFor="release-package">Package</label>
        <select
          id="release-package"
          value={packageId}
          onChange={(event) => setPackageId(event.target.value)}
        >
          {history.packages.map((item) => (
            <option value={item.id} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div aria-live="polite" aria-atomic="true" className="ds-release-summary">
        <h2>{current.name}</h2>
        <p>
          {current.description} Current recorded version:{" "}
          <strong>{current.version}</strong>.
        </p>
      </div>
      <p className="ds-caption">{history.publication}</p>
      <p className="ds-release-links">
        <a
          href={
            current.source.includes("/tree/")
              ? `${current.source.replace("/tree/", "/blob/")}/CHANGELOG.md`
              : `${current.source}/blob/main/CHANGELOG.md`
          }
          target="_blank"
          rel="noreferrer"
        >
          Source history
        </a>
        <a href={`${import.meta.env.BASE_URL}docs/releases.md`}>
          View as Markdown
        </a>
      </p>
      {current.releases.map((release) => (
        <section
          className="ds-doc-section ds-release-entry"
          key={release.version}
        >
          <div className="ds-release-heading">
            <h2>{release.version}</h2>
            {release.date ? (
              <time dateTime={release.date}>
                {new Intl.DateTimeFormat("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                }).format(new Date(`${release.date}T00:00:00Z`))}
              </time>
            ) : (
              <span className="ds-caption">Next update</span>
            )}
          </div>
          <h3>{release.title}</h3>
          {release.changes.map((group) => (
            <div key={group.type}>
              <h4>{group.type}</h4>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
          <p>
            <strong>Adoption:</strong> {release.adoption}
          </p>
        </section>
      ))}
      <details className="ds-release-template-note">
        <summary>How templates adapt to phones</summary>
        <p>{history.templateNote}</p>
        <p>
          Lists become labelled cards, page rails stack below the main content,
          and navigation is available when needed. Desktop keeps the existing
          arrangement.
        </p>
      </details>
    </article>
  );
}
