// QuranRoom - Google Apps Script backend
//
// SETUP (do this once, takes about a minute):
// 1. Create a new Google Sheet (or open one you already use for this).
// 2. In the Sheet, go to Extensions -> Apps Script.
// 3. Delete any starter code and paste this entire file in its place.
// 4. Click Deploy -> New deployment -> select type "Web app".
//    - Execute as: Me
//    - Who has access: Anyone
// 5. Click Deploy, authorize the script when prompted, then copy the
//    Web app URL it gives you.
// 6. Paste that URL into the QuranRoom extension's onboarding page (or
//    Settings tab). That's it — no sheet ID or personal info needed here;
//    this script always writes to whichever spreadsheet it's attached to.

const SHEET_NAME = 'QuranRoom Log';

function doPost(e) {
  try {
    const sheet = getOrCreateSheet_();
    const data = JSON.parse(e.postData.contents);
    const logDate = new Date(data.date);

    sheet.appendRow([
      logDate,                    // Timestamp
      data.page,                  // Page Number
      data.mode,                  // Session Type (Recitation/Tafsir/Menses)
      data.intention || '',       // Daily Intention
      data.notes || ''            // Reflection Notes
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Log saved to ' + SHEET_NAME + ' sheet',
        timestamp: logDate.toISOString(),
        sheet: SHEET_NAME,
        page: data.page
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// GET is handy for testing: open the deployed Web app URL in a browser.
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'QuranRoom Apps Script is running',
      timestamp: new Date().toISOString(),
      targetSheet: SHEET_NAME,
      message: 'Use POST to send log data'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(['Timestamp', 'Page Number', 'Session Type', 'Daily Intention', 'Reflection Notes']);

    const headerRange = sheet.getRange(1, 1, 1, 5);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4D5E4F');
    headerRange.setFontColor('#FFFFFF');
  }

  return sheet;
}
