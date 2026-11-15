// Small native launcher: no shell, PATH lookup or user-installed Java.
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

int main(void) {
    const char *backend_home = getenv("FORMA_BACKEND_HOME");
    if (!backend_home) {
        fputs("Missing FORMA_BACKEND_HOME\n", stderr);
        return 1;
    }

    char java[PATH_MAX];
    char jar[PATH_MAX];
    if (snprintf(java, sizeof(java), "%s/runtime/bin/java", backend_home) >= sizeof(java) ||
        snprintf(jar, sizeof(jar), "%s/forma-backend.jar", backend_home) >= sizeof(jar)) {
        fputs("Backend resource path is too long\n", stderr);
        return 1;
    }

    char *arguments[] = {
        java,
        "-Xms32m",
        "-Xmx256m",
        "-XX:+UseSerialGC",
        "--enable-native-access=ALL-UNNAMED",
        "-jar", jar, NULL
    };
    execv(java, arguments);
    perror("Unable to start bundled Java");
    return 1;
}
