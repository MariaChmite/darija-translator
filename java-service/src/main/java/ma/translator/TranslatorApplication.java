package ma.translator;

import jakarta.ws.rs.ApplicationPath;
import jakarta.ws.rs.core.Application;

/**
 * JAX-RS bootstrap. All resources under /api/*.
 * No web.xml servlet mapping needed — this annotation does it.
 */
@ApplicationPath("/api")
public class TranslatorApplication extends Application {
    // JAX-RS scans the classpath for @Path classes automatically.
}
