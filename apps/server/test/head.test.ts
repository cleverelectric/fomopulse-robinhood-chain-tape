/**
 * The head each screen is served. One file is the app, so without this every address carries
 * the home page's title and the home page's canonical — which is a search engine being told
 * the other three screens are copies and asked not to keep them.
 *
 * Read against the real apps/web/index.html rather than a fixture: what is being tested is
 * that the rewriter and that file still name the same tags.
 */
import { expect, test } from "bun:test";
import { dress, SOURCE } from "../src/api/shell.ts";
import { PAGES, SITE, VIEW_PATHS } from "../src/api/views.ts";

const source = await Bun.file(new URL("../../web/index.html", import.meta.url)).text();
const served = (path: string, rows?: unknown[]): Promise<string> =>
  dress(new Response(source, { headers: { "content-type": "text/html; charset=utf-8" } }), path, rows).text();

test("every screen is a page of its own: its name, its sentence, its address", async () => {
  for (const path of VIEW_PATHS) {
    const page = PAGES[path];
    expect({ path, named: page !== undefined }).toEqual({ path, named: true });
    const html = await served(path);
    const here = `${SITE}${path}`;
    expect(html).toContain(`<title>${page!.title}</title>`);
    expect(html).toContain(`<meta name="description" content="${page!.description}"`);
    expect(html).toContain(`<link rel="canonical" href="${here}"`);
    expect(html).toContain(`<meta property="og:url" content="${here}"`);
    expect(html).toContain(`<meta property="og:title" content="${page!.title}"`);
    expect(html).toContain(`<meta name="twitter:title" content="${page!.title}"`);
    expect(html).toContain(`<meta property="og:description" content="${page!.description}"`);
    expect(html).toContain(`<meta name="twitter:description" content="${page!.description}"`);
  }
});

test("no two screens answer to the same name", () => {
  const titles = VIEW_PATHS.map((path) => PAGES[path]!.title);
  expect(new Set(titles).size).toBe(titles.length);
  const said = VIEW_PATHS.map((path) => PAGES[path]!.description);
  expect(new Set(said).size).toBe(said.length);
});

test("a trailing slash is the same page and not a second one", async () => {
  expect(await served("/bags/")).toContain(`<link rel="canonical" href="${SITE}/bags"`);
});

test("a path no screen answers to is served whatever it was, untouched", async () => {
  expect(await served("/nowhere")).toBe(source);
});

test("the sitemap names every screen and nothing the app does not draw", async () => {
  const xml = await Bun.file(new URL("../../web/public/sitemap.xml", import.meta.url)).text();
  const listed = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => loc!);
  // The home page keeps its trailing slash and no other address grows one.
  expect(listed.sort()).toEqual(VIEW_PATHS.map((path) => `${SITE}${path}`).sort());
});

test("a screen without JavaScript is the screen, not an empty div", async () => {
  const html = await served("/traders", [
    { rank: 1, handle: "unipcs", fills: 12, tape_volume: 40_500, total: -1_250 },
    { rank: 2, handle: "frankdegods", fills: 3, tape_volume: 900, total: null },
  ]);
  expect(html).toContain("<h1>");
  expect(html).toContain("<td>unipcs</td>");
  expect(html).toContain("<td>$40,500</td>");
  // A loss says so rather than carrying a minus into a cell nothing explains.
  expect(html).toContain("<td>$1,250 loss</td>");
  // Nothing to say is a dash, and never the word null.
  expect(html).toContain("<td>—</td>");
  expect(html).not.toContain("null");
});

test("what a token calls itself cannot close a tag", async () => {
  const html = await served("/bags", [
    { token: "0xdead", symbol: '</td><script>alert("x")</script>', holders: 1, value: 1, pnl: null, first_buyer: null },
  ]);
  expect(html).not.toContain("<script>alert");
  expect(html).toContain("&lt;/td&gt;&lt;script&gt;");
});

test("a screen with nothing to show is still a page that says what it is", async () => {
  const html = await served("/discover", []);
  expect(html).toContain(`<title>${PAGES["/discover"]!.title}</title>`);
  expect(html).not.toContain("<table>");
});

test("every screen draws its rows from an address the app itself asks for", () => {
  for (const path of VIEW_PATHS) {
    const source_ = SOURCE[path];
    expect({ path, has: source_ !== undefined }).toEqual({ path, has: true });
    expect(source_!.startsWith("/api/")).toBe(true);
  }
});
