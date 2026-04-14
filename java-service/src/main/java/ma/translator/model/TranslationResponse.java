package ma.translator.model;

/**
 * Response payload for the translation endpoint.
 */
public class TranslationResponse {

    private String translatedText;
    private String errorMessage;
    private boolean success;

    public TranslationResponse() {}

    public TranslationResponse(String translatedText, String errorMessage, boolean success) {
        this.translatedText = translatedText;
        this.errorMessage = errorMessage;
        this.success = success;
    }

    public String getTranslatedText() { return translatedText; }
    public void setTranslatedText(String translatedText) { this.translatedText = translatedText; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
}
