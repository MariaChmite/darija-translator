<?php
/**
 * Darija Translator — PHP Client
 *
 * Usage (CLI):
 *   php client.php "Hello, how are you?"
 *   php client.php "Hello" en          # specify source language
 *
 * Usage (Web):
 *   Place in a web server, visit client.php in browser.
 */

// ── Configuration ──────────────────────────────────────────────────────────
define('API_BASE_URL', 'http://localhost:8080/translator/api/translator');
define('API_USERNAME', 'api_user');
define('API_PASSWORD', 'darija2024');

// ── Translation Function ───────────────────────────────────────────────────

/**
 * Calls the REST endpoint to translate text to Darija.
 *
 * @param string $text           Text to translate
 * @param string $sourceLanguage ISO 639-1 language code (default: 'en')
 * @return array                 ['success' => bool, 'translation' => string, 'error' => string]
 */
function translateToDarija(string $text, string $sourceLanguage = 'en'): array
{
    $url = API_BASE_URL . '/translate';

    $payload = json_encode([
        'text'           => $text,
        'sourceLanguage' => $sourceLanguage,
    ]);

    $credentials = base64_encode(API_USERNAME . ':' . API_PASSWORD);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Accept: application/json',
            'Authorization: Basic ' . $credentials,
        ],
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_SSL_VERIFYPEER => false, // disable in dev; enable in production
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error    = curl_error($ch);
    curl_close($ch);

    if ($error) {
        return ['success' => false, 'error' => 'cURL error: ' . $error];
    }

    $data = json_decode($response, true);

    if ($httpCode !== 200 || !$data) {
        return [
            'success' => false,
            'error'   => "HTTP {$httpCode}: " . ($data['errorMessage'] ?? $response),
        ];
    }

    if (!$data['success']) {
        return ['success' => false, 'error' => $data['errorMessage'] ?? 'Unknown error'];
    }

    return ['success' => true, 'translation' => $data['translatedText']];
}

// ── CLI Mode ───────────────────────────────────────────────────────────────
if (PHP_SAPI === 'cli') {
    $text   = $argv[1] ?? null;
    $lang   = $argv[2] ?? 'en';

    if (!$text) {
        echo "Usage: php client.php \"text to translate\" [source_lang]\n";
        exit(1);
    }

    echo "Translating: \"{$text}\" ({$lang} → Darija)\n";
    $result = translateToDarija($text, $lang);

    if ($result['success']) {
        echo "Translation: " . $result['translation'] . "\n";
    } else {
        echo "Error: " . $result['error'] . "\n";
        exit(1);
    }
    exit(0);
}

// ── Web Mode ───────────────────────────────────────────────────────────────
$inputText   = $_POST['text']   ?? '';
$sourceLang  = $_POST['lang']   ?? 'en';
$translation = null;
$errorMsg    = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $inputText) {
    $result = translateToDarija($inputText, $sourceLang);
    if ($result['success']) {
        $translation = $result['translation'];
    } else {
        $errorMsg = $result['error'];
    }
}

function esc(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Darija Translator — PHP Client</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; background: #f8f7f4; }
  h1 { color: #2d6a4f; margin-bottom: 4px; }
  .sub { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
  .card { background: white; border-radius: 10px; border: 1px solid #e5e7eb; padding: 20px; margin-bottom: 16px; }
  label { font-size: 13px; font-weight: 500; display: block; margin-bottom: 6px; }
  textarea { width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; font-size: 14px; resize: vertical; min-height: 100px; font-family: inherit; }
  select { border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px 10px; font-size: 13px; }
  button { background: #2d6a4f; color: white; border: none; border-radius: 8px; padding: 10px 24px; font-size: 14px; font-weight: 500; cursor: pointer; }
  button:hover { background: #40916c; }
  .result { direction: rtl; text-align: right; font-size: 16px; line-height: 1.7; font-family: 'Segoe UI', 'Arial Unicode MS', sans-serif; padding: 14px; background: #f0fdf4; border-radius: 8px; margin-top: 10px; }
  .error { background: #fef2f2; color: #dc2626; border-radius: 8px; padding: 12px; font-size: 13px; }
</style>
</head>
<body>
  <h1>🇲🇦 Darija Translator</h1>
  <p class="sub">PHP Client — translates to Moroccan Arabic Dialect via REST API</p>

  <div class="card">
    <form method="POST">
      <label for="lang">Source Language</label>
      <select name="lang" id="lang" style="margin-bottom:12px">
        <option value="en" <?= $sourceLang === 'en' ? 'selected' : '' ?>>English</option>
        <option value="fr" <?= $sourceLang === 'fr' ? 'selected' : '' ?>>French</option>
        <option value="ar" <?= $sourceLang === 'ar' ? 'selected' : '' ?>>Arabic (MSA)</option>
      </select>

      <label for="text">Text to Translate</label>
      <textarea name="text" id="text" placeholder="Enter text here…"><?= esc($inputText) ?></textarea>

      <div style="margin-top:12px">
        <button type="submit">Translate to Darija →</button>
      </div>
    </form>
  </div>

  <?php if ($errorMsg): ?>
    <div class="error">❌ <?= esc($errorMsg) ?></div>
  <?php endif; ?>

  <?php if ($translation): ?>
    <div class="card">
      <label>🇲🇦 Moroccan Darija</label>
      <div class="result"><?= esc($translation) ?></div>
    </div>
  <?php endif; ?>
</body>
</html>
