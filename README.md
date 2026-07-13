# QuranRoom — Daily Focus Guard

A Chrome extension that gently locks your browsing each day until you've logged your Quran reading. Your log is saved to **your own** Google Sheet — nothing is sent to any third-party server, and no account or sign-up is required.

## Features
- Blocks general browsing until you log today's reading (Quran study sites are always allowed)
- Logs page number, session type, daily intention, and a short reflection
- Syncs to a Google Sheet you control
- Optional reading schedule so tomorrow's page is pre-filled automatically

## Install

1. Download the [latest release zip](../../releases) (or clone this repo) and unzip it.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `extension/` folder.
5. The extension opens a guided setup on first install — follow the 4 steps there to connect your own Google Sheet (takes about a minute, no coding knowledge needed).

## How the Google Sheet sync works

This extension talks to a small script you deploy yourself on **Google Apps Script** — Google's free, built-in scripting tool for Sheets. You paste a short block of code into your own sheet, deploy it as a "Web App," and copy the URL it gives you into the extension. The onboarding page in the extension walks through this step by step with copy-paste code — see `AppsScript.gs` in this repo for the source, or `extension/onboarding.html` for the guided version.

**Why Apps Script and not a hosted backend (e.g. Cloudflare Workers)?** Because the destination *is* your Google Sheet — Apps Script runs inside Google's infrastructure with a direct, free, zero-maintenance connection to it. A separate backend would add an account, a deployment step, and ongoing hosting for no real benefit here. If you'd rather not use Google Sheets at all, you can swap `AppsScript.gs` for any HTTP endpoint that accepts the same JSON POST body (see below) and paste that URL instead — the extension doesn't care what's on the other end.

### POST payload sent by the extension
```json
{
  "date": "2026-07-13T08:00:00.000Z",
  "page": 12,
  "mode": "Recitation",
  "intention": "optional string",
  "notes": "optional string"
}
```

## Privacy
- All state lives in your browser's local storage.
- The only network call the extension makes is the POST to the URL *you* configure.
- No analytics, no tracking, no bundled third-party services.

## Building the release zip
```
cd extension
zip -r ../QuranRoom-Extension.zip . -x ".*"
```

## License
MIT — see [LICENSE](LICENSE).
