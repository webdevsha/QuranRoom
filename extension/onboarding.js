const APPS_SCRIPT_CODE = `// QuranRoom - Google Apps Script backend
// Paste this whole file into Extensions -> Apps Script, then deploy as a Web App.

const SHEET_NAME = 'QuranRoom Log';

function doPost(e) {
  try {
    const sheet = getOrCreateSheet_();
    const data = JSON.parse(e.postData.contents);
    const logDate = new Date(data.date);

    sheet.appendRow([
      logDate,
      data.page,
      data.mode,
      data.intention || '',
      data.notes || ''
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
`;

document.addEventListener('DOMContentLoaded', async () => {
  const codeBox = document.getElementById('code-box');
  const copyBtn = document.getElementById('copy-btn');
  const urlInput = document.getElementById('url-input');
  const saveBtn = document.getElementById('save-btn');
  const statusEl = document.getElementById('status');

  codeBox.textContent = APPS_SCRIPT_CODE;

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy Code'; }, 1500);
    } catch (err) {
      copyBtn.textContent = 'Select the text above and copy manually';
    }
  });

  // Pre-fill if a URL is already saved (re-running setup)
  try {
    const data = await chrome.storage.local.get(['quran_room_state_v1']);
    const state = data.quran_room_state_v1 || {};
    if (state.webAppUrl) urlInput.value = state.webAppUrl;
  } catch (err) {}

  saveBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();

    if (!url.startsWith('https://script.google.com/macros/')) {
      statusEl.textContent = 'That doesn\'t look like a Google Apps Script Web App URL. Double-check step 3.';
      statusEl.className = 'status err';
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const data = await chrome.storage.local.get(['quran_room_state_v1']);
      const state = data.quran_room_state_v1 || {
        currentPage: 1,
        lastLoggedDate: null,
        mensesMode: false,
        readingSchedule: [],
        scheduleIndex: 0
      };
      state.webAppUrl = url;
      await chrome.storage.local.set({ quran_room_state_v1: state });

      chrome.runtime.sendMessage({ action: 'refreshAllTabs' }).catch(() => {});

      statusEl.textContent = "✓ Saved! You're all set — redirecting...";
      statusEl.className = 'status ok';

      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1200);
    } catch (err) {
      statusEl.textContent = 'Error saving: ' + err.message;
      statusEl.className = 'status err';
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save & Finish Setup';
    }
  });
});
