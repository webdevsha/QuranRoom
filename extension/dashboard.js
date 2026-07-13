// Dashboard logic for index.html
async function updateDashboard() {
  try {
    const data = await chrome.storage.local.get(['quran_room_state_v1']);
    const state = data.quran_room_state_v1 || {};
    
    const today = new Date().toISOString().split('T')[0];
    const isLogged = state.lastLoggedDate === today;
    const hasUrl = !!state.webAppUrl;
    
    const titleEl = document.getElementById('title');
    const descEl = document.getElementById('description');
    const iconEl = document.getElementById('icon');
    const btnEl = document.getElementById('primary-btn');
    const quranLink = document.getElementById('quran-link');
    const statusEl = document.getElementById('status-message');
    const footerEl = document.getElementById('footer-note');
    
    // Update Quran link with current page
    if (quranLink && state.currentPage) {
      quranLink.href = `https://altadabbur.com/en/quran?page=${state.currentPage}&verse=1`;
    }
    
    // Check for hash navigation
    const hash = window.location.hash;

    if (hash === '#setup' || !hasUrl) {
      // Setup mode
      titleEl.textContent = "Setup Required";
      descEl.innerHTML = "Connect your own Google Sheet to start tracking.<br><br>Follow the guided setup — it only takes a minute.";
      iconEl.textContent = "⚙️";
      btnEl.textContent = "Start Guided Setup";
      btnEl.style.display = "";
      btnEl.onclick = () => { window.location.href = 'onboarding.html'; };
      footerEl.textContent = "Configuration Pending";
      statusEl.classList.remove('hidden');
      statusEl.innerHTML = "💡 <strong>First time?</strong> Set up your Google Sheet integration to start tracking.";

    } else if (!isLogged) {
      // Log pending mode
      titleEl.textContent = "Daily Anchor Pending";
      descEl.textContent = "Log your Quran reading to unlock browsing for today.";
      iconEl.textContent = "🔒";
      btnEl.textContent = "Open Extension to Log";
      
      // Add click handler for pending state
      btnEl.onclick = () => {
        statusEl.classList.remove('hidden');
        statusEl.innerHTML = "👆 <strong>Look up!</strong> Click the extension icon (🧩) in your browser toolbar to log your reading.";
      };
      footerEl.textContent = "Waiting for Today's Log";
      
    } else {
      // Logged mode
      titleEl.textContent = "Focus Mode Active";
      descEl.textContent = "Your daily anchor has been logged. The web is now aligned with your intentions.";
      iconEl.textContent = "🌿";
      btnEl.textContent = "Return to Work";
      
      // Add click handler for logged state
      btnEl.onclick = () => window.close();
      
      footerEl.textContent = "Synced with Your Private Log";
      statusEl.classList.add('hidden');
    }
    
  } catch (error) {
    console.error('Dashboard update error:', error);
  }
}

// Initialize dashboard
if (typeof chrome !== 'undefined' && chrome.storage) {
  updateDashboard();
  
  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.quran_room_state_v1) {
      updateDashboard();
    }
  });
}
