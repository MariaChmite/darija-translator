#!/usr/bin/env python3
"""
Darija Translator — Python Client
===================================
Calls the Jakarta REST endpoint to translate text into Moroccan Darija.

Usage:
  python client.py "Hello, how are you?"
  python client.py "Hello" --lang fr
  python client.py --interactive          # REPL mode
  python client.py --server http://...    # custom server

Requirements:
  pip install requests
"""

import argparse
import base64
import sys
from typing import Optional

try:
    import requests
except ImportError:
    print("Error: 'requests' library not found. Run: pip install requests")
    sys.exit(1)

# ── Configuration ──────────────────────────────────────────────────────────
DEFAULT_SERVER   = "http://localhost:8080/translator/api/translator"
DEFAULT_USERNAME = "api_user"
DEFAULT_PASSWORD = "darija2024"

LANG_NAMES = {
    "en": "English",
    "fr": "French",
    "ar": "Arabic (MSA)",
    "es": "Spanish",
}

# ── DarijaTranslatorClient class ───────────────────────────────────────────

class DarijaTranslatorClient:
    """HTTP client for the Darija REST translation service."""

    def __init__(
        self,
        server_url: str = DEFAULT_SERVER,
        username: str = DEFAULT_USERNAME,
        password: str = DEFAULT_PASSWORD,
        timeout: int = 30,
    ):
        self.server_url = server_url.rstrip("/")
        self.timeout    = timeout
        self.session    = requests.Session()
        self.session.auth = (username, password)
        self.session.headers.update({
            "Content-Type": "application/json",
            "Accept":       "application/json",
        })

    def health_check(self) -> bool:
        """Returns True if the server is up."""
        try:
            resp = self.session.get(
                f"{self.server_url}/health",
                auth=None,          # health endpoint is unauthenticated
                timeout=5,
            )
            return resp.status_code == 200
        except requests.RequestException:
            return False

    def translate(self, text: str, source_language: str = "en") -> str:
        """
        Translates text into Moroccan Darija.

        Args:
            text:            Input text to translate.
            source_language: ISO 639-1 source language code.

        Returns:
            Translated Darija text.

        Raises:
            requests.HTTPError: on HTTP error responses.
            ValueError:         on API-level errors.
        """
        if not text or not text.strip():
            raise ValueError("Text must not be empty.")

        payload = {
            "text": text.strip(),
            "sourceLanguage": source_language,
        }

        resp = self.session.post(
            f"{self.server_url}/translate",
            json=payload,
            timeout=self.timeout,
        )
        resp.raise_for_status()

        data = resp.json()
        if not data.get("success"):
            raise ValueError(f"Translation error: {data.get('errorMessage', 'Unknown')}")

        return data["translatedText"]

    def translate_batch(
        self, texts: list[str], source_language: str = "en"
    ) -> list[dict]:
        """
        Translates a list of strings, returning results for each.
        Errors per item are captured without stopping the batch.
        """
        results = []
        for text in texts:
            try:
                translation = self.translate(text, source_language)
                results.append({"source": text, "translation": translation, "ok": True})
            except Exception as e:
                results.append({"source": text, "error": str(e), "ok": False})
        return results


# ── CLI ────────────────────────────────────────────────────────────────────

def interactive_mode(client: DarijaTranslatorClient, lang: str) -> None:
    """REPL: type English → get Darija translation back."""
    lang_name = LANG_NAMES.get(lang, lang)
    print(f"\n🇲🇦 Darija Translator — Interactive Mode")
    print(f"   Source: {lang_name} | Type 'quit' to exit\n")

    while True:
        try:
            text = input("  > ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBye!")
            break

        if not text:
            continue
        if text.lower() in ("quit", "exit", "q"):
            print("Bye!")
            break

        try:
            result = client.translate(text, lang)
            print(f"  → {result}\n")
        except Exception as e:
            print(f"  ❌ {e}\n")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Translate text to Moroccan Darija via the REST API.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python client.py "Hello world"
  python client.py "Bonjour" --lang fr
  python client.py --interactive
  python client.py "Hello" --server http://myserver.com/translator/api/translator
        """,
    )
    parser.add_argument("text", nargs="?", help="Text to translate")
    parser.add_argument("--lang", "-l", default="en", help="Source language (default: en)")
    parser.add_argument("--interactive", "-i", action="store_true", help="Interactive REPL mode")
    parser.add_argument("--server",   default=DEFAULT_SERVER,   help="API server URL")
    parser.add_argument("--username", default=DEFAULT_USERNAME,  help="API username")
    parser.add_argument("--password", default=DEFAULT_PASSWORD,  help="API password")
    parser.add_argument("--check",    action="store_true",        help="Health check only")
    args = parser.parse_args()

    client = DarijaTranslatorClient(args.server, args.username, args.password)

    if args.check:
        up = client.health_check()
        print(f"Server status: {'✅ UP' if up else '❌ DOWN'}")
        sys.exit(0 if up else 1)

    if args.interactive:
        interactive_mode(client, args.lang)
        return

    if not args.text:
        parser.print_help()
        sys.exit(1)

    try:
        result = client.translate(args.text, args.lang)
        print(f"\n{result}\n")
    except requests.HTTPError as e:
        print(f"HTTP error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
