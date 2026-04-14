/**
 * App.js — Darija Translator React Native Mobile App
 *
 * Features:
 *  - Text input → REST API → Darija translation
 *  - Language picker (EN, FR, AR)
 *  - Copy to clipboard
 *  - Text-to-Speech (expo-speech)
 *  - Translation history (AsyncStorage)
 *  - Pull-to-refresh on history screen
 *
 * Setup:
 *   npx create-expo-app DarijaTranslator --template blank
 *   cd DarijaTranslator
 *   npx expo install expo-speech expo-clipboard @react-native-async-storage/async-storage
 *   Copy this file as App.js
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Clipboard, Alert,
  StatusBar, SafeAreaView, FlatList, RefreshControl,
} from 'react-native';

// ── Conditionally import Expo modules (graceful fallback for bare RN) ──────
let Speech = null, ExpoClipboard = null, AsyncStorage = null;
try { Speech = require('expo-speech'); } catch (_) {}
try { ExpoClipboard = require('expo-clipboard'); } catch (_) {}
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch (_) {}

// ── Configuration ──────────────────────────────────────────────────────────
const API_BASE   = 'http://10.0.2.2:8080/translator/api/translator'; // 10.0.2.2 = localhost on Android emulator
const API_USER   = 'api_user';
const API_PASS   = 'darija2024';

const LANGUAGES  = [
  { code: 'en', label: '🇬🇧 English' },
  { code: 'fr', label: '🇫🇷 French' },
  { code: 'ar', label: '🇸🇦 Arabic' },
];

// ── Colors ─────────────────────────────────────────────────────────────────
const C = {
  primary:  '#2d6a4f',
  plight:   '#40916c',
  accent:   '#d4a017',
  bg:       '#f8f7f4',
  card:     '#ffffff',
  border:   '#e5e7eb',
  text:     '#1a1a1a',
  muted:    '#6b7280',
  danger:   '#dc2626',
  success:  '#16a34a',
};

// ── Main App Component ─────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]             = useState('translate');
  const [sourceText, setSource]   = useState('');
  const [sourceLang, setLang]     = useState('en');
  const [translation, setTrans]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [history, setHistory]     = useState([]);
  const [isSpeaking, setSpeaking] = useState(false);
  const [refreshing, setRefresh]  = useState(false);

  // Load history on mount
  useEffect(() => { loadHistory(); }, []);

  async function loadHistory() {
    if (!AsyncStorage) return;
    try {
      const raw = await AsyncStorage.getItem('darija_history');
      if (raw) setHistory(JSON.parse(raw));
    } catch (_) {}
  }

  async function saveHistory(src, tgt) {
    const entry = { id: Date.now(), source: src, target: tgt, date: new Date().toISOString() };
    const updated = [entry, ...history].slice(0, 50);
    setHistory(updated);
    if (AsyncStorage) {
      await AsyncStorage.setItem('darija_history', JSON.stringify(updated));
    }
  }

  // ── Translation API call ─────────────────────────────────────────────────
  const translate = useCallback(async () => {
    if (!sourceText.trim()) return;
    setLoading(true); setError(''); setTrans('');
    try {
      const creds = btoa(`${API_USER}:${API_PASS}`);
      const res = await fetch(`${API_BASE}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${creds}`,
        },
        body: JSON.stringify({ text: sourceText.trim(), sourceLanguage: sourceLang }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.errorMessage || `HTTP ${res.status}`);
      setTrans(data.translatedText);
      await saveHistory(sourceText.trim(), data.translatedText);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [sourceText, sourceLang, history]);

  // ── Copy ─────────────────────────────────────────────────────────────────
  const copyTranslation = () => {
    if (!translation) return;
    if (ExpoClipboard) { ExpoClipboard.setStringAsync(translation); }
    else { Clipboard.setString(translation); }
    Alert.alert('Copied!', 'Translation copied to clipboard.');
  };

  // ── Text-to-Speech ────────────────────────────────────────────────────────
  const speakTranslation = () => {
    if (!translation) return;
    if (!Speech) { Alert.alert('TTS not available'); return; }
    if (isSpeaking) { Speech.stop(); setSpeaking(false); return; }
    setSpeaking(true);
    Speech.speak(translation, {
      language: 'ar-MA',
      rate: 0.85,
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar backgroundColor={C.primary} barStyle="light-content" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>🇲🇦 Darija Translator</Text>
        <Text style={s.headerSub}>Translate to Moroccan Arabic Dialect</Text>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {['translate', 'history'].map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab===t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabLabel, tab===t && s.tabLabelActive]}>
              {t === 'translate' ? '🔤 Translate' : '📋 History'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Translate Panel */}
      {tab === 'translate' && (
        <ScrollView style={s.content} keyboardShouldPersistTaps="handled">
          {/* Language Selector */}
          <View style={s.langRow}>
            {LANGUAGES.map(l => (
              <TouchableOpacity key={l.code} style={[s.langBtn, sourceLang===l.code && s.langBtnActive]}
                onPress={() => setLang(l.code)}>
                <Text style={[s.langBtnText, sourceLang===l.code && s.langBtnTextActive]}>{l.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Source Input */}
          <View style={s.card}>
            <TextInput
              style={s.input}
              value={sourceText}
              onChangeText={setSource}
              placeholder="Type or paste text here…"
              placeholderTextColor={C.muted}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={s.charCount}>{sourceText.length}/500</Text>
          </View>

          {/* Translate Button */}
          <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={translate} disabled={loading}>
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={s.btnText}>Translate →</Text>
            }
          </TouchableOpacity>

          {/* Error */}
          {!!error && <View style={s.errorBox}><Text style={s.errorText}>❌ {error}</Text></View>}

          {/* Result */}
          {!!translation && (
            <View style={s.card}>
              <View style={s.resultHeader}>
                <Text style={s.resultLabel}>🇲🇦 Moroccan Darija</Text>
                <View style={s.resultActions}>
                  <TouchableOpacity style={s.iconBtn} onPress={copyTranslation}>
                    <Text style={s.iconBtnText}>📋</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.iconBtn, isSpeaking && s.iconBtnActive]} onPress={speakTranslation}>
                    <Text style={s.iconBtnText}>{isSpeaking ? '🔇' : '🔊'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={s.resultText}>{translation}</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* History Panel */}
      {tab === 'history' && (
        <FlatList
          data={history}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={s.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefresh(true); await loadHistory(); setRefresh(false);
          }} />}
          ListEmptyComponent={
            <Text style={s.historyEmpty}>No translations yet</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={s.historyItem} onPress={() => {
              setSource(item.source); setTrans(item.target); setTab('translate');
            }}>
              <Text style={s.historySource} numberOfLines={2}>{item.source}</Text>
              <Text style={s.historyTarget} numberOfLines={2}>{item.target}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: C.primary },
  header:             { backgroundColor: C.primary, padding: 16, paddingBottom: 12 },
  headerTitle:        { color: 'white', fontSize: 18, fontWeight: '700' },
  headerSub:          { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  tabs:               { flexDirection: 'row', backgroundColor: 'white', borderBottomWidth: 1, borderColor: C.border },
  tab:                { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:          { borderBottomColor: C.primary },
  tabLabel:           { fontSize: 13, color: C.muted },
  tabLabelActive:     { color: C.primary, fontWeight: '600' },
  content:            { flex: 1, backgroundColor: C.bg, padding: 12 },
  langRow:            { flexDirection: 'row', gap: 6, marginBottom: 10 },
  langBtn:            { flex: 1, paddingVertical: 7, paddingHorizontal: 4, borderRadius: 8,
                        backgroundColor: 'white', borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  langBtnActive:      { backgroundColor: C.primary, borderColor: C.primary },
  langBtnText:        { fontSize: 11, color: C.muted },
  langBtnTextActive:  { color: 'white', fontWeight: '600' },
  card:               { backgroundColor: C.card, borderRadius: 10, borderWidth: 1,
                        borderColor: C.border, marginBottom: 10, overflow: 'hidden' },
  input:              { padding: 12, fontSize: 14, color: C.text, minHeight: 100 },
  charCount:          { fontSize: 11, color: C.muted, textAlign: 'right', padding: '4px 10px' },
  btn:                { backgroundColor: C.primary, borderRadius: 10, padding: 14,
                        alignItems: 'center', marginBottom: 10 },
  btnDisabled:        { opacity: 0.6 },
  btnText:            { color: 'white', fontSize: 15, fontWeight: '600' },
  errorBox:           { backgroundColor: '#fef2f2', borderRadius: 8, padding: 12, marginBottom: 10 },
  errorText:          { color: C.danger, fontSize: 13 },
  resultHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        backgroundColor: '#f0fdf4', padding: '8px 12px',
                        borderBottomWidth: 1, borderColor: '#d1fae5' },
  resultLabel:        { fontSize: 11, fontWeight: '600', color: C.primary },
  resultActions:      { flexDirection: 'row', gap: 4 },
  iconBtn:            { padding: '4px 6px', borderRadius: 6 },
  iconBtnActive:      { backgroundColor: '#fef2f2' },
  iconBtnText:        { fontSize: 16 },
  resultText:         { padding: 14, fontSize: 16, color: C.text, textAlign: 'right',
                        writingDirection: 'rtl', lineHeight: 26 },
  historyItem:        { backgroundColor: C.card, borderRadius: 10, borderWidth: 1,
                        borderColor: C.border, padding: 12, marginBottom: 8 },
  historySource:      { fontSize: 12, color: C.muted, marginBottom: 4 },
  historyTarget:      { fontSize: 14, color: C.text, textAlign: 'right', writingDirection: 'rtl' },
  historyEmpty:       { textAlign: 'center', color: C.muted, marginTop: 60, fontSize: 14 },
});
