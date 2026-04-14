#!/bin/bash
# ============================================================
# Darija Translator REST API — cURL Test Commands
# ============================================================
# Run these after deploying the service.
# Replace BASE_URL with your actual server address.

BASE_URL="http://localhost:8080/translator/api/translator"
USER="api_user"
PASS="darija2024"

echo "========================================"
echo " Darija Translator API — Test Suite"
echo "========================================"

# ── 1. Health Check (no auth needed) ─────────────────────
echo -e "\n[1] Health Check"
curl -s "$BASE_URL/health" | python3 -m json.tool

# ── 2. POST translate — English to Darija ─────────────────
echo -e "\n[2] POST /translate — English"
curl -s -X POST "$BASE_URL/translate" \
  -u "$USER:$PASS" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, how are you? I am fine, thank you.", "sourceLanguage": "en"}' \
  | python3 -m json.tool

# ── 3. POST translate — French to Darija ──────────────────
echo -e "\n[3] POST /translate — French"
curl -s -X POST "$BASE_URL/translate" \
  -u "$USER:$PASS" \
  -H "Content-Type: application/json" \
  -d '{"text": "Bonjour, comment allez-vous?", "sourceLanguage": "fr"}' \
  | python3 -m json.tool

# ── 4. GET translate — query param ────────────────────────
echo -e "\n[4] GET /translate?text=..."
curl -s -u "$USER:$PASS" \
  "$BASE_URL/translate?text=Good%20morning%20everyone&source=en" \
  | python3 -m json.tool

# ── 5. Empty text — should return 400 ────────────────────
echo -e "\n[5] POST with empty text (expect 400)"
curl -s -X POST "$BASE_URL/translate" \
  -u "$USER:$PASS" \
  -H "Content-Type: application/json" \
  -d '{"text": ""}' \
  | python3 -m json.tool

# ── 6. Wrong credentials — should return 401 ─────────────
echo -e "\n[6] Wrong credentials (expect 401)"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" \
  -X POST "$BASE_URL/translate" \
  -u "wrong:credentials" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello"}'

echo -e "\n✅ Tests complete."
