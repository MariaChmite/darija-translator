package ma.translator.security;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.security.enterprise.credential.Credential;
import jakarta.security.enterprise.credential.UsernamePasswordCredential;
import jakarta.security.enterprise.identitystore.CredentialValidationResult;
import jakarta.security.enterprise.identitystore.IdentityStore;

import java.util.Map;
import java.util.Set;

@ApplicationScoped
public class DarijaIdentityStore implements IdentityStore {

    private static final Map<String, UserRecord> USERS = Map.of(
            "admin",    new UserRecord("admin123",   Set.of("USER", "ADMIN")),
            "api_user", new UserRecord("darija2024", Set.of("USER")),
            "readonly", new UserRecord("readonly123",Set.of("USER"))
    );

    @Override
    public CredentialValidationResult validate(Credential credential) {
        if (!(credential instanceof UsernamePasswordCredential upc)) {
            return CredentialValidationResult.NOT_VALIDATED_RESULT;
        }
        UserRecord record = USERS.get(upc.getCaller());
        if (record != null && record.password().equals(upc.getPasswordAsString())) {
            return new CredentialValidationResult(upc.getCaller(), record.roles());
        }
        return CredentialValidationResult.INVALID_RESULT;
    }

    record UserRecord(String password, Set<String> roles) {}
}
