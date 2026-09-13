/**
 * The little of HTML the runtime writes itself: the rows put into the app's shell, and the
 * documents the app does not draw at all. Everything here is text going straight into a page,
 * so nothing reaches it unescaped and no value is trusted to be a number.
 */

export const escaped = (value: string): string =>
  value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

/** Dollars, rounded to the dollar. A loss says so rather than carrying a minus into a cell. */
export const usd = (value: number | null | undefined): string =>
  value === null || value === undefined || !Number.isFinite(value)
    ? "—"
    : `$${Math.round(Math.abs(value)).toLocaleString("en-US")}${value < 0 ? " loss" : ""}`;

/** A count, or a dash. Never the word null, which is what a reader sees when nobody checked. */
export const count = (value: number | null | undefined): string =>
  value === null || value === undefined || !Number.isFinite(value) ? "—" : Math.round(value).toLocaleString("en-US");

/** Unix seconds as a minute of UTC, which is the only clock a page written here can know. */
export const when = (ts: number | null | undefined): string =>
  ts === null || ts === undefined || !Number.isFinite(ts)
    ? "—"
    : new Date(ts * 1_000).toISOString().replace("T", " ").slice(0, 16);

/** What to call a token: its symbol where it has one, the start of its address where it does not. */
export const named = (symbol: string | null, token: string): string => symbol ?? `${token.slice(0, 10)}…`;

/** A cell is text, or text at an address — which is how a table is a path through the site
 *  for a reader who cannot run the app and a crawler that will not. */
export type Cell = string | { text: string; href: string };

const filled = (cell: Cell): string =>
  typeof cell === "string" ? escaped(cell) : `<a href="${escaped(cell.href)}">${escaped(cell.text)}</a>`;

export const table = (head: string[], rows: Cell[][]): string =>
  `<table><thead><tr>${head.map((h) => `<th>${escaped(h)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${filled(cell)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;

/** Where else to go, for the reader and the crawler that arrived without the app running. */
export const LINKS = `<nav>${[
  ["/", "Live tape"],
  ["/traders", "Traders"],
  ["/bags", "Bags"],
  ["/discover", "Discover"],
  ["/about", "How the tape is built"],
]
  .map(([href, name]) => `<a href="${href}">${name}</a>`)
  .join(" ")}</nav>`;

/** The same few colours public/about.html sets, for the documents written rather than stored. */
export const STYLE = `
  :root { color-scheme: dark }
  body { margin: 0 auto; max-width: 52rem; padding: 2.5rem 1.25rem 4rem; background: #0a0d10; color: #b6c0cb;
         font: 15px/1.7 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif }
  h1 { color: #e6edf3; font-size: 1.6rem; margin: 0 0 .35rem; font-weight: 600 }
  h2 { color: #e6edf3; font-size: 1.05rem; margin: 2.25rem 0 .5rem; font-weight: 600 }
  a { color: #2fd08a; text-decoration: none }
  a:hover { text-decoration: underline }
  .lede, .crumb, footer { color: #7d8792 }
  .crumb { margin: 0 0 1.5rem; font-size: 13px }
  table { border-collapse: collapse; width: 100%; margin: .5rem 0; font-size: 13px }
  th, td { text-align: left; padding: .35rem .6rem .35rem 0; border-bottom: 1px solid #1b2229; white-space: nowrap }
  th { color: #7d8792; font-weight: 500 }
  dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: .75rem 1.5rem; margin: 1.25rem 0 }
  dt { color: #7d8792; font-size: 12px }
  dd { color: #e6edf3; margin: 0; font-size: 15px }
  nav { margin: 2.5rem 0 0; padding: 1rem 0 0; border-top: 1px solid #1b2229 }
  nav a { margin-right: 1.25rem; white-space: nowrap }
  footer { margin-top: 2rem; font-size: 13px }
`;
