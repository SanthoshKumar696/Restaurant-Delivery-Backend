# Staff Captain Login and Delivery Assignment Fix Report

## Summary

The backend now treats a Captain as a staff account with a linked Captain profile, supports staff login by email or phone, creates the two linked records together, and safely transfers an unaccepted delivery assignment without replacing its Delivery record. Once a Captain accepts or advances a delivery, reassignment is rejected.

There is no frontend project in this repository, so frontend login or assignment screens could not be exercised.

## Root cause

The staff login implementation looked up accounts by email only, even though staff email is nullable and phone is also an account identifier. That meant a valid phone identifier could not be used to log in. Email normalization and the existing bcrypt hash/verification flow were consistent; no specific existing employee password or stored hash was inspected, and no production password was changed.

Captain account creation was also exposed through a separate Captain endpoint rather than being tied to the staff identity. That left the staff login identity and Captain profile vulnerable to becoming separate or duplicate account records.

## Login contract and identity resolution

`POST /api/auth/staff/login` accepts the preferred request:

```json
{
  "identifier": "captain@example.com",
  "password": "Captain@123"
}
```

`identifier` can be an email or phone number. Email is normalized before lookup. The previous `{ "email": "...", "password": "..." }` body remains as a deprecated compatibility alias. A tenant ID or branch ID is not required from the caller. Unknown identifiers, bad passwords, inactive accounts, and ambiguous phone matches do not disclose whether a specific account exists.

Email is globally unique under normalized matching. Phone numbers are tenant-scoped, so if a phone matches accounts in multiple tenants, login rejects the ambiguous identifier rather than selecting an arbitrary tenant. The authenticated staff record determines the tenant, role, and branch context.

`StaffUser` and `Captain` are linked by a shared primary key: `Captain.id` references `StaffUser.id`. This is the mapping used by the implementation; no separate ID equivalence is assumed. Captain branch assignments and staff branch assignments are resolved from tenant-owned records.

## Captain creation and API surface

Staff creation accepts `role: "CAPTAIN"` and tenant-owned `branchIds`. Tenant context is taken from the authenticated admin, and supplied branch IDs are validated against that tenant. The StaffUser and its single linked Captain profile are created in one transaction. The standalone `POST /api/captains` account-creation endpoint was removed; Captain listing, profile management, availability, and other Captain operations remain available.

## Delivery assignment and reassignment

Both assignment entry points use the shared delivery-assignment service. It supports initial assignment and reassignment while the delivery is still `ASSIGNED`, has not been accepted, and has no progressed lifecycle state. The existing Delivery ID is retained. Assignment updates preserve offer history by cancelling the previous Captain's offer and creating or updating the new Captain's offer. A transaction and conditional state update prevent concurrent assignment races from silently overwriting each other. Reassignment after acceptance or delivery progress returns a conflict.

The Admin Orders response includes `previousCaptain` for reassigned deliveries. Delivery ownership checks ensure that a previous Captain cannot view or act on a delivery after reassignment.

## Files changed

- Staff authentication: `src/modules/auth/staff/staff.validation.ts`, `src/modules/auth/staff/staff.service.ts`, and `src/modules/auth/staff/staff.routes.ts`.
- Staff creation: `src/modules/staff/staff.validation.ts`, `src/modules/staff/staff.types.ts`, `src/modules/staff/staff.service.ts`, and `src/modules/staff/staff.routes.ts`.
- Captain management: `src/modules/captains/captain.validation.ts`, `src/modules/captains/captain.service.ts`, `src/modules/captains/captain.controller.ts`, and `src/modules/captains/captain.routes.ts`.
- Assignment and Admin Orders: `src/modules/deliveries/delivery.service.ts`, `src/modules/deliveries/delivery.routes.ts`, `src/modules/admin-orders/order/order.service.ts`, `src/modules/admin-orders/order/order.types.ts`, and `src/modules/admin-orders/order/order.routes.ts`.
- API documentation: `src/config/swagger.ts`.
- Tests: `tests/system.integration.ts` and `tests/manual-delivery.integration.ts`.
- Related documentation: `CAPTAIN_DELIVERY_ID_MAPPING.md`, `CAPTAIN_DELIVERY_API_AUDIT.md`, `CAPTAIN_DELIVERY_WORKFLOW_TEST_REPORT.md`, `CAPTAIN_DELIVERY_WORKFLOW_API_REPORT.md`, `ADMIN_ORDER_CAPTAIN_ASSIGNMENT_REPORT.md`, and `STAFF_EMAIL_LOGIN_FIX_REPORT.md`.

No Prisma schema or migration change was needed for this work.

## Verification

| Check | Result |
| --- | --- |
| `npm run build` | PASS after the final manual-test update |
| `npm test` | PASS after the final manual-test update; system integration covers staff-based Captain creation, login identifiers and compatibility, tenant/branch checks, route behavior, and reassignment |
| `SKIP_DELIVERY_SOCKET_ASSERTIONS=1 npm run test:manual` | PASS after the final test update; the reassigned Captain accepted, completed, and appeared as the owner of the same Delivery record |
| Reassignment after acceptance | PASS; request returned HTTP 409 |
| Concurrent assignment | PASS; one request succeeded and the competing request returned HTTP 409 |
| Live Swagger UI and generated OpenAPI | PASS; returned HTTP 200. `identifier` is not constrained to email format, the legacy alias is documented, the removed `POST /api/captains` route is absent, and reassignment is documented |

The manual test skipped socket assertions with `SKIP_DELIVERY_SOCKET_ASSERTIONS=1`; HTTP and database lifecycle assertions ran. Socket assertions are covered by the system integration suite.

## Limitations and deployment notes

- No frontend source exists in this repository, so frontend behavior remains unverified.
- Phone login is intentionally rejected when the number is ambiguous across tenants.
- No existing employee credential or stored hash was inspected as part of diagnosing the login behavior.
- Swagger was verified against the live application during the implementation checks; this report does not imply that a production deployment was inspected.
