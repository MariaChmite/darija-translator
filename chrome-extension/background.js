/**
 * background.js — Service Worker for Darija Translator Extension
 *
 * Responsibilities:
 *  1. Register the context menu item ("Translate to Darija")
 *  2. On context menu click → open side panel and pass selected text
 *  3. Route messages between content scripts and the side panel
 *  4. Persist user credentials in chrome.storage.local (encrypted at rest by Chrome)
 */

// ── Constants ──────────────────────────────────────────────────────────────
const API_BASE_URL = 'http://localhost:8080/translator/api/translator';
// Change to your deployed server URL before publishing.

// ── Context Menu Setup ────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'translate-darija',
    title: 'Translate to Darija → "%s"',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'open-panel',
    title: 'Open Darija Translator',
    contexts: ['page', 'frame']
  });
});

// ── Context Menu Click Handler ────────────────────────────────────────────
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'translate-darija' || info.menuItemId === 'open-panel') {
    // Open the side panel for the current tab
    await chrome.sidePanel.open({ tabId: tab.id });

    // Short delay to let the side panel initialise before sending text
    if (info.selectionText) {
      setTimeout(() => {
        chrome.runtime.sendMessage({
          type: 'SELECTED_TEXT',
          text: info.selectionText
        });
      }, 400);
    }
  }
});

// ── Toolbar icon click: open side panel ───────────────────────────────────
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });

  // Also grab selected text from the active tab
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString() || ''
    });
    const selected = results?.[0]?.result;
    if (selected) {
      setTimeout(() => {
        chrome.runtime.sendMessage({ type: 'SELECTED_TEXT', text: selected });
      }, 400);
    }
  } catch (_) { /* Extension pages don't support scripting — safe to ignore */ }
});

// ── Message Relay ─────────────────────────────────────────────────────────
// The side panel sends TRANSLATE requests; background calls the REST API.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRANSLATE') {
    handleTranslation(message.text, message.sourceLang)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(err  => sendResponse({ success: false, error: err.message }));
    return true; // keep channel open for async response
  }
});

// ── API Call ──────────────────────────────────────────────────────────────
async function handleTranslation(text, sourceLang = 'en') {
  const stored = await chrome.storage.local.get(['username', 'password']);
  const { username = 'api_user', password = 'darija2024' } = stored;

  const credentials = btoa(`${username}:${password}`);

  const response = await fetch(`${API_BASE_URL}/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`
    },
    body: JSON.stringify({ text, sourceLanguage: sourceLang })
  });

  if (!response.ok) {
    throw new Error(`API error: HTTP ${response.status}`);
  }

  return response.json();
}
