export function renderTemplateText(
  text: string,
  data: Record<string, string | number | null | undefined>,
): string {
  if (!text) return "";
  return text.replace(/{{\s*(\w+)\s*}}/g, (match, key) => {
    const value = data[key];
    return value !== undefined && value !== null && value !== ""
      ? String(value)
      : match;
  });
}

/** Plain-text templates become HTML so line breaks show in the inbox. */
export function ensureEmailHtml(body: string): string {
  if (!body) return "";
  if (/<[a-z][\s\S]*>/i.test(body)) return body;
  return body
    .split(/\n{2,}/)
    .map((paragraph) => {
      const safe = paragraph
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
      return `<p>${safe}</p>`;
    })
    .join("");
}

export function appendCtaToBody(
  body: string,
  ctaButtonText?: string | null,
  ctaUrl?: string | null,
): string {
  if (!ctaButtonText || !ctaUrl) return body;
  const ctaHtml = `<p style="margin-top:24px"><a href="${ctaUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">${ctaButtonText}</a></p>`;
  if (body.includes("</body>")) {
    return body.replace("</body>", `${ctaHtml}</body>`);
  }
  return `${body}${ctaHtml}`;
}
