/**
 * The addresses the web app draws itself, which both runtimes answer with the app shell.
 * Kept in step with PATH in apps/web/src/url.ts: the web app cannot be imported from here —
 * the dependency runs the other way — so a screen added there is added here too, and one
 * that is not is a 404 before the app ever loads, which is what an unknown address should be.
 */
export const VIEW_PATHS: string[] = ["/", "/traders", "/bags", "/discover"];

/** `/bags/` is `/bags`; nothing else about a path is forgiven. */
export const trimmed = (pathname: string): string => (pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname);

export const isViewPath = (pathname: string): boolean => VIEW_PATHS.includes(trimmed(pathname));

/**
 * The one origin every absolute address on the page names. The same string is written into
 * public/robots.txt and public/sitemap.xml, which are files a crawler reads before any of
 * this runs and so cannot be given it.
 */
export const SITE = "https://fomopulse.app";

/** What a screen calls itself where the reader never looks: the tab, the search result, the card. */
export interface Page {
  title: string;
  description: string;
}

/**
 * One page per screen. The shell is one file, so without this every address serves the home
 * page's title and, worse, its canonical — which tells a search engine the other three are
 * the same page and asks it not to keep them.
 */
export const PAGES: Record<string, Page> = {
  "/": {
    title: "fomopulse — live tape of the top fomo.family traders on Robinhood Chain",
    description:
      "Every buy and sell of the top fomo.family traders on Robinhood Chain, on one live tape: size, price, token, trader, transaction. Open source, read-only, no keys, no trading.",
  },
  "/traders": {
    title: "Traders — who is making money on Robinhood Chain · fomopulse",
    description:
      "Every tracked fomo.family trader ranked by realised and open profit over the last hour, day, week or month, walked from this tape's own fills rather than reported by anyone.",
  },
  "/bags": {
    title: "Bags — what the fomo.family traders are still holding · fomopulse",
    description:
      "What the tracked fomo.family wallets are long on Robinhood Chain right now: size, cost, return, and how many of them entered or left over the window.",
  },
  "/discover": {
    title: "Discover — new Robinhood Chain tokens the fomo.family traders are buying · fomopulse",
    description:
      "Pools opened in the last three days that tracked fomo.family wallets have bought into: who was first in, at what market cap, and what the pool has done since.",
  },
};

/** The page at an address, if the app draws one there. */
export const pageOf = (pathname: string): Page | undefined => PAGES[trimmed(pathname)];
