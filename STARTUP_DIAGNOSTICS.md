# Startup diagnostic update

The reported deployment URL redirected to Vercel login in the inspection browser. Its white screen could not be reproduced or diagnosed directly.
The actual public build was tested locally: the login screen rendered and the browser reported no errors.

Defensive changes:
- Failed login-layout loading now reaches the existing startup error screen rather than being silently swallowed.
- A failed entry-module load displays a reload/error panel.
- The service worker no longer returns HTML as a fallback for missing JavaScript or CSS.

These changes address known silent-failure paths; they do not establish the cause of the reported production failure. The first browser Console error from the affected deployment is still needed.
