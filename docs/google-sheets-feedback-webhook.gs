/**
 * Goodminton Academy — feedback webhook receiver.
 *
 * Setup:
 * 1. Open the target Google Sheet, Extensions → Apps Script, paste this file.
 * 2. Project Settings → Script Properties → add `WEBHOOK_SECRET` with a random string.
 * 3. Deploy → New deployment → type: Web app → execute as: me, access: anyone.
 * 4. Copy the Web App URL into Vercel env `GOODMINTON_FEEDBACK_WEBHOOK_URL`.
 * 5. Set the same secret in Vercel env `GOODMINTON_FEEDBACK_WEBHOOK_SECRET`.
 */

function doPost(e) {
  try {
    const expected = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (expected && data.secret !== expected) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('feedback') || ss.insertSheet('feedback');

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['receivedAt', 'time', 'role', 'lang', 'source', 'lastUserText']);
    }

    sheet.appendRow([
      new Date(),
      data.time || '',
      data.role || '',
      data.lang || '',
      data.source || 'Goodminton Academy chat',
      data.lastUserText || '',
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
