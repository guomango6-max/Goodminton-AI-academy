# Google Sheet Student Data Setup

## Sheet

Create a Google Sheet with a tab named `students`.

Required columns:

```text
studentId | aliases | accessCode | studentJson
```

Example rows:

```text
guo-yiwei | gyw | 1122 | {"studentId":"guo-yiwei",...}
li-chenrun | lcr | 2233 | {"studentId":"li-chenrun",...}
```

`studentJson` should contain the full student JSON. The website still checks `accessCode` on the server and removes it before returning data to the browser.

## Apps Script

Open the Sheet, then go to `Extensions` -> `Apps Script`. Paste this script:

```js
const TOKEN = 'CHANGE_THIS_TO_A_LONG_RANDOM_TOKEN';
const TAB_NAME = 'students';

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    if (body.token !== TOKEN) {
      return json({ error: 'unauthorized' }, 401);
    }

    const requestedId = String(body.studentId || '').trim().toLowerCase();
    if (!requestedId) {
      return json({ error: 'missing studentId' }, 400);
    }

    const sheet = SpreadsheetApp.getActive().getSheetByName(TAB_NAME);
    const values = sheet.getDataRange().getValues();
    const headers = values.shift().map(String);
    const rows = values.map((row) => Object.fromEntries(headers.map((key, index) => [key, row[index]])));

    const row = rows.find((item) => {
      const studentId = String(item.studentId || '').trim().toLowerCase();
      const aliases = String(item.aliases || '')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
      return studentId === requestedId || aliases.includes(requestedId);
    });

    if (!row) {
      return json({ error: 'not found' }, 404);
    }

    const student = JSON.parse(String(row.studentJson || '{}'));
    if (!student.accessCode && row.accessCode) {
      student.accessCode = String(row.accessCode).trim();
    }

    return json({ student });
  } catch (error) {
    return json({ error: String(error) }, 500);
  }
}

function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Deploy it as a Web App:

```text
Deploy -> New deployment -> Web app
Execute as: Me
Who has access: Anyone
```

Copy the Web App URL.

## Vercel

Add Production environment variables:

```text
GOODMINTON_STUDENT_SHEET_ENDPOINT = Apps Script Web App URL
GOODMINTON_STUDENT_SHEET_TOKEN = the same TOKEN from Apps Script
```

Redeploy the Vercel production deployment after saving variables.
