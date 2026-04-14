package ma.translator.service;

import jakarta.enterprise.context.ApplicationScoped;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.logging.Logger;

@ApplicationScoped
public class TranslationService {

    private static final Logger LOG = Logger.getLogger(TranslationService.class.getName());

    private static final String GEMINI_API_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";;

    private static final String SYSTEM_PROMPT = "You are an expert translator specializing in Moroccan Arabic Dialect (Darija). Translate ONLY, do not explain. Use authentic Moroccan expressions. Write in Arabic script with optional Latin transcription in parentheses.";

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public String translateToDarija(String text, String sourceLanguage) throws IOException, InterruptedException {
        String apiKey = System.getenv("GEMINI_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("GEMINI_API_KEY environment variable is not set");
        }

        String prompt = SYSTEM_PROMPT + " Translate this " + sourceLanguage + " text to Moroccan Darija: " + text;

        String escaped = prompt
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");

        String requestBody = "{\"contents\":[{\"parts\":[{\"text\":\"" + escaped + "\"}]}],\"generationConfig\":{\"temperature\":0.3,\"maxOutputTokens\":512}}";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GEMINI_API_URL + "?key=" + apiKey))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .timeout(Duration.ofSeconds(30))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            LOG.severe("Gemini API error " + response.statusCode() + ": " + response.body());
            throw new IOException("Gemini API returned HTTP " + response.statusCode());
        }

        int textIdx = response.body().indexOf("\"text\"");
        if (textIdx == -1) {
            throw new RuntimeException("Unexpected Gemini response format");
        }
        int start = response.body().indexOf("\"", textIdx + 7) + 1;
        int end = response.body().indexOf("\"", start);
        String raw = response.body().substring(start, end);
        return raw.replace("\\n", "\n").replace("\\\"", "\"").replace("\\\\", "\\");
    }
}
