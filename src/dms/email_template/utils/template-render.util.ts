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
