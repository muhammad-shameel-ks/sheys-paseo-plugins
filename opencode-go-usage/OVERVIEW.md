Adds OpenCode Go subscription usage to the Paseo Usage panel, showing the 5-hour, weekly, and monthly meters with their reset times. Because the source runs on the daemon, the desktop and mobile apps both show it.

It reads the active OpenCode Console sign-in from OpenCode's local database (`opencode.db`, honoring `XDG_DATA_HOME` and `OPENCODE_DB`) in read-only mode and calls the Console's Go status endpoint. It never refreshes tokens or writes the credential store.

Setup: sign in with `opencode auth login opencode` on the daemon machine. OpenCode agents running an `opencode-go/...` model also show this usage in their agent popover. Requires OpenCode 2 and Paseo 0.16 or later.
