# agentproto/apps

The public catalog of [agentproto](https://agentproto.sh) apps.

This repo is an **index**, not a code repo: each app is one JSON entry pointing
at a compiled `.agentapp` bundle hosted somewhere public. The app's source code
lives wherever its publisher keeps it.

- `entries/<appId>.json`: one entry per app (e.g. `entries/@acme/notes.json`).
- `media/<appId>/<version>/`: icon and screenshots of an app's store page
  (e.g. `media/@acme/notes/1.2.0/editor.png`).
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

## Store page (listing)

Each app has a page at `https://agentproto.sh/apps/<slug>`. Optional entry
fields fill it in: `tagline`, `longDescription` (markdown, raw HTML is not
rendered), `screenshots` (`{url, alt, width?, height?}`), `icon`,
`categories`, `publisher`, `homepage`, `repository`.

Declare them in your app's APP.md `store:` block and
`agentproto app pack --release --entry` writes them into the entry:

```yaml
store:
  tagline: Notes with your agents.          # 1 to 120 characters
  categories: [productivity, notes]          # at most 5, [a-z0-9-]
  publisher: Acme
  homepage: https://acme.dev/notes
  repository: https://github.com/acme/notes
  icon: store/icon.svg                       # png/jpeg/webp/svg, 256 KB max
  listing: store/LISTING.md                  # long description, markdown
  screenshots:                               # at most 8, png/jpeg/webp, 1 MB max
    - path: store/screenshots/editor.png
      alt: The note editor next to an agent session    # required
```

Local media are copied to `media/<appId>/<version>/` next to the entry
and referenced from this repo
(`https://raw.githubusercontent.com/agentproto/apps/main/media/<appId>/<version>/<file>`):
add that folder to your PR, next to `entries/<appId>.json`. To host
them yourself, pack with `--media-base-url https://your.host/path` and
upload the folder there instead. All URLs must be https.

CI checks the media the same way as the bundle: `check-pr.mjs` (paths,
owners, 1 MB cap) and `agentproto catalog verify` (format, size, alt text,
limits), reading the PR's own media from the checkout. Media of a version
stay in place once merged; a new version gets its own folder.

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
   agentproto catalog verify notes-1.2.0.entry.json \
     --local-media https://raw.githubusercontent.com/agentproto/apps/main/=.
   ```

   (`--local-media` reads listing media from the folder `pack` wrote, before
   they are on `main`.)

4. Copy the entry to `entries/<appId>.json`, add `"owners": ["<your-login>"]`,
   add the `media/` folder if your app has a store listing, and open a pull
   request.

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
