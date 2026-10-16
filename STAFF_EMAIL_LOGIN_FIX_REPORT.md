# Staff Email Login Fix Report

> This records the earlier email-only implementation. The current contract accepts `identifier` (email or phone), keeps `email` as a deprecated compatibility alias, and is documented with reassignment verification in [STAFF_CAPTAIN_ASSIGNMENT_FIX_REPORT.md](./STAFF_CAPTAIN_ASSIGNMENT_FIX_REPORT.md).

## Root cause

The existing staff login validator required `tenantId` and `password`, and accepted `phone` or `email` as alternate identifiers. The service then searched only inside the supplied tenant. A staff email was optional and had no global uniqueness rule, so email by itself could not deterministically identify a SaaS staff account.

The login route is public; it does not require bearer authentication. Its successful response was already wrapped as `data.token` and `data.staff`, so that response envelope was preserved.

## Files changed

- `src/modules/auth/staff/staff.validation.ts` — strict email/password-only request validation; trims and lowercases email.
- `src/modules/auth/staff/staff.service.ts` — global normalized email lookup, bcrypt verification, active-account and Captain-link checks, branch resolution, safe response fields, and existing JWT claims.
- `src/modules/auth/staff/staff.routes.ts` — request, response, and error schemas for Swagger.
- `src/modules/staff/staff-email.ts` — shared staff email normalization and duplicate detection.
- `src/modules/staff/staff.service.ts` — globally checks and normalizes emails during staff create/update.
- `src/modules/captains/captain.service.ts` — globally checks and normalizes emails during Captain create/update.
- `prisma/schema.prisma` — notes the SQL functional index that Prisma cannot represent.
- `prisma/migrations/20261015110000_staff_email_login/migration.sql` — guarded normalization and global case-insensitive unique index.
- `tests/system.integration.ts` — email-only login, error cases, tenant/branch/Captain mapping, role coverage, and cross-tenant duplicate test.
- `tests/manual-delivery.integration.ts` — updates existing login callers to email/password only.
- `CAPTAIN_DELIVERY_ID_MAPPING.md`, `CAPTAIN_DELIVERY_API_AUDIT.md`, `CAPTAIN_DELIVERY_WORKFLOW_TEST_REPORT.md` — updates the documented login contract.

No frontend source or frontend caller was present in this repository. The backend integration-test callers were updated.

## Final API contract

`POST /api/auth/staff/login` accepts only this JSON body:

```json
{
  "email": "captain@example.com",
  "password": "Captain@123"
}
```

Email and password are required. Email whitespace is trimmed and letter case is normalized. Extra properties such as `tenantId` or `phone` are rejected. The endpoint remains public and uses the existing bcrypt password hashes.

The existing response envelope is preserved:

```json
{
  "success": true,
  "message": "Staff login successful",
  "data": {
    "token": "<access-token>",
    "staff": {
      "id": 23,
      "staffId": 23,
      "tenantId": "T001",
      "fullName": "Sam Captain",
      "phone": "9876543210",
      "email": "captain@example.com",
      "role": "CAPTAIN",
      "isActive": true,
      "branchAssignments": [{ "id": "T001-B001", "name": "Main Branch" }],
      "branchIds": ["T001-B001"],
      "branchId": "T001-B001",
      "captainId": 23
    }
  }
}
```

`branchId` is present only for exactly one authorized branch. For multiple branches the response contains `branchAssignments` and `branchIds`; no branch ID is invented. `captainId` is present only when the same-tenant Captain relation exists. The service selects safe fields and does not return a password or hash.

## Uniqueness and identity resolution

- Before applying the migration, the configured database had **0 duplicate groups** and **0 affected staff accounts** when grouped by `lower(trim(email))`.
- The migration checks duplicates before changing records. If another environment has duplicate normalized emails, the migration raises an error before any normalization, preserving those accounts for explicit resolution.
- Otherwise, existing emails are trimmed and lowercased (empty values become `NULL`), and PostgreSQL enforces global uniqueness with a partial functional unique index on `lower(btrim(email))`. The application also normalizes and checks emails in staff and Captain create/update flows.
- Login retrieves the StaffUser by the normalized, globally unique email. `tenantId` and role come from that database row.
- `StaffUser.captain` is a shared-primary-key relation: `Captain.id` references `StaffUser.id`. The returned Captain ID comes from that linked record and is checked against the staff tenant.
- Captains use `captainBranchAssignments`; other staff use `staffBranchAssignments`. Only assignment and branch rows belonging to the resolved tenant are included.
- The JWT retains the existing `staffId`, `tenantId`, and `role` claims. Branch claims are not part of the existing staff-auth contract. Protected requests continue to re-check the staff account, active status, tenant, and role in middleware.

## Verification results

| Check | Result |
| --- | --- |
| `npm run build` | PASS |
| `npx prisma migrate deploy` | PASS; applied `20261015110000_staff_email_login` |
| `npx prisma migrate status` | PASS; database schema is up to date |
| `npm test` | PASS; HTTP integration suite completed the existing order and delivery workflow |
| Cross-tenant duplicate email creation | PASS; rejected with HTTP 409 |
| Live HTTP on `http://localhost:5100` | PASS; valid Captain login 200, invalid password 401, unknown email 401, missing email/password 400, inactive Captain 401, and MANAGER login 200 |
| Tenant/branch/Captain response mapping | PASS; live Captain response matched its database tenant, assigned branch, staff ID, and Captain ID |
| Authenticated Captain endpoint | PASS; `GET /api/captains/me` accepted the returned login token and resolved the linked profile |
| Live Swagger UI | PASS; `GET /api-docs/` returned 200; Try it out displayed an editable email/password body and returned HTTP 200 |
| Served OpenAPI specification | PASS; `/api-docs/swagger-ui-init.js` returned 200 and its embedded operation requires only `email` and `password`, with no `tenantId`, `phone`, bearer security, or path/query parameters |
| Temporary live test accounts | Deactivated after verification; the temporary non-Captain staff account was also deactivated |

## Remaining limitations

There is no frontend project in this repository, so a separate frontend login screen could not be exercised. Any other deployment database must be checked for duplicate normalized staff emails before deploying the migration; the migration deliberately stops without modifying duplicate accounts.
