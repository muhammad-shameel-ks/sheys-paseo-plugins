# sheys-paseo-plugins

Personal [Paseo](https://paseo.sh) plugins.

## Install

Turn on **Settings → Plugins → Enable plugins** on the Paseo daemon host, then install the plugin:

```sh
paseo plugin add git:muhammad-shameel-ks/sheys-paseo-plugins:sheys-paseo-plugin
paseo plugin ls    # confirm it is running
```

Requires Paseo 0.15.4+. Plugin code is trusted and unsandboxed.

Update or remove:

```sh
paseo plugin update sheys-paseo-plugin
paseo plugin remove sheys-paseo-plugin
```

## sheys-paseo-plugin

### Pure Black Blue theme

Adds a **Pure Black Blue** theme under Settings → Appearance: Paseo's Pure Black palette with the green accent swapped for blue. It is available on every app connected to the daemon, including mobile.

### Removed once Paseo caught up

Two features were retired because Paseo now ships them natively. Both were verified against upstream before removal; nothing here re-implements them.

- **OpenCode Go usage source.** Read the OpenCode 2 Console sign-in out of `opencode.db` and called `/api/go/status`, because the built-in source only read the OpenCode 1 API key in `auth.json`. Paseo 0.17 handles v2 credentials: its `opencode-go-usage-source` now discovers Console and DB-stored logins itself (`getpaseo/paseo#6428`, closed 2026-11-23), so the plugin's source would have rendered a duplicate card.
- **Prompt cache indicator.** A composer dot with the hit rate, token split and a detail modal. Paseo added the same thing in the composer's context-window tooltip — status dot, live countdown, last-request hit ratio, token split, session ratio, plus a Ping button and `paseo inspect` (`getpaseo/paseo#4305`), and v0.17.2 added per-turn and session cache metrics on top.

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
