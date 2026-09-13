/**
 * The head each screen is served. One file is the app, so without this every address carries
 * the home page's title and the home page's canonical — which is a search engine being told
 * the other three screens are copies and asked not to keep them.
 *
 * Read against the real apps/web/index.html rather than a fixture: what is being tested is
 * that the rewriter and that file still name the same tags.
 */
import { expect, test } from "bun:test";
import { dress } from "../src/api/shell.ts";
import { PAGES, SITE, VIEW_PATHS } from "../src/api/views.ts";

const source = await Bun.file(new URL("../../web/index.html", import.meta.url)).text();
const served = (path: string): Promise<string> =>
  dress(new Response(source, { headers: { "content-type": "text/html; charset=utf-8" } }), path).text();

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
