# sheys-paseo-plugins

Personal [Paseo](https://paseo.sh) plugins.

## OpenCode Go usage

Shows OpenCode Go subscription usage (5-hour, weekly, and monthly meters) in Paseo's Usage panel, on desktop and mobile.

Paseo's built-in OpenCode Go source only reads the OpenCode 1 API key in `~/.local/share/opencode/auth.json`. This plugin reads the OpenCode 2 Console sign-in (`opencode auth login opencode`) from `opencode.db` in read-only mode and calls the Console's `/api/go/status` endpoint. It never refreshes tokens or writes the credential store.

The same plugin adds a **Pure Black Blue** theme under Settings → Appearance: Paseo's Pure Black palette with the green accent swapped for blue.

Requires Paseo 0.16+, OpenCode 2, and plugins enabled under Settings → Plugins.

```sh
paseo plugin install github:muhammad-shameel-ks/sheys-paseo-plugins:opencode-go-usage
```

Update or remove:

```sh
paseo plugin update opencode-go-usage
paseo plugin remove opencode-go-usage
```

Working from a clone instead (edits apply after `paseo plugin reload opencode-go-usage`):

```sh
git clone https://github.com/muhammad-shameel-ks/sheys-paseo-plugins
cd sheys-paseo-plugins/opencode-go-usage && npm install && npm run typecheck
paseo plugin install "$PWD"
```
