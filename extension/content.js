// Content script - runs on all pages
(function() {
  'use strict';
  
  let reminderElement = null;
  
  // List of allowed domains that should NOT be blocked
  const allowedDomains = [
    'altadabbur.com',
    'quran.com',
    'tanzil.net',
    'qwant.com',
    'corpus.quran.com'
  ];
  
  function isAllowedSite() {
    const currentDomain = window.location.hostname;
    return allowedDomains.some(domain => currentDomain.includes(domain));
  }
  
  async function checkAndShowReminder() {
    try {
      // Don't block Quran reading sites
      if (isAllowedSite()) {
        console.log('QuranRoom: Allowing Quran site -', window.location.hostname);
        return;
      }
      
      const data = await chrome.storage.local.get(['quran_room_state_v1']);
      const state = data.quran_room_state_v1 || {};
      
      const today = new Date().toLocaleDateString('en-CA');
      const hasUrl = !!state.webAppUrl;
      const loggedToday = state.lastLoggedDate === today;
      
      // Remove existing reminder if present
      if (reminderElement) {
        reminderElement.remove();
        reminderElement = null;
      }
      
      // Show reminder if not logged or URL not set
      if (!hasUrl || !loggedToday) {
        showReminder(hasUrl, loggedToday);
        startPolling();
      } else {
        // Restore normal scrolling
        document.body.style.overflow = '';
      }
    } catch (error) {
      console.error('QuranRoom check error:', error);
    }
  }
  
  function showReminder(hasUrl, loggedToday) {
    // Create reminder overlay
    reminderElement = document.createElement('div');
    reminderElement.id = 'quranroom-reminder';
    reminderElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: #FAF8F4;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      padding: 24px;
      box-sizing: border-box;
    `;
    
    // Build content based on state
    let title, description, actionText, warning;
    
    if (!hasUrl) {
      warning = '⚠️ Setup Required';
      title = 'Connect Your Google Sheet';
      description = 'Please complete the quick setup to connect your own Google Sheet and start tracking your daily Quran reading.';
      actionText = 'Finish Setup';
    } else if (!loggedToday) {
      warning = '';
      title = 'Daily Anchor Pending';
      description = 'Log your Quran reading coordinates to unlock browsing for today.';
      actionText = 'Open QuranRoom';
    }

    const actionUrl = chrome.runtime.getURL(hasUrl ? 'index.html' : 'onboarding.html');
    
    reminderElement.innerHTML = `
      <div style="
        max-width: 480px;
        background: #F4F0E6;
        border: 1px solid #D8CFC1;
        padding: 48px 40px;
        border-radius: 24px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.08);
        text-align: center;
      ">
        ${warning ? `<div style="
          color: #A84E4E;
          font-weight: 700;
          margin-bottom: 16px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        ">${warning}</div>` : ''}
        
        <div style="font-size: 48px; margin-bottom: 20px;">🕌</div>
        
        <h1 style="
          font-size: 24px;
          font-weight: 700;
          color: #4D5E4F;
          margin: 0 0 12px 0;
        ">${title}</h1>
        
        <p style="
          font-size: 14px;
          color: #8A8073;
          line-height: 1.6;
          margin: 0 0 32px 0;
        ">${description}</p>
        
        <a href="${actionUrl}" id="quranroom-action-btn" style="
          display: inline-block;
          background: #4D5E4F;
          color: #FAF8F4;
          padding: 14px 32px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          text-decoration: none;
          transition: all 0.2s ease;
          cursor: pointer;
        ">
          ${actionText}
        </a>
        
        <p style="
          margin-top: 24px;
          font-size: 11px;
          color: #B0A99A;
          font-weight: 500;
        ">Click the extension icon 🧩 for quick access</p>
      </div>
    `;
    
    document.body.appendChild(reminderElement);
    document.body.style.overflow = 'hidden';
    
    // Add event listener properly (no inline handlers)
    const actionBtn = document.getElementById('quranroom-action-btn');
    if (actionBtn) {
      actionBtn.addEventListener('mouseenter', function() {
        this.style.background = '#292825';
      });
      actionBtn.addEventListener('mouseleave', function() {
        this.style.background = '#4D5E4F';
      });
    }
  }
  
  // Poll storage while overlay is active — guards against broken MV3 message channels
  let pollInterval = null;

  function startPolling() {
    if (pollInterval) return;
    pollInterval = setInterval(async () => {
      // Stop polling once the overlay is gone
      if (!reminderElement) {
        clearInterval(pollInterval);
        pollInterval = null;
        return;
      }
      const data = await chrome.storage.local.get(['quran_room_state_v1']);
      const state = data.quran_room_state_v1 || {};
      const today = new Date().toLocaleDateString('en-CA');
      if (state.lastLoggedDate === today && state.webAppUrl) {
        clearInterval(pollInterval);
        pollInterval = null;
        checkAndShowReminder();
      }
    }, 2000);
  }

  // Listen for recheck messages from background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "recheck") {
      checkAndShowReminder();
      sendResponse({ status: "rechecked" });
    }
    return false;
  });

  // Listen for storage changes (when log is cleared)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.quran_room_state_v1) {
      console.log('QuranRoom: Storage changed, rechecking...');
      checkAndShowReminder();
    }
  });

  // Initial check — start polling if page is blocked
  async function initialCheck() {
    await checkAndShowReminder();
    if (reminderElement) startPolling();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialCheck);
  } else {
    initialCheck();
  }
})();
