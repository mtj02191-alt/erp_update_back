const { Client } = require('pg');

async function main() {
  const loginRes = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'admin%1123' }),
  });
  const loginText = await loginRes.text();
  console.log('LOGIN_HTTP=' + loginRes.status);
  console.log(loginText.slice(0, 500));
  if (!loginRes.ok) process.exit(1);

  const loginData = JSON.parse(loginText);
  const setCookie = loginRes.headers.get('set-cookie') || '';
  const cookie = setCookie.split(';')[0];
  if (!cookie) {
    throw new Error('No jwt cookie returned');
  }

  const client = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'root', database: 'task_db' });
  await client.connect();
  const noteRes = await client.query("SELECT id, category, status FROM ceo_notes WHERE category = 'emails_and_approvals' ORDER BY id DESC LIMIT 3");
  console.log('NOTES=' + JSON.stringify(noteRes.rows));
  if (!noteRes.rows.length) {
    await client.end();
    process.exit(0);
  }

  const noteId = noteRes.rows[0].id;
  const approvalRes = await fetch(`http://localhost:3000/ceo-notes/${noteId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ decision: 'approved', remarks: 'live-db-check' }),
  });
  const approvalText = await approvalRes.text();
  console.log('APPROVE_HTTP=' + approvalRes.status);
  console.log(approvalText.slice(0, 500));

  const noteAfter = await client.query("SELECT id, status FROM ceo_notes WHERE id = $1", [noteId]);
  const approvalAfter = await client.query("SELECT id, note_id, approval_decision, approval_decision_remarks FROM ceo_note_approvals WHERE note_id = $1", [noteId]);
  console.log('DB_AFTER=' + JSON.stringify({ note: noteAfter.rows[0], approval: approvalAfter.rows[0] }, null, 2));

  await client.end();
}
main().catch(err => {
  console.error(err.stack || err);
  process.exit(1);
});
