# Staff Tenant and Branch Mapping Fix Report

## Root cause

The request used `tenantId: "T032"` with `branchIds: ["T032-B031"]`, but the database does not use a tenant-prefixed branch ID for that branch. The live database has tenant `T032` and its active branch ID is exactly `B031`; there is no branch with ID `T032-B031`.

The Prisma model confirms that tenant and branch IDs are separate fields:

- `Tenant.id` is a string primary key.
- `Branch.id` is a string primary key and `Branch.tenantId` is a separate foreign key to `Tenant.id`.
- Staff branch assignments store `branchId` and `tenantId` separately and relate `branchId` to `Branch.id`.

The existing validation queried the correct field (`Branch.id`) with the resolved tenant. The mismatch was the submitted branch value, not an integer/string mismatch or a missing tenant-prefix conversion. The prior Swagger example used a prefixed-looking ID, which was misleading as a general format. IDs are opaque: some valid branch IDs may happen to include a tenant-like prefix, while others do not. Clients must submit the exact `Branch.id` returned by the database/API, not construct one from the tenant ID.

## Authorization and final request contract

The authenticated admin JWT contains `adminId`, `username`, `tenantId`, and role `ADMIN`. Admin authentication rechecks that active admin record in the database. The controller always passes the authenticated admin's tenant to staff creation; a request-body `tenantId` cannot override it. If supplied, it is only an assertion and must match the authenticated tenant. The admin model has no branch-assignment relation or platform-admin role, so an authenticated tenant admin can use any active branch belonging to that same tenant, but not a branch in another tenant.

Example request for the verified database records:

```json
{
  "fullName": "Santhosh Kumar",
  "phone": "9876548910",
  "email": "santhosh@example.com",
  "password": "Use-a-private-password",
  "role": "CAPTAIN",
  "tenantId": "T032",
  "branchIds": ["B031"]
}
```

`tenantId` is optional; it is derived from the authenticated admin. `branchIds` must contain exact `Branch.id` strings. Every submitted branch must exist, belong to the resolved tenant, and be active. `CAPTAIN` requires at least one branch. Other staff roles may have no branch or multiple branch assignments.

Validation now distinguishes:

- Unknown branch ID: HTTP 404 `BRANCH_NOT_FOUND`.
- Branch owned by another tenant: HTTP 403 `BRANCH_ACCESS_DENIED`.
- Inactive branch: HTTP 403 `BRANCH_INACTIVE`.
- Body tenant differing from the authenticated tenant: HTTP 403 `TENANT_ACCESS_DENIED`.

The branch ownership check remains in place; no fallback mapping or ownership bypass was added.

## Captain identity and response

Staff creation, the linked Captain profile, and its branch assignments are written in one database transaction. `Captain.id` is the linked `StaffUser.id`, as required by the shared-primary-key relation. The response now includes `tenantId`, `branchAssignments` (`id` and `name`), `branchIds`, and `branchId` when exactly one branch is assigned. Captain responses also include `captainId`. Password hashes are never returned. The staff login continues to accept the supported `identifier` and password contract and returns the same tenant, branch assignments, and linked Captain ID.

## Files changed

- `src/modules/staff/staff.service.ts` — exact branch-ID checks, tenant ownership and active-state checks, explicit errors, and branch assignment details in the creation response.
- `src/modules/staff/staff.routes.ts` — corrected POST `/api/staff` Swagger schema, tenant assertion documentation, exact-ID example, and response shape.
- `tests/system.integration.ts` — matching/mismatching tenant, cross-tenant and unknown branch, multi-branch assignment, and response assertions.

The staff controller, tenant-auth middleware, validation schema, and Prisma schema already represented the intended trusted-tenant and string-ID model, so they did not need changes. No frontend project or staff-creation form exists in this repository.

## HTTP and database verification

The checks below used the live `http://localhost:5100` API and actual database records. Test-only admin, staff, and branch records were removed after the checks.

| Check | Result |
| --- | --- |
| Database lookup for tenant `T032` and branch `B031` | PASS; tenant and branch are active, and `B031.tenantId` is `T032` |
| POST `/api/staff` with tenant `T032`, branch `B031`, and two valid branches for non-Captain staff | PASS; HTTP 201; returned `tenantId` and both branch IDs matched the database assignments |
| POST `/api/staff` for a Captain with branch `B031` | PASS; HTTP 201; database confirmed one linked Captain with the same ID as StaffUser and a `T032`/`B031` Captain branch assignment |
| Staff login using the new Captain's phone identifier | PASS; HTTP 200; response tenant, Captain ID, and branch IDs matched the created records |
| Request body tenant `T002` under a `T032` admin token | PASS; HTTP 403 `TENANT_ACCESS_DENIED` |
| Branch `B001`, which belongs to tenant `T002`, submitted under `T032` | PASS; HTTP 403 `BRANCH_ACCESS_DENIED` |
| Constructed branch ID `T032-B031` | PASS; HTTP 404 `BRANCH_NOT_FOUND`; exact database ID `B031` succeeds |
| Inactive temporary branch | PASS; HTTP 403 `BRANCH_INACTIVE` |
| Captain's own delivery list and another Captain's delivery detail | PASS; own list returned HTTP 200 and other-Captain delivery access returned HTTP 403 |
| Live Swagger UI and generated staff-create operation | PASS; `/api-docs/` and the generated OpenAPI bootstrap returned HTTP 200; schema documents exact `Branch.id` values and `B031` |

## Automated verification

- `npm run build` — PASS.
- `npm test` — PASS, including multi-branch DB assignment checks, staff-based Captain creation, tenant and branch isolation, login, and delivery ownership.
- `git diff --check` — PASS.

The system test uses isolated fixture records for its end-to-end delivery workflow. The live `T032` test additionally verified that the newly created Captain could call its own-deliveries endpoint and was denied access to another Captain's delivery.
