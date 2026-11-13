import type { SourceResult, TransportNotice } from "./types.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function localDateTime(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function summarize(notice: TransportNotice): string {
  const cleaned = notice.text
    .replace(notice.title, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > 420 ? `${cleaned.slice(0, 417)}...` : cleaned;
}

export function buildReport(results: SourceResult[]): string {
  const checkedAt = new Date();
  const failed = results.filter((result) => result.error);
  const allNotices = results.flatMap((result) => result.notices);

  const major = allNotices.filter((notice) => notice.status === "major-disruption");
  const partial = allNotices.filter((notice) => notice.status === "partial-disruption");
  const cancelled = allNotices.filter((notice) => notice.status === "cancelled");

  const lines: string[] = [
    "🚌 <b>Транспорт Offenburg</b>",
    `📅 ${escapeHtml(localDateTime(checkedAt))}`,
    "",
  ];

  if (failed.length === results.length) {
    lines.push(
      "⚠️ <b>Статус неизвестен</b>",
      "Не удалось получить данные ни от одного источника. Это не означает, что транспорт не работает.",
    );
  } else if (major.length > 0) {
    lines.push("🔴 <b>Обнаружены серьёзные нарушения движения</b>");
  } else if (partial.length > 0) {
    lines.push("🟠 <b>Обнаружены частичные ограничения</b>");
  } else {
    lines.push("🟢 <b>Серьёзных нарушений в проверенных сообщениях не обнаружено</b>");
    lines.push(
      "Это не гарантирует отсутствие отдельных задержек или отмен отдельных рейсов.",
    );
  }

  if (major.length > 0) {
    lines.push("", "<b>Серьёзные нарушения:</b>");
    for (const notice of major.slice(0, 5)) {
      lines.push(
        `• <b>${escapeHtml(notice.sourceName)}:</b> ${escapeHtml(notice.title)}`,
        `${escapeHtml(summarize(notice))}`,
        `<a href="${escapeHtml(notice.url)}">Источник</a>`,
      );
    }
  }

  if (partial.length > 0) {
    lines.push("", "<b>Другие ограничения:</b>");
    for (const notice of partial.slice(0, 5)) {
      lines.push(
        `• <b>${escapeHtml(notice.sourceName)}:</b> ${escapeHtml(notice.title)}`,
        `${escapeHtml(summarize(notice))}`,
        `<a href="${escapeHtml(notice.url)}">Источник</a>`,
      );
    }
  }

  if (cancelled.length > 0) {
    lines.push("", "<b>Отменённые предупреждения:</b>");
    for (const notice of cancelled.slice(0, 3)) {
      lines.push(
        `• ${escapeHtml(notice.title)}`,
        `<a href="${escapeHtml(notice.url)}">Подтверждение источника</a>`,
      );
    }
  }

  lines.push("", "<b>Проверенные источники:</b>");
  for (const result of results) {
    if (result.error) {
      lines.push(`⚠️ ${escapeHtml(result.source.name)} — ошибка: ${escapeHtml(result.error)}`);
    } else {
      lines.push(`✅ <a href="${escapeHtml(result.source.url)}">${escapeHtml(result.source.name)}</a>`);
    }
  }

  lines.push(
    "",
    "<i>Это мониторинг официальных сообщений, а не проверка каждого отдельного рейса в реальном времени.</i>",
  );

  return lines.join("\n");
}
