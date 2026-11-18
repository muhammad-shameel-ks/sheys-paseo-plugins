# sheys-paseo-plugins

Personal [Paseo](https://paseo.sh) plugins.

## Install

Turn on **Settings → Plugins → Enable plugins** on the Paseo daemon host, then install the plugin:

```sh
paseo plugin add git:muhammad-shameel-ks/sheys-paseo-plugins:sheys-paseo-plugin
paseo plugin ls    # confirm it is running
```

Requires Paseo 0.15.4+. On 0.15 the theme uses only its base colors, so the sidebar and secondary shades are derived by Paseo. Plugin code is trusted and unsandboxed: server code runs as the daemon user, and client code runs inside Paseo.

Update or remove:

```sh
paseo plugin update sheys-paseo-plugin
paseo plugin remove sheys-paseo-plugin
```

## sheys-paseo-plugin

### OpenCode Go usage

Shows OpenCode Go subscription usage (5-hour, weekly, and monthly meters) in Paseo's Usage panel, on desktop and mobile.

Paseo's built-in OpenCode Go source only reads the OpenCode 1 API key in `~/.local/share/opencode/auth.json`. This plugin reads the OpenCode 2 Console sign-in (`opencode auth login opencode`) from `opencode.db` in read-only mode and calls the Console's `/api/go/status` endpoint. It never refreshes tokens or writes the credential store. Requires OpenCode 2.

### Pure Black Blue theme

Adds a **Pure Black Blue** theme under Settings → Appearance: Paseo's Pure Black palette with the green accent swapped for blue. It is available on every app connected to the daemon, including mobile.

## Development

Install from a clone instead (edits apply after a reload):

```sh
git clone https://github.com/muhammad-shameel-ks/sheys-paseo-plugins
cd sheys-paseo-plugins/sheys-paseo-plugin
npm install
npm run typecheck
paseo plugin install "$PWD"
paseo plugin reload sheys-paseo-plugin    # after source changes
paseo plugin logs sheys-paseo-plugin      # view plugin logs
```
