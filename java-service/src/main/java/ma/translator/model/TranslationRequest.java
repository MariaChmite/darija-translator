package ma.translator.model;

/**
 * Request payload for POST /api/translator/translate
 */
public class TranslationRequest {

    private String text;
    private String sourceLanguage = "en"; // default: English

    public TranslationRequest() {}

    public TranslationRequest(String text, String sourceLanguage) {
        this.text = text;
        this.sourceLanguage = sourceLanguage;
    }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public String getSourceLanguage() { return sourceLanguage; }
    public void setSourceLanguage(String sourceLanguage) { this.sourceLanguage = sourceLanguage; }
}
