package ma.translator.security;

import jakarta.annotation.security.DeclareRoles;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.security.enterprise.authentication.mechanism.http.BasicAuthenticationMechanismDefinition;

/**
 * Activates HTTP Basic Authentication for the entire application.
 *
 * @BasicAuthenticationMechanismDefinition triggers Jakarta Security to intercept
 * every request and enforce the Authorization: Basic <base64> header.
 *
 * The realm name appears in the browser's credential dialog.
 */
@BasicAuthenticationMechanismDefinition(realmName = "Darija Translator API")
@DeclareRoles({"USER", "ADMIN"})
@ApplicationScoped
public class SecurityConfig {
    // Configuration class — no methods needed.
    // Annotations do all the work via Jakarta Security's CDI extension.
}
