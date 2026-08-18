function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[char])
}

export function renderInspector(report) {
  const cards = report.results.map((row) => {
    const body = row.counterexample
      ? `<details><summary>Counterexample</summary><pre>${escapeHtml(JSON.stringify(row.counterexample, null, 2))}</pre></details>`
      : `<p class="evidence">Evidence: ${escapeHtml((row.evidenceRefs ?? []).join(', ') || 'n/a')}</p>`

    return `<article class="result-card" data-status="${escapeHtml(row.status)}">
      <div class="result-head">
        <div>
          <p class="profile">${escapeHtml(row.profileId)}</p>
          <h2>${escapeHtml(row.profileTitle)}</h2>
        </div>
        <span class="status status-${escapeHtml(row.status.toLowerCase())}">${escapeHtml(row.status)}</span>
      </div>
      <p class="scenario">Scenario: <code>${escapeHtml(row.scenarioId)}</code></p>
      ${body}
    </article>`
  }).join('\n')

  const summary = Object.entries(report.summary)
    .map(([status, count]) => `<span class="metric"><strong>${escapeHtml(status)}</strong> ${escapeHtml(count)}</span>`)
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ActionSeam Inspector</title>
<style>
:root{font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#181818;background:#f7f6f2}*{box-sizing:border-box}body{margin:0}main{max-width:1080px;margin:0 auto;padding:48px 20px 72px}.kicker{font-size:12px;font-weight:700;letter-spacing:.13em;text-transform:uppercase}.hero{margin-bottom:32px}.hero h1{font-size:clamp(38px,7vw,72px);line-height:.98;letter-spacing:-.055em;margin:.15em 0}.hero p{max-width:760px;font-size:17px;line-height:1.6;color:#5d5a55}.summary{display:flex;flex-wrap:wrap;gap:8px;margin:24px 0}.metric{background:#fff;border:1px solid #ddd8ce;border-radius:999px;padding:8px 12px;font-size:13px}.results{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.result-card{background:#fff;border:1px solid #ddd8ce;border-radius:18px;padding:20px;min-height:190px}.result-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.profile{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#6c675f;margin:0 0 6px}.result-card h2{font-size:20px;line-height:1.2;margin:0;letter-spacing:-.02em}.status{font-size:11px;font-weight:800;border:1px solid currentColor;border-radius:999px;padding:5px 8px}.status-pass{color:#1e6845}.status-fail{color:#a2382f}.status-unsupported,.status-not_tested,.status-indeterminate{color:#7b611c}.scenario,.evidence{font-size:13px;line-height:1.5;color:#666057}details{margin-top:18px}summary{cursor:pointer;font-weight:700;font-size:13px}pre{white-space:pre-wrap;word-break:break-word;background:#171717;color:#f5f5f5;border-radius:12px;padding:14px;font-size:12px;line-height:1.5}.footer{margin-top:30px;font-size:12px;color:#777168}@media(max-width:760px){main{padding-top:30px}.results{grid-template-columns:1fr}.hero h1{font-size:46px}}
</style>
</head>
<body>
<main>
<section class="hero">
<p class="kicker">ActionSeam · Inspector</p>
<h1>Evidence before confidence.</h1>
<p>Exact subject versions, versioned profiles, explicit result states, and reproducible counterexamples. The Inspector is a reading surface for evidence; it does not grant authority or certify production safety.</p>
</section>
<section class="summary">${summary}</section>
<section class="results">${cards}</section>
<p class="footer">Report digest: <code>${escapeHtml(report.reportDigest)}</code></p>
</main>
</body>
</html>`
}
