// popup.js — Tab Mute Controller UI

const $ = id => document.getElementById(id);

const mainPanel    = $('mainPanel');
const settingsPanel= $('settingsPanel');
const tabList      = $('tabList');
const emptyState   = $('emptyState');
const muteAllBtn   = $('muteAllBtn');
const settingsBtn  = $('settingsBtn');
const backBtn      = $('backBtn');
const domainsInput = $('domainsInput');
const saveRulesBtn = $('saveRulesBtn');
const saveStatus   = $('saveStatus');

// ── Helpers ──────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return ''; }
}

function getFaviconUrl(tab) {
  if (tab.favIconUrl && !tab.favIconUrl.startsWith('chrome://')) {
    return tab.favIconUrl;
  }
  return null;
}

function isPlaying(tab) {
  return tab.audible && !tab.mutedInfo?.muted;
}

// ── Play / Pause ──────────────────────────────────────────
// Injects into the tab's page to pause or resume all media elements.

async function togglePlayPause(tabId, pause) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: (shouldPause) => {
        document.querySelectorAll('video, audio').forEach(el => {
          try {
            if (shouldPause) {
              el.pause();
            } else {
              el.play().catch(() => {}); // ignore autoplay-policy rejections
            }
          } catch (_) {}
        });
      },
      args: [pause],
    });
  } catch (e) {
    // Tab is not scriptable (chrome:// pages, extensions, PDFs, etc.)
  }
}

// ── Render ───────────────────────────────────────────────

function buildFavicon(tab) {
  const url = getFaviconUrl(tab);
  const wrap = document.createElement('div');
  wrap.className = 'favicon-wrap';

  if (url) {
    const img = document.createElement('img');
    img.className = 'favicon-img';
    img.src = url;
    img.alt = '';
    img.addEventListener('error', () => {
      wrap.innerHTML = '<div class="favicon-fallback">🌐</div>';
    });
    wrap.appendChild(img);
  } else {
    wrap.innerHTML = '<div class="favicon-fallback">🌐</div>';
  }
  return wrap;
}

function buildTabItem(tab) {
  const muted  = tab.mutedInfo?.muted ?? false;
  const playing = isPlaying(tab);
  const domain  = getDomain(tab.url || '');

  const item = document.createElement('div');
  item.className = 'tab-item' + (muted ? ' is-muted' : '');
  item.title = 'Click to switch to this tab';

  // Favicon
  item.appendChild(buildFavicon(tab));

  // Text info
  const info = document.createElement('div');
  info.className = 'tab-info';
  info.innerHTML = `
    <div class="tab-title">${escapeHtml(tab.title || 'Untitled')}</div>
    <div class="tab-domain">${escapeHtml(domain)}</div>
  `;
  item.appendChild(info);

  // Controls: animated bars + mute button
  const controls = document.createElement('div');
  controls.className = 'tab-controls';

  if (playing) {
    controls.innerHTML = `
      <div class="audio-bars" title="Playing audio">
        <div class="audio-bar"></div>
        <div class="audio-bar"></div>
        <div class="audio-bar"></div>
      </div>
    `;
  }

  // Play / Pause button — visible for any tab with media (audible or muted-but-running)
  const playPauseBtn = document.createElement('button');
  playPauseBtn.className = 'btn-play-pause';

  if (tab.audible) {
    // Media is producing audio (may be muted by Chrome) → offer Pause
    playPauseBtn.title = 'Pause media in this tab';
    playPauseBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6"  y="4" width="4" height="16" rx="1"/>
        <rect x="14" y="4" width="4" height="16" rx="1"/>
      </svg>`;
    playPauseBtn.addEventListener('click', async e => {
      e.stopPropagation();
      await togglePlayPause(tab.id, true);
      scheduleRender();
    });
  } else {
    // Media is paused / silent → offer Play
    playPauseBtn.title = 'Play media in this tab';
    playPauseBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5,3 19,12 5,21"/>
      </svg>`;
    playPauseBtn.addEventListener('click', async e => {
      e.stopPropagation();
      await togglePlayPause(tab.id, false);
      scheduleRender();
    });
  }

  controls.appendChild(playPauseBtn);

  const muteBtn = document.createElement('button');
  muteBtn.className = 'btn-mute';
  muteBtn.title = muted ? 'Unmute this tab' : 'Mute this tab';
  muteBtn.innerHTML = muted
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
         <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
         <line x1="23" y1="9" x2="17" y2="15"/>
         <line x1="17" y1="9" x2="23" y2="15"/>
       </svg>`
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
         <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
         <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
         <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
       </svg>`;

  muteBtn.addEventListener('click', async e => {
    e.stopPropagation();
    await chrome.tabs.update(tab.id, { muted: !muted });
    scheduleRender();
  });

  controls.appendChild(muteBtn);
  item.appendChild(controls);

  // Click row: switch to tab
  item.addEventListener('click', () => {
    chrome.tabs.update(tab.id, { active: true });
    chrome.windows.update(tab.windowId, { focused: true });
    window.close();
  });

  return item;
}

function renderSectionLabel(text) {
  const el = document.createElement('div');
  el.className = 'section-label';
  el.textContent = text;
  return el;
}

// ── Core Render ──────────────────────────────────────────

let renderTimeout = null;

function scheduleRender() {
  clearTimeout(renderTimeout);
  renderTimeout = setTimeout(renderTabs, 80);
}

async function renderTabs() {
  const [audibleTabs, mutedTabs] = await Promise.all([
    chrome.tabs.query({ audible: true }),
    chrome.tabs.query({ muted: true }),
  ]);

  // Merge and deduplicate: audible first, then muted-only
  const seen = new Set();
  const playing = [];
  const mutedOnly = [];

  for (const tab of audibleTabs) {
    if (seen.has(tab.id)) continue;
    seen.add(tab.id);
    if (isPlaying(tab)) playing.push(tab);
    else mutedOnly.push(tab); // audible but already muted (edge case)
  }

  for (const tab of mutedTabs) {
    if (seen.has(tab.id)) continue;
    seen.add(tab.id);
    mutedOnly.push(tab);
  }

  const allTabs = [...playing, ...mutedOnly];

  // Empty state
  tabList.innerHTML = '';
  if (allTabs.length === 0) {
    emptyState.classList.remove('hidden');
    muteAllBtn.disabled = true;
    muteAllBtn.textContent = 'Mute All';
    muteAllBtn.className = 'btn-primary';
    return;
  }

  emptyState.classList.add('hidden');
  muteAllBtn.disabled = false;

  // Mute All button state
  if (playing.length > 0) {
    muteAllBtn.textContent = 'Mute All';
    muteAllBtn.className = 'btn-primary';
  } else {
    muteAllBtn.textContent = 'Unmute All';
    muteAllBtn.className = 'btn-primary is-unmute';
  }

  // Render Playing section
  if (playing.length > 0) {
    tabList.appendChild(renderSectionLabel(`Playing  ·  ${playing.length}`));
    playing.forEach(tab => tabList.appendChild(buildTabItem(tab)));
  }

  // Render Muted section
  if (mutedOnly.length > 0) {
    tabList.appendChild(renderSectionLabel(`Muted  ·  ${mutedOnly.length}`));
    mutedOnly.forEach(tab => tabList.appendChild(buildTabItem(tab)));
  }
}

// ── Mute All / Unmute All ─────────────────────────────────

muteAllBtn.addEventListener('click', async () => {
  const [audibleTabs, mutedTabs] = await Promise.all([
    chrome.tabs.query({ audible: true }),
    chrome.tabs.query({ muted: true }),
  ]);

  const playing = audibleTabs.filter(t => !t.mutedInfo?.muted);

  if (playing.length > 0) {
    await Promise.all(playing.map(t => chrome.tabs.update(t.id, { muted: true })));
  } else {
    await Promise.all(mutedTabs.map(t => chrome.tabs.update(t.id, { muted: false })));
  }

  scheduleRender();
});

// ── Settings Panel ────────────────────────────────────────

settingsBtn.addEventListener('click', async () => {
  const { autoMuteDomains = [] } = await chrome.storage.sync.get('autoMuteDomains');
  domainsInput.value = autoMuteDomains.join('\n');
  mainPanel.classList.add('hidden');
  settingsPanel.classList.remove('hidden');
});

backBtn.addEventListener('click', () => {
  settingsPanel.classList.add('hidden');
  mainPanel.classList.remove('hidden');
});

saveRulesBtn.addEventListener('click', async () => {
  const domains = domainsInput.value
    .split('\n')
    .map(d => d.trim().toLowerCase().replace(/^www\./, ''))
    .filter(Boolean);

  await chrome.storage.sync.set({ autoMuteDomains: domains });

  saveStatus.textContent = domains.length
    ? `Saved ${domains.length} rule${domains.length !== 1 ? 's' : ''}`
    : 'Rules cleared';
  setTimeout(() => { saveStatus.textContent = ''; }, 2500);
});

// ── Live Updates ──────────────────────────────────────────

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if ('audible' in changeInfo || 'mutedInfo' in changeInfo) {
    scheduleRender();
  }
});

chrome.tabs.onRemoved.addListener(scheduleRender);

// ── Init ──────────────────────────────────────────────────

renderTabs();
