# agentproto/apps

The public catalog of [agentproto](https://agentproto.sh) apps.

This repo is an **index**, not a code repo: each app is one JSON entry pointing
at a compiled `.agentapp` bundle hosted somewhere public. The app's source code
lives wherever its publisher keeps it.

- `entries/<appId>.json`: one entry per app (e.g. `entries/@acme/notes.json`).
- `catalog/v1/apps.json`: generated from `entries/` on every merge to `main`.
  Never edit it by hand.
- Releases of this repo host the bundles of first-party apps (tag
  `<slug>@<version>`, asset `<slug>-<version>.agentapp`).

Every agentproto daemon reads the catalog at
**https://agentproto.sh/catalog/v1/apps.json**, which relays
`catalog/v1/apps.json` from this repo (cached for 5 minutes). It is what the
`/store` panel, `app_catalog` and `agentproto app catalog` list.

## Install an app

```bash
agentproto app install https://github.com/agentproto/apps/releases/download/<slug>%40<version>/<slug>-<version>.agentapp --sha256 <sha256>
```

or from the Store: open `/store` on your daemon and click Install. The daemon
refuses a bundle whose digest differs from the catalog entry.

## Entry format

An entry is an `app-catalog/v1` entry (`AppCatalogEntry` in
`@agentproto/runtime`) plus `owners`:

```json
{
  "appId": "@acme/notes",
  "name": "Notes",
  "description": "Take notes with your agents.",
  "category": "productivity",
  "version": "1.2.0",
  "tier": "bundle",
  "publisher": "Acme",
  "license": { "kind": "free" },
  "source": {
    "kind": "agentapp",
    "url": "https://github.com/acme/notes/releases/download/v1.2.0/notes-1.2.0.agentapp",
    "sha256": "<manifest sha256 printed by agentproto app pack>",
    "version": "1.2.0",
    "size": 183204
  },
  "owners": ["acme-bot", "alice"]
}
```

- `source.kind` must be `agentapp`: the public catalog only lists compiled
  bundles, never git sources (installing from git can run a build command).
- `owners` are GitHub logins allowed to change or remove the entry. They are
  not published in `catalog/v1/apps.json`.
- `@agentproto/*` app ids are reserved to the maintainers.

## Publish your app

1. Build a release bundle and its entry:

   ```bash
   agentproto app pack ./my-app --release --entry \
     --asset-url https://github.com/<you>/<repo>/releases/download/v1.2.0/notes-1.2.0.agentapp
   ```

   `--release` builds the UI, drops sources and the build step, and writes
   `notes-1.2.0.agentapp` plus `notes-1.2.0.entry.json`.
2. Upload the `.agentapp` to the URL you passed (a GitHub Release of your repo
   works well). The URL must be public and must never change content: publish
   a new version instead.
3. Check it like CI will:

   ```bash
   agentproto catalog verify notes-1.2.0.entry.json
   ```

4. Copy the entry to `entries/<appId>.json`, add `"owners": ["<your-login>"]`,
   and open a pull request.

CI then checks the policy (paths, owners, reserved ids), downloads your bundle,
and verifies its size, digest and manifest (`agentproto catalog verify`). A
maintainer reviews and merges; the catalog updates within minutes.

To ship an update, open a PR changing `version` and `source` in your entry. To
withdraw an app, open a PR deleting it.

## First-party apps

Published from the agentik-studio monorepo: a tag `app/<slug>@<version>` builds
the app, uploads `<slug>-<version>.agentapp` to the release `<slug>@<version>`
of this repo, and opens a PR updating `entries/<appId>.json`.

## Maintainers

Listed in `MAINTAINERS`. Changes outside `entries/` need a maintainer
(`.github/CODEOWNERS`).
