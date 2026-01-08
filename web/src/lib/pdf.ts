function escapeHtml(str: string) {
  return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export function openAssessmentPdf(assessment: any) {
  const total = (assessment.condition_rating || assessment.condition) * (assessment.priority_rating || assessment.priority);
  const html = `
    <html>
    <head><title>Assessment ${assessment.id}</title></head>
    <body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 20px;">
      <h2>Asset Assessment Report</h2>
      <p><strong>ID:</strong> ${escapeHtml(assessment.id)}</p>
      <p><strong>Category:</strong> ${escapeHtml(assessment.category)}</p>
      <p><strong>Element:</strong> ${escapeHtml(assessment.element)}</p>
      <p><strong>Date:</strong> ${new Date(assessment.created_at).toLocaleString()}</p>
      <p><strong>Score:</strong> ${total}</p>
      <p><strong>Notes:</strong> ${escapeHtml(assessment.notes || '')}</p>
    </body>
    </html>
  `;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

export function openBatchPdf(assessments: any[]) {
  const rows = assessments.map((a) => `
    <tr>
      <td>${escapeHtml(a.id)}</td>
      <td>${escapeHtml(a.category)}</td>
      <td>${escapeHtml(a.element)}</td>
      <td>${new Date(a.created_at).toLocaleString()}</td>
      <td>${escapeHtml(String(a.condition_rating || a.condition))}</td>
      <td>${escapeHtml(String(a.priority_rating || a.priority))}</td>
    </tr>
  `).join('');

  const html = `
    <html>
    <head><title>Batch Assessment Report</title></head>
    <body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 20px;">
      <h2>Batch Assessment Report</h2>
      <table border="1" cellspacing="0" cellpadding="6">
        <thead>
          <tr>
            <th>ID</th><th>Category</th><th>Element</th><th>Date</th><th>Condition</th><th>Priority</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
    </html>
  `;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
