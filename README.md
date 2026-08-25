# EQUS VC Schema Templates

Ready-made VC Schema templates for identity and anti-money-laundering credentials.

A template is a **starting point offered to an operator, never a constraint on what may be
issued**. A tenant is free to ignore this catalogue entirely and define its own schemas.

## Layout

```
schema/template.schema.json    JSON Schema every template must satisfy
templates/<id>.v<n>.json       Authoring format — one file per template version
registry.bundle.json           Built by CI at release: the single artifact the platform fetches
scripts/                       Validation and bundle build
test/fixtures/                 Deliberately broken templates proving each CI check bites
```

## What a template contains

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Registry slug, `^[a-z0-9-]{1,64}$`. Not a UUID |
| `version` | yes | Version of the shape this file publishes |
| `category` | yes | Registry slug, e.g. `identity`, `aml`. Free-form |
| `name` | yes | Default display name; the operator may change it |
| `description` | yes | What the credential attests |
| `format` | yes | `SdJwtVc` |
| `bindMethod` | yes | `["JWK"]` |
| `credSignAlgs` | yes | `["ES256"]` |
| `proofSignAlgs` | yes | `["ES256"]` |
| `claimDefs` | yes | Claim definitions |
| `expiration` | no | Seconds after issuance until expiry |
| `assurance` | no | `low` or `high` |
| `logo` | no | `{ uri, altText }`; the host must be allowlisted |
| `bgColor`, `textColor` | no | `#rrggbb` |

A template **never** carries `issuers`, `public` or `dedicatedDid` — the JSON Schema rejects
them outright. Those are tenant decisions taken at creation time: issuers are tenant-owned
records, the public flag is the tenant's disclosure policy, and a dedicated DID is
deployment-specific.

### One version per identifier

Superseded `templates/*.json` files stay here as history. The bundle carries only the current
version of each `id` — the highest `version` — and the platform serves exactly one template per
identifier. `GET /vc-schema-templates/:id` takes no version parameter.

**A published template is never edited in place.** Changing a credential shape means adding
`templates/<id>.v<n+1>.json`.

## Contributing a template

1. Fork this repository and add `templates/<id>.v<n>.json`.
2. Run the checks locally:
   ```bash
   npm install
   npm run validate   # schema, ES256 whitelist, logo host, one current file per id
   npm test           # proves each of those checks fails on a broken fixture
   npm run build      # the bundle must be buildable
   ```
3. Open a pull request. CI runs the same three commands.

Anyone may propose a template. Nothing is served to any deployment until a release is tagged
**and** that deployment's pinned commit SHA is moved forward — see below.

## Releasing

Tag `v<x.y.z>`. CI validates, builds `registry.bundle.json`, commits it and attaches it to the
release. **Record the release commit SHA, not the tag.**


