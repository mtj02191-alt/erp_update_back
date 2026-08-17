/** Auto-submit HTML form (APG HS/SSO) — avoids long redirect URLs with encoded form fields. */
export function renderApgAutoPostHtml(
  formAction: string,
  formFields: Record<string, string>,
  title = "Redirecting to Bank Alfalah",
): string {
  const inputs = Object.entries(formFields)
    .filter(([, v]) => v != null && v !== "")
    .map(([name, value]) => {
      const escaped = String(value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;");
      return `<input type="hidden" name="${name}" value="${escaped}" />`;
    })
    .join("\n");

  const escapedAction = formAction
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body>
  <p style="font-family:sans-serif;text-align:center;margin-top:2rem;">
    Redirecting to Bank Alfalah secure checkout…
  </p>
  <form id="apgForm" method="POST" action="${escapedAction}">
    ${inputs}
  </form>
  <script>document.getElementById("apgForm").submit();</script>
</body>
</html>`;
}

/** Append donationId to a public return URL (merchant convention — not an APG field name). */
export function appendDonationIdToReturnUrl(
  baseUrl: string,
  donationId: string | number,
): string {
  const base = baseUrl.replace(/\/$/, "");
  const id = encodeURIComponent(String(donationId));
  return base.includes("?") ? `${base}&donationId=${id}` : `${base}?donationId=${id}`;
}
