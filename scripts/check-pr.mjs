#!/usr/bin/env node
// Policy check of a pull request on agentproto/apps. Run by
// .github/workflows/validate.yml from the BASE branch copy of this file, so a
// PR cannot weaken the rules it is checked against. Bundle integrity (download,
// sha256, size, unpack, manifest, no ui.build) is `agentproto catalog verify`,
// run next by the same workflow.
//
// Usage: node check-pr.mjs --author <login> --base <ref> [--root <dir>]
//   Changed files are `git diff --name-status <base>...HEAD`.
//
// Rules:
//   1. Non-maintainers (MAINTAINERS, base branch) may only touch entries/**.
//      catalog/v1/apps.json is generated on main: only a maintainer may
//      touch it in a PR (bootstrap, repair).
//   2. An entry lives at entries/<appId>.json (e.g. entries/@acme/notes.json)
//      and its `appId` matches that path.
//   3. `@agentproto/*` app ids are reserved to maintainers.
//   4. `owners` (GitHub logins, kept in the entry file, stripped from the
//      published catalog) protects an app id: adding an entry requires the
//      author in its `owners`; changing or deleting one requires the author
//      in the BASE version's `owners`. Maintainers may do both.

import { execFileSync } from "node:child_process"
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { parseArgs } from "node:util"

const { values } = parseArgs({
  options: {
    author: { type: "string" },
    base: { type: "string" },
    root: { type: "string", default: "." },
  },
})
const author = (values.author ?? "").toLowerCase()
const base = values.base
const root = values.root
if (!author || !base) {
  console.error("usage: check-pr.mjs --author <login> --base <ref> [--root <dir>]")
  process.exit(2)
}

const git = (...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8" })
const showBase = (path) => {
  try {
    return git("show", `${base}:${path}`)
  } catch {
    return undefined
  }
}
const parseJson = (text, where) => {
  try {
    return JSON.parse(text)
  } catch (err) {
    errors.push(`${where}: invalid JSON (${err.message})`)
    return undefined
  }
}

const errors = []
const maintainers = new Set(
  (showBase("MAINTAINERS") ?? "")
    .split("\n")
    .map((l) => l.trim().toLowerCase())
    .filter((l) => l && !l.startsWith("#")),
)
const isMaintainer = maintainers.has(author)

const changes = git("diff", "--name-status", "--no-renames", `${base}...HEAD`)
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [status, path] = line.split("\t")
    return { status, path }
  })

const owners = (entry) =>
  Array.isArray(entry?.owners) ? entry.owners.map((o) => String(o).toLowerCase()) : []

for (const { status, path } of changes) {
  if (path === "catalog/v1/apps.json") {
    if (!isMaintainer) errors.push(`${path}: generated on main by the catalog workflow, do not edit it in a PR`)
    continue
  }
  if (!path.startsWith("entries/")) {
    if (!isMaintainer) errors.push(`${path}: only maintainers may change files outside entries/`)
    continue
  }
  if (path === "entries/.gitkeep") continue
  const m = /^entries\/(@[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9._-]*)\.json$/.exec(path)
  if (!m) {
    errors.push(`${path}: entries must be entries/@<scope>/<name>.json (lowercase)`)
    continue
  }
  const appId = m[1]
  if (appId.startsWith("@agentproto/") && !isMaintainer) {
    errors.push(`${path}: @agentproto/* app ids are reserved to maintainers`)
  }
  const before = status === "A" ? undefined : parseJson(showBase(path) ?? "null", `${path} (base)`)
  if (status !== "A" && !isMaintainer && !owners(before).includes(author)) {
    errors.push(`${path}: ${author} is not in the owners of ${appId}`)
  }
  if (status === "D") continue
  const file = join(root, path)
  if (!existsSync(file)) continue
  const entry = parseJson(readFileSync(file, "utf8"), path)
  if (!entry) continue
  if (entry.appId !== appId) errors.push(`${path}: appId is ${JSON.stringify(entry.appId)}, expected "${appId}"`)
  if (owners(entry).length === 0) errors.push(`${path}: owners must list at least one GitHub login`)
  if (status === "A" && !isMaintainer && !owners(entry).includes(author)) {
    errors.push(`${path}: a new entry must list its author (${author}) in owners`)
  }
}

if (errors.length > 0) {
  for (const e of errors) console.error(`check-pr: ${e}`)
  process.exit(1)
}
console.log(`check-pr: ok (${changes.length} changed file(s), author ${author}${isMaintainer ? ", maintainer" : ""})`)
