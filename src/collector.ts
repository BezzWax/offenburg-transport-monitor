import * as cheerio from "cheerio";
import type {
  NoticeStatus,
  SourceResult,
  TransportNotice,
  TransportSource,
} from "./types.js";

const USER_AGENT =
  "OffenburgTransportMonitor/0.1 (+https://github.com; public transport notice checker)";

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function classify(text: string): NoticeStatus {
  const value = text.toLocaleLowerCase("de-DE");

  const strikeMentioned = /streik|warnstreik/.test(value);
  const strikeCancelled =
    strikeMentioned &&
    /(abgesagt|aufgehoben|findet nicht statt|wurde beendet)/.test(value);

  if (strikeCancelled) return "cancelled";

  if (
    /(weitestgehend eingestellt|verkehr wird eingestellt|verkehr eingestellt|kein(e|en)? busverkehr|keine busse|fällt aus|fallen aus|fahrten entfallen)/.test(
      value,
    )
  ) {
    return "major-disruption";
  }

  if (
    /(umleitung|haltestelle.{0,40}(entfällt|nicht bedient)|bauarbeiten|verspätung|einschränkungen|störung|beeinträchtigung|streik|warnstreik)/.test(
      value,
    )
  ) {
    return "partial-disruption";
  }

  return "information";
}

function isRelevant(text: string, source: TransportSource): boolean {
  if (source.kind === "city-bus") return true;

  return /(ortenau|offenburg|lahr|kehl|sweg|busverkehr|busse|schienenverkehr|bahnverkehr)/i.test(
    text,
  );
}

function absoluteUrl(href: string | undefined, baseUrl: string): string {
  if (!href) return baseUrl;

  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return baseUrl;
  }
}

/**
 * Extracts text blocks that start at a heading and continue until the next heading.
 * This intentionally uses generic HTML structure because source websites may change
 * their CSS class names.
 */
function extractHeadingBlocks(
  html: string,
  source: TransportSource,
): Array<{ title: string; text: string; url: string }> {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, noscript").remove();

  const blocks: Array<{ title: string; text: string; url: string }> = [];

  $("h1, h2, h3, h4, h5").each((_index, element) => {
    const heading = $(element);
    const title = normalize(heading.text());

    if (!title || title.length < 5) return;

    let text = title;
    let link = heading.find("a").attr("href") ?? heading.parent().find("a").first().attr("href");

    let sibling = heading.next();
    let siblingCount = 0;

    while (sibling.length > 0 && siblingCount < 8) {
      if (/^h[1-5]$/i.test(sibling.get(0)?.tagName ?? "")) break;

      const siblingText = normalize(sibling.text());
      if (siblingText) text += ` ${siblingText}`;

      if (!link) link = sibling.find("a").first().attr("href");

      sibling = sibling.next();
      siblingCount += 1;
    }

    text = normalize(text);

    if (text.length >= 15 && isRelevant(text, source)) {
      blocks.push({
        title,
        text: text.slice(0, 1800),
        url: absoluteUrl(link, source.url),
      });
    }
  });

  // Fallback: if the site uses no semantic headings, retain a short page-level
  // snapshot instead of silently claiming that no notices exist.
  if (blocks.length === 0) {
    const bodyText = normalize($("body").text()).slice(0, 5000);
    if (bodyText) {
      blocks.push({
        title: `${source.name}: Seitenübersicht`,
        text: bodyText,
        url: source.url,
      });
    }
  }

  // Avoid duplicate heading blocks and keep the first, usually most prominent, notices.
  const seen = new Set<string>();
  return blocks.filter((block) => {
    const key = `${block.title}|${block.text.slice(0, 160)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

export async function collectSource(
  source: TransportSource,
): Promise<SourceResult> {
  const checkedAt = new Date();

  try {
    const response = await fetch(source.url, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const blocks = extractHeadingBlocks(html, source);

    const notices: TransportNotice[] = blocks.map((block) => ({
      sourceId: source.id,
      sourceName: source.name,
      title: block.title,
      text: block.text,
      url: block.url,
      status: classify(block.text),
    }));

    return { source, checkedAt, notices };
  } catch (error) {
    return {
      source,
      checkedAt,
      notices: [],
      error: error instanceof Error ? error.message : "Unknown collection error",
    };
  }
}
