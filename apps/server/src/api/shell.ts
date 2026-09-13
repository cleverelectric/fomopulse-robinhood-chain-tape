import { pageOf, SITE, trimmed } from "./views.ts";

/**
 * The app is one file and every screen is served that file, so the head a crawler reads is
 * the home page's, four times over — including its canonical, which says the other three
 * are copies of it and asks for them not to be kept. This puts each screen's own name,
 * sentence and address on the copy it is served, streamed through the response rather than
 * held in memory.
 */
export function dress(html: Response, pathname: string): Response {
  const page = pageOf(pathname);
  if (page === undefined) return html;
  const here = `${SITE}${trimmed(pathname)}`;
  const set = (attribute: string, value: string) => ({
    element(el: { setAttribute(name: string, value: string): void }) {
      el.setAttribute(attribute, value);
    },
  });
  return new HTMLRewriter()
    .on("title", {
      element(el: { setInnerContent(text: string): void }) {
        el.setInnerContent(page.title);
      },
    })
    .on('meta[name="description"]', set("content", page.description))
    .on('meta[property="og:description"]', set("content", page.description))
    .on('meta[name="twitter:description"]', set("content", page.description))
    .on('meta[property="og:title"]', set("content", page.title))
    .on('meta[name="twitter:title"]', set("content", page.title))
    .on('link[rel="canonical"]', set("href", here))
    .on('meta[property="og:url"]', set("content", here))
    .transform(html);
}
