# 🇲🇦 Darija Translator — Full-Stack Project

LLM-powered REST service that translates text into Moroccan Arabic Dialect (Darija),
with a Chrome extension, PHP client, Python client, and React Native mobile app.

---

## Project Structure

```
darija-translator/
├── java-service/                  ← Jakarta EE REST service (WAR)
│   ├── pom.xml
│   └── src/main/java/ma/translator/
│       ├── TranslatorApplication.java     JAX-RS bootstrap (@ApplicationPath)
│       ├── resource/
│       │   ├── TranslatorResource.java    REST endpoint
│       │   └── CorsFilter.java            CORS for browser clients
│       ├── service/
│       │   └── TranslationService.java    Calls Google Gemini API
│       ├── security/
│       │   ├── SecurityConfig.java        @BasicAuthenticationMechanismDefinition
│       │   └── DarijaIdentityStore.java   In-memory user store
│       └── model/
│           ├── TranslationRequest.java
│           └── TranslationResponse.java
│
├── chrome-extension/              ← Manifest V3 Chrome Extension
│   ├── manifest.json
│   ├── background.js              Service worker: context menu, message routing
│   ├── sidepanel.html             Side panel UI
│   └── sidepanel.js               Logic: translate, TTS, speech, history
│
├── php-client/
│   └── client.php                 CLI + web interface
│
├── python-client/
│   └── client.py                  CLI + interactive REPL
│
├── react-native-client/
│   ├── package.json
│   └── App.js                     Full mobile app (Expo)
│
└── test_api.sh                    cURL test commands
```

---

## 1 — Java REST Service

### Prerequisites
- JDK 17+
- Maven 3.9+
- A free Google Gemini API key → https://ai.google.dev/pricing#1_5flash

### Get a Gemini API Key
1. Go to https://aistudio.google.com/app/apikey
2. Click **Create API key**
3. Copy the key — you'll set it as an environment variable

### Build & Run (Payara Micro — embedded, no server install needed)

```bash
cd java-service
export GEMINI_API_KEY=your_key_here
mvn package payara-micro:start
```

Service starts at: http://localhost:8080/translator/api/translator

### Alternative: WildFly / GlassFish
```bash
mvn package
# Copy target/darija-translator.war to your server's deployments folder
```

### API Endpoints

| Method | Path                       | Auth     | Description              |
|--------|----------------------------|----------|--------------------------|
| GET    | /api/translator/health     | None     | Health check             |
| POST   | /api/translator/translate  | Basic    | Translate (JSON body)    |
| GET    | /api/translator/translate  | Basic    | Translate (query params) |

**POST body:**
```json
{
  "text": "Hello, how are you?",
  "sourceLanguage": "en"
}
```

**Response:**
```json
{
  "translatedText": "أهلاً، كيداير؟ (Ahlan, kidayr?)",
  "errorMessage": null,
  "success": true
}
```

### Default Users (change in production!)

| Username   | Password     | Role       |
|------------|--------------|------------|
| admin      | admin123     | USER,ADMIN |
| api_user   | darija2024   | USER       |
| readonly   | readonly123  | USER       |

Credentials are defined in `DarijaIdentityStore.java`.
**In production:** replace with a database-backed store (JDBC IdentityStore).

### Security — Jakarta Authentication
- `@BasicAuthenticationMechanismDefinition` on `SecurityConfig` activates HTTP Basic Auth
- `@RolesAllowed("USER")` on `TranslatorResource` restricts all endpoints
- `DarijaIdentityStore` validates credentials and returns assigned roles
- `web.xml` adds a servlet-level security constraint as backup

---

## 2 — Chrome Extension

### Installation (Developer Mode)
1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked** → select the `chrome-extension/` folder
4. The 🇲🇦 icon appears in your toolbar

### Usage
- **Right-click** any selected text on a webpage → *Translate to Darija*
- The side panel opens with the translation filled in automatically
- Click the toolbar icon to open the panel manually

### Features
| Feature | Description |
|---------|-------------|
| Auto-paste | Selected text is copied into the input automatically |
| Context menu | Right-click trigger on any selection |
| Side panel | `chrome.sidePanel` API, works alongside any webpage |
| Speech input | Web Speech API for voice recognition |
| Read aloud | `chrome.tts` reads the Darija translation aloud |
| History | Last 50 translations saved in `chrome.storage.local` |
| Settings | Configure server URL and credentials via the ⚙️ tab |

### Configuration
In the extension's **Settings** tab, set:
- **Server URL**: your deployed REST endpoint
- **Username / Password**: your API credentials

Or edit `background.js` directly:
```js
const API_BASE_URL = 'http://localhost:8080/translator/api/translator';
```

---

## 3 — PHP Client

### Requirements
- PHP 7.4+ with `curl` extension enabled
- Server running the Java REST service

### CLI Usage
```bash
php client.php "Hello, how are you?"
php client.php "Bonjour tout le monde" en
```

### Web Usage
Place `client.php` in any web server (Apache, Nginx, XAMPP):
```
http://localhost/darija/client.php
```

---

## 4 — Python Client

### Requirements
```bash
pip install requests
```

### Usage
```bash
# Single translation
python client.py "Good morning"

# Specify source language
python client.py "Bonjour" --lang fr

# Interactive REPL
python client.py --interactive

# Health check
python client.py --check

# Custom server
python client.py "Hello" --server http://myserver.com/translator/api/translator \
                          --username myuser --password mypass
```

### Use as a Library
```python
from client import DarijaTranslatorClient

client = DarijaTranslatorClient(
    server_url="http://localhost:8080/translator/api/translator",
    username="api_user",
    password="darija2024"
)

result = client.translate("Hello, how are you?", "en")
print(result)  # أهلاً، كيداير؟

# Batch translation
results = client.translate_batch(["Hello", "Thank you", "Good night"])
for r in results:
    print(r["source"], "→", r.get("translation", r.get("error")))
```

---

## 5 — React Native Mobile App

### Requirements
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`

### Setup & Run
```bash
cd react-native-client
npm install
npx expo start
```
Scan the QR code with **Expo Go** (iOS/Android), or press `a` for Android emulator.

### Server URL for Emulators
- **Android emulator**: use `http://10.0.2.2:8080/...` (maps to host `localhost`)
- **iOS simulator**: use `http://localhost:8080/...`
- **Physical device**: use your machine's LAN IP, e.g. `http://192.168.1.5:8080/...`

Edit `API_BASE` in `App.js` accordingly.

---

## 6 — Testing with cURL

```bash
chmod +x test_api.sh
./test_api.sh
```

Or manually:
```bash
# Health (no auth)
curl http://localhost:8080/translator/api/translator/health

# Translate
curl -X POST http://localhost:8080/translator/api/translator/translate \
  -u api_user:darija2024 \
  -H "Content-Type: application/json" \
  -d '{"text": "How are you?", "sourceLanguage": "en"}'
```

### Postman Collection Setup
1. **Base URL**: `http://localhost:8080/translator/api/translator`
2. **Authorization tab**: Type = Basic Auth, Username = `api_user`, Password = `darija2024`
3. **POST /translate**: Body → raw → JSON → `{"text": "Hello", "sourceLanguage": "en"}`

---

## Extension Features (Advanced)

### Speech Translation (Voice-to-Voice)
Available in the Chrome extension's **Speech** tab:
1. Click **Start Speaking**
2. Speak in English or French
3. Web Speech API transcribes your voice
4. The transcript is sent to the REST API
5. The Darija translation is read aloud via `chrome.tts`

### Read Aloud (TTS)
Every translation can be spoken aloud by clicking 🔊.
Uses `chrome.tts` with `lang: 'ar-MA'` for Moroccan Arabic pronunciation.

### Lightweight Local LLM (Optional Extension)
To run translation locally without the Java server, replace the background.js
API call with a call to a local Ollama endpoint:

```js
// In background.js — replace handleTranslation()
async function handleTranslationLocal(text) {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'aya',          // Cohere's multilingual model, supports Darija
      prompt: `Translate to Moroccan Darija: ${text}`,
      stream: false
    })
  });
  const data = await response.json();
  return { translatedText: data.response };
}
```

Install Ollama: https://ollama.com — then `ollama pull aya`

---

## Production Checklist

- [ ] Replace plaintext passwords in `DarijaIdentityStore` with bcrypt hashing
- [ ] Switch to JDBC IdentityStore backed by a real database
- [ ] Enable HTTPS on the server (required for Basic Auth security)
- [ ] Restrict `CorsFilter` to your specific extension ID and known origins
- [ ] Move `GEMINI_API_KEY` to a secrets manager (not plain env var)
- [ ] Add request rate limiting to the REST endpoint
- [ ] Enable `SSL_VERIFYPEER` in the PHP client
- [ ] Change default user passwords
- [ ] Set `Access-Control-Allow-Origin` to your exact extension origin

---

## Gemini API Free Tier Limits
- **Model**: `gemini-2.0-flash`
- **Rate limit**: 15 requests/minute, 1,500 requests/day
- **Cost**: Free (as of 2024)
- **Upgrade**: Switch to `gemini-2.0-pro` for higher quality and limits

---
