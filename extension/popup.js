document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const tabs = document.querySelectorAll('.tab');
  const views = document.querySelectorAll('.view');
  const statusBadge = document.getElementById('status-badge');
  
  const pageInput = document.getElementById('page-input');
  const mensesCheck = document.getElementById('menses-check');
  const intentionInput = document.getElementById('intention-input');
  const notesInput = document.getElementById('notes-input');
  const saveBtn = document.getElementById('save-btn');
  
  const urlInput = document.getElementById('url-input');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const clearLogBtn = document.getElementById('clear-log-btn');
  const openOnboardingLink = document.getElementById('open-onboarding-link');
  if (openOnboardingLink) {
    openOnboardingLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
    });
  }

  // Debug: Check if clear button exists
  if (!clearLogBtn) {
    console.error('QuranRoom: Clear log button not found!');
  } else {
    console.log('QuranRoom: Clear log button found and ready');
  }

  // Default state
  const defaultState = {
    currentPage: 1,
    webAppUrl: "",
    lastLoggedDate: null,
    mensesMode: false,
    readingSchedule: [],
    scheduleIndex: 0
  };

  // Load state from storage
  let state = { ...defaultState };
  
  try {
    const data = await chrome.storage.local.get(['quran_room_state_v1']);
    if (data.quran_room_state_v1) {
      state = { ...defaultState, ...data.quran_room_state_v1 };
    }
  } catch (error) {
    console.error('Error loading state:', error);
  }

  // Update UI based on state
  const now = new Date();
  const today = now.toLocaleDateString('en-CA');
  const isLogged = state.lastLoggedDate === today;

  // Show current date so user can verify which date the extension is using
  const dateDisplay = document.getElementById('date-display');
  if (dateDisplay) {
    dateDisplay.textContent = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  if (isLogged) {
    statusBadge.textContent = "Logged";
    statusBadge.className = "badge badge-logged";
    saveBtn.textContent = "Update Log";
  } else {
    statusBadge.textContent = "Pending";
    statusBadge.className = "badge badge-pending";
  }

  // Determine page to show: schedule takes priority over currentPage
  const schedule = state.readingSchedule || [];
  const schedIdx = state.scheduleIndex || 0;
  const scheduledPage = schedule.length > 0 ? schedule[Math.min(schedIdx, schedule.length - 1)] : null;
  pageInput.value = scheduledPage || state.currentPage || 1;

  mensesCheck.checked = !!state.mensesMode;
  urlInput.value = state.webAppUrl || "";

  // Populate schedule textarea
  const scheduleInput = document.getElementById('schedule-input');
  const scheduleStatus = document.getElementById('schedule-status');
  if (scheduleInput && schedule.length > 0) {
    scheduleInput.value = schedule.join(', ');
    const remaining = schedule.length - schedIdx;
    if (scheduleStatus) scheduleStatus.textContent = `${remaining} page(s) remaining (index ${schedIdx + 1}/${schedule.length})`;
  }

  // Update al-Tadabbur link to use current page input value
  const tadabburLink = document.getElementById('tadabbur-link');
  const updateTadabburLink = () => {
    const p = parseInt(pageInput.value);
    if (tadabburLink && p >= 1 && p <= 604) {
      tadabburLink.href = `https://altadabbur.com/en/quran?page=${p}`;
    }
  };
  updateTadabburLink();
  pageInput.addEventListener('input', updateTadabburLink);

  // Tab Navigation
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      views.forEach(v => v.classList.remove('active'));
      
      tab.classList.add('active');
      const targetView = document.getElementById(tab.dataset.target);
      if (targetView) {
        targetView.classList.add('active');
      }
    });
  });

  // Save Settings
  saveSettingsBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    
    if (!url) {
      alert('Please enter a valid URL');
      return;
    }
    
    saveSettingsBtn.disabled = true;
    saveSettingsBtn.textContent = "Saving...";
    
    try {
      state.webAppUrl = url;
      await chrome.storage.local.set({ 
        quran_room_state_v1: state 
      });
      
      chrome.runtime.sendMessage({ action: "refreshAllTabs" }).catch(() => {});

      saveSettingsBtn.textContent = "✓ Saved!";
      
      setTimeout(() => {
        saveSettingsBtn.textContent = "Save Configuration";
        saveSettingsBtn.disabled = false;
      }, 2000);
      
    } catch (error) {
      console.error('Error saving settings:', error);
      saveSettingsBtn.textContent = "Error - Try Again";
      saveSettingsBtn.disabled = false;
    }
  });

  // Save Reading Schedule
  const saveScheduleBtn = document.getElementById('save-schedule-btn');
  saveScheduleBtn.addEventListener('click', async () => {
    const raw = scheduleInput.value.trim();
    const pages = raw.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 604);
    if (pages.length === 0) {
      alert('No valid page numbers found. Enter numbers 1-604 separated by commas.');
      return;
    }
    saveScheduleBtn.disabled = true;
    saveScheduleBtn.textContent = "Saving...";
    state.readingSchedule = pages;
    state.scheduleIndex = 0;
    await chrome.storage.local.set({ quran_room_state_v1: state });
    pageInput.value = pages[0];
    updateTadabburLink();
    if (scheduleStatus) scheduleStatus.textContent = `${pages.length} page(s) saved. Starting from page ${pages[0]}.`;
    saveScheduleBtn.textContent = "✓ Schedule Saved!";
    setTimeout(() => {
      saveScheduleBtn.textContent = "Save Schedule";
      saveScheduleBtn.disabled = false;
    }, 2000);
  });

  // Clear Reading Schedule
  const clearScheduleBtn = document.getElementById('clear-schedule-btn');
  clearScheduleBtn.addEventListener('click', async () => {
    if (!confirm('Clear the reading schedule? Pages will revert to full Quran (1–604), continuing from where you left off.')) return;
    state.readingSchedule = [];
    state.scheduleIndex = 0;
    await chrome.storage.local.set({ quran_room_state_v1: state });
    scheduleInput.value = '';
    // Reset page input to currentPage (yesterday's page + 1)
    pageInput.value = state.currentPage || 1;
    updateTadabburLink();
    if (scheduleStatus) scheduleStatus.textContent = 'Schedule cleared. Now reading full Quran from page ' + (state.currentPage || 1) + '.';
  });

  // Clear Today's Log
  clearLogBtn.addEventListener('click', async () => {
    console.log('QuranRoom: Clear log button clicked');
    
    const confirmed = confirm(
      "Clear today's log?\n\n" +
      "This will:\n" +
      "• Remove today's logged date\n" +
      "• BLOCK all browsing until you log again\n" +
      "• Show full-screen reminder on all pages\n\n" +
      "You'll need to fill out the Quick Log form to unlock browsing.\n\n" +
      "Continue?"
    );
    
    console.log('QuranRoom: User confirmed:', confirmed);
    
    if (!confirmed) return;
    
    clearLogBtn.disabled = true;
    clearLogBtn.textContent = "Clearing...";
    
    try {
      // Clear today's log but keep other settings
      state.lastLoggedDate = null;
      
      await chrome.storage.local.set({ 
        quran_room_state_v1: state 
      });
      
      // Update UI
      statusBadge.textContent = "Pending";
      statusBadge.className = "badge badge-pending";
      saveBtn.textContent = "Sync & Unlock Browsing";
      
      // Notify background to refresh all tabs
      chrome.runtime.sendMessage({ action: "refreshAllTabs" }, (response) => {
        console.log('Refresh message sent to background');
      });
      
      // Force reload all tabs
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
            chrome.tabs.reload(tab.id).catch(() => {
              // Silent error handling for tabs that can't be reloaded
            });
          }
        });
      });
      
      clearLogBtn.textContent = "✓ Cleared! Browsing Locked";
      
      setTimeout(() => {
        clearLogBtn.textContent = "Clear Today's Log";
        clearLogBtn.disabled = false;
        // Close popup so user sees the reminder overlay
        window.close();
      }, 1500);
      
    } catch (error) {
      console.error('Error clearing log:', error);
      alert('Error clearing log: ' + error.message);
      clearLogBtn.textContent = "Error - Try Again";
      clearLogBtn.disabled = false;
    }
  });

  // Save Daily Log
  saveBtn.addEventListener('click', async () => {
    const pageVal = parseInt(pageInput.value);
    
    if (!pageVal || pageVal < 1 || pageVal > 604) {
      alert('Please enter a valid page number (1-604)');
      return;
    }
    
    const mensesVal = mensesCheck.checked;
    const intentionVal = intentionInput.value.trim();
    const notesVal = notesInput.value.trim();

    saveBtn.disabled = true;
    saveBtn.textContent = "Syncing...";

    const logDate = new Date();
    const payload = {
      date: logDate.toISOString(),
      page: pageVal,
      mode: mensesVal ? "Tafsir/Menses" : "Recitation"
    };
    if (intentionVal) payload.intention = intentionVal;
    if (notesVal) payload.notes = notesVal;

    console.log('Attempting to sync to Google Sheets...', payload);

    // Try to sync with Google Sheets
    let syncSuccess = false;
    if (state.webAppUrl) {
      try {
        console.log('Sending to URL:', state.webAppUrl);
        
        const response = await fetch(state.webAppUrl, {
          method: "POST",
          headers: { 
            "Content-Type": "text/plain"
          },
          body: JSON.stringify(payload),
          redirect: 'follow'
        });
        
        console.log('Response status:', response.status);
        console.log('Response type:', response.type);
        
        // For Google Apps Script, we need to read the response
        const responseText = await response.text();
        console.log('Response text:', responseText);
        
        if (response.ok) {
          syncSuccess = true;
          console.log('✅ Successfully synced to Google Sheets');
        } else {
          console.warn('❌ Sync failed with status:', response.status);
        }
        
      } catch (err) {
        console.error("❌ Sheet sync error:", err);
        console.error("Error details:", err.message);
      }
    } else {
      console.warn('No webAppUrl configured');
    }

    // Update local state
    try {
      state.lastLoggedDate = today;
      state.mensesMode = mensesVal;
      // Advance schedule index if using a schedule, otherwise increment currentPage
      if (state.readingSchedule && state.readingSchedule.length > 0) {
        const nextIdx = (state.scheduleIndex || 0) + 1;
        state.scheduleIndex = nextIdx < state.readingSchedule.length ? nextIdx : state.readingSchedule.length - 1;
      } else {
        state.currentPage = pageVal >= 604 ? 1 : pageVal + 1;
      }
      
      await chrome.storage.local.set({ 
        quran_room_state_v1: state 
      });

      console.log('✅ Local state saved');

      // Update UI
      statusBadge.textContent = "Logged";
      statusBadge.className = "badge badge-logged";
      
      if (syncSuccess) {
        saveBtn.textContent = "✓ Synced to Sheet!";
      } else {
        saveBtn.textContent = "✓ Saved Locally";
      }

      // Reload all non-extension tabs so blocked overlays (whose content script context
      // may be stale) are guaranteed to clear — content script re-runs and sees loggedToday=true
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id && tab.url &&
              !tab.url.startsWith('chrome://') &&
              !tab.url.startsWith('chrome-extension://')) {
            chrome.tabs.reload(tab.id).catch(() => {});
          }
        });
      });

      // Close popup after brief delay
      setTimeout(() => {
        window.close();
      }, 1500);
      
    } catch (error) {
      console.error('Error saving log:', error);
      saveBtn.textContent = "Error - Try Again";
      saveBtn.disabled = false;
    }
  });
});
