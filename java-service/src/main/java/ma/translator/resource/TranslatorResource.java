package ma.translator.resource;


import jakarta.annotation.security.RolesAllowed;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import ma.translator.model.TranslationRequest;
import ma.translator.model.TranslationResponse;
import ma.translator.service.TranslationService;

/**
 * REST endpoint for English → Moroccan Darija translation.
 * Secured with Jakarta Security (Basic Authentication).
 *
 * Base URL: /api/translator
 */
@Path("/translator")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed("USER")
public class TranslatorResource {

    @Inject
    private TranslationService translationService;

    /**
     * POST /api/translator/translate
     * Body: { "text": "Hello, how are you?", "sourceLanguage": "en" }
     *
     * @param request  Translation request payload
     * @return         JSON with translated Darija text
     */
    @POST
    @Path("/translate")
    public Response translate(TranslationRequest request) {
        if (request == null || request.getText() == null || request.getText().isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new TranslationResponse(null, "Text must not be empty", false))
                    .build();
        }

        try {
            String translated = translationService.translateToDarija(
                    request.getText(),
                    request.getSourceLanguage() != null ? request.getSourceLanguage() : "en"
            );
            return Response.ok(new TranslationResponse(translated, null, true)).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new TranslationResponse(null, "Translation failed: " + e.getMessage(), false))
                    .build();
        }
    }

    /**
     * GET /api/translator/translate?text=Hello&source=en
     * Convenience GET endpoint (useful for browser testing).
     */
    @GET
    @Path("/translate")
    public Response translateGet(
            @QueryParam("text") String text,
            @QueryParam("source") @DefaultValue("en") String source) {

        if (text == null || text.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new TranslationResponse(null, "Query param 'text' is required", false))
                    .build();
        }

        try {
            String translated = translationService.translateToDarija(text, source);
            return Response.ok(new TranslationResponse(translated, null, true)).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new TranslationResponse(null, e.getMessage(), false))
                    .build();
        }
    }

    /**
     * GET /api/translator/health — unauthenticated health check.
     */
    @GET
    @Path("/health")
    @PermitAll
    @RolesAllowed({}) // override class-level restriction
    public Response health() {
        return Response.ok("{\"status\":\"UP\",\"service\":\"Darija Translator\"}").build();
    }
}
