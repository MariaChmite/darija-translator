/**
 * sidepanel.js — Logic for the Darija Translator side panel.
 *
 * Features:
 *  - Text translation via REST API (through background.js)
 *  - Auto-paste selected text from the page
 *  - Speech recognition (Web Speech API) → translate → TTS read-aloud
 *  - Translation history (chrome.storage.local)
 *  - Settings persistence
 */

'use strict';

// ── State ──────────────────────────────────────────────────────────────────
let translationHistory = [];
let isRecording = false;
let recognition = null;
let lastTranslation = '';

// ── DOM References ─────────────────────────────────────────────────────────
const sourceText    = document.getElementById('source-text');
const sourceLang    = document.getElementById('source-lang');
const translateBtn  = document.getElementById('translate-btn');
const btnLabel      = document.getElementById('btn-label');
const resultText    = document.getElementById('result-text');
const resultLatin   = document.getElementById('result-latin');
const errorMsg      = document.getElementById('error-msg');
const loader        = document.getElementById('loader');
const charCount     = document.getElementById('char-count');
const copyBtn       = document.getElementById('copy-btn');
const speakBtn      = document.getElementById('speak-btn');
const recordBtn     = document.getElementById('record-btn');
const transcript    = document.getElementById('transcript');
const historyList   = document.getElementById('history-list');
const clearHistory  = document.getElementById('clear-history');
const saveSettings  = document.getElementById('save-settings');
const settingsMsg   = document.getElementById('settings-msg');

// ── Tab Navigation ─────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const panelId = `panel-${tab.dataset.panel}`;
    document.getElementById(panelId).classList.add('active');
    if (tab.dataset.panel === 'history') renderHistory();
  });
});

// ── Listen for text from background (context menu / toolbar click) ─────────
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SELECTED_TEXT' && message.text) {
    sourceText.value = message.text.slice(0, 500);
    updateCharCount();
    // Auto-translate if text arrives from context menu
    translate();
  }
});

// ── Character Count ────────────────────────────────────────────────────────
sourceText.addEventListener('input', updateCharCount);
function updateCharCount() {
  const len = sourceText.value.length;
  charCount.textContent = len;
  if (len > 450) charCount.style.color = '#dc2626';
  else charCount.style.color = '';
}

// ── Translate ──────────────────────────────────────────────────────────────
translateBtn.addEventListener('click', translate);
sourceText.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') translate();
});

async function translate() {
  const text = sourceText.value.trim();
  if (!text) return;

  setLoading(true);
  hideError();

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'TRANSLATE',
      text,
      sourceLang: sourceLang.value
    });

    if (!response.success) throw new Error(response.error);

    const { translatedText } = response.data;
    lastTranslation = translatedText;

    // Render result
    resultText.classList.remove('result-empty');
    resultText.textContent = translatedText;

    // Extract Latin transcription if present (text in parentheses)
    const latinMatch = translatedText.match(/\(([^)]+)\)/);
    if (latinMatch) {
      resultLatin.textContent = latinMatch[1];
      resultLatin.style.display = 'block';
    } else {
      resultLatin.style.display = 'none';
    }

    // Save to history
    addToHistory(text, translatedText);

  } catch (err) {
    showError(err.message || 'Translation failed. Check your connection and settings.');
  } finally {
    setLoading(false);
  }
}

// ── Copy to Clipboard ──────────────────────────────────────────────────────
copyBtn.addEventListener('click', async () => {
  if (!lastTranslation) return;
  await navigator.clipboard.writeText(lastTranslation);
  copyBtn.textContent = '✅';
  setTimeout(() => copyBtn.textContent = '📋', 1500);
});

// ── Text-to-Speech (Read Aloud) ────────────────────────────────────────────
speakBtn.addEventListener('click', () => speakDarija(lastTranslation));
document.getElementById('speech-speak-btn')?.addEventListener('click', () => {
  speakDarija(document.getElementById('speech-result-text').textContent);
});

function speakDarija(text) {
  if (!text) return;
  // Use chrome.tts for Darija (ar-MA locale)
  chrome.tts.speak(text, {
    lang: 'ar-MA',
    rate: 0.85,
    pitch: 1.0,
    onEvent: (event) => {
      if (event.type === 'start')   speakBtn.textContent = '🔇';
      if (event.type === 'end')     speakBtn.textContent = '🔊';
      if (event.type === 'error')   speakBtn.textContent = '🔊';
    }
  });
}

// ── Speech Recognition (Voice-to-Voice) ───────────────────────────────────
recordBtn.addEventListener('click', toggleRecording);

function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

function startRecording() {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    showError('Speech recognition is not supported in this browser.');
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = sourceLang.value === 'fr' ? 'fr-FR' : 'en-US';
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => {
    isRecording = true;
    recordBtn.textContent = '⏹ Stop Recording';
    recordBtn.style.background = '#dc2626';
    transcript.textContent = '🎙️ Listening…';
  };

  recognition.onresult = (event) => {
    const text = Array.from(event.results)
      .map(r => r[0].transcript)
      .join('');
    transcript.textContent = text;

    if (event.results[event.results.length - 1].isFinal) {
      translateSpeech(text);
    }
  };

  recognition.onerror = (event) => {
    showError(`Speech recognition error: ${event.error}`);
    stopRecording();
  };

  recognition.onend = () => stopRecording();
  recognition.start();
}

function stopRecording() {
  isRecording = false;
  recordBtn.textContent = '🎙️ Start Speaking';
  recordBtn.style.background = '';
  recognition?.stop();
}

async function translateSpeech(text) {
  transcript.textContent = `Recognised: "${text}"`;
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'TRANSLATE', text, sourceLang: sourceLang.value
    });
    if (!response.success) throw new Error(response.error);

    const { translatedText } = response.data;
    const speechResult = document.getElementById('speech-result');
    const speechResultText = document.getElementById('speech-result-text');
    speechResult.style.display = 'block';
    speechResultText.textContent = translatedText;

    // Auto read-aloud for voice-to-voice experience
    speakDarija(translatedText);
    addToHistory(text, translatedText);
  } catch (err) {
    showError(err.message);
  }
}

// ── History ────────────────────────────────────────────────────────────────
async function loadHistory() {
  const data = await chrome.storage.local.get('history');
  translationHistory = data.history || [];
}

function addToHistory(source, target) {
  translationHistory.unshift({ source, target, date: new Date().toISOString() });
  if (translationHistory.length > 50) translationHistory.pop();
  chrome.storage.local.set({ history: translationHistory });
}

function renderHistory() {
  if (translationHistory.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No translations yet</div>';
    return;
  }
  historyList.innerHTML = translationHistory.map((item, i) => `
    <div class="history-item" data-idx="${i}">
      <div class="history-src">${escapeHtml(item.source.slice(0, 60))}${item.source.length > 60 ? '…' : ''}</div>
      <div class="history-tgt">${escapeHtml(item.target)}</div>
    </div>
  `).join('');

  historyList.querySelectorAll('.history-item').forEach(el => {
    el.addEventListener('click', () => {
      const item = translationHistory[el.dataset.idx];
      sourceText.value = item.source;
      lastTranslation = item.target;
      resultText.textContent = item.target;
      resultText.classList.remove('result-empty');
      updateCharCount();
      // Switch to translate tab
      document.querySelector('[data-panel="translate"]').click();
    });
  });
}

clearHistory.addEventListener('click', () => {
  translationHistory = [];
  chrome.storage.local.set({ history: [] });
  renderHistory();
});

// ── Settings ───────────────────────────────────────────────────────────────
async function loadSettings() {
  const data = await chrome.storage.local.get(['serverUrl', 'username', 'password']);
  if (data.serverUrl) document.getElementById('s-url').value = data.serverUrl;
  if (data.username)  document.getElementById('s-user').value = data.username;
  if (data.password)  document.getElementById('s-pass').value = data.password;
}

saveSettings.addEventListener('click', async () => {
  await chrome.storage.local.set({
    serverUrl: document.getElementById('s-url').value,
    username:  document.getElementById('s-user').value,
    password:  document.getElementById('s-pass').value
  });
  settingsMsg.textContent = '✅ Settings saved!';
  setTimeout(() => settingsMsg.textContent = '', 2000);
});

// ── Utilities ──────────────────────────────────────────────────────────────
function setLoading(on) {
  loader.classList.toggle('show', on);
  translateBtn.disabled = on;
  btnLabel.textContent = on ? 'Translating…' : 'Translate';
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.add('show');
}

function hideError() {
  errorMsg.classList.remove('show');
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])
  );
}

// ── Init ───────────────────────────────────────────────────────────────────
(async () => {
  await Promise.all([loadHistory(), loadSettings()]);
})();
