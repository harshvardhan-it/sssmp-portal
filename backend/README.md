# SSSMP Portal Backend

Express + TypeScript + MongoDB/Mongoose foundation.

From this directory:
```powershell
npm.cmd install
npm.cmd run dev
```

The root `.env` file must contain `MONGODB_URI`. Never commit `.env` or expose its contents.
Health endpoint: `GET /api/v1/health`.

## Database models

The Mongoose model layer is in `src/models/`:

- `User`: credentials, bcrypt password hashes, role, account status, and last login.
- `Member`: user profile, mandatory unique employee code/posting details, organization references, and a unique registration ID.
- `District`: bilingual names, unique code, and active status.
- `Block`: bilingual names, unique code, district reference, and active status.

All models use timestamps, schema validation, and indexes for their relationship and lookup fields. District and block records are intentionally not seeded by the backend.

Run the backend type check with:

```powershell
npm.cmd run typecheck
```

## Authentication

Authentication endpoints are mounted under `/api/v1/auth`:

- `POST /login` accepts `{ "identifier", "password" }`, where `identifier` is a registered email or mobile number.
- `POST /logout` requires a bearer token, atomically increments the user's session version, and invalidates all currently issued tokens for that user.
- `GET /me` requires a bearer token and returns the authenticated safe user.

Successful login returns:

```json
{
  "success": true,
  "data": {
    "token": "<signed JWT>",
    "user": {
      "id": "<user id>",
      "email": "<email>",
      "mobile": "<mobile>",
      "role": "MEMBER",
      "accountStatus": "ACTIVE"
    }
  }
}
```

Send the token as `Authorization: Bearer <token>`. JWT secrets and expiry are loaded from `JWT_SECRET` and `JWT_EXPIRES_IN`; they are never hardcoded. Tokens contain the user's current `sessionVersion`. Authentication reads the user once and rejects tokens whose version no longer matches. Logout and password change increment that version, revoking all concurrent sessions for the user. This is intentionally user-wide rather than per-device: it is simple and does not require a session collection, but logging out one device logs out every device. Token expiry remains the outer limit for otherwise-valid sessions.

`POST /api/v1/auth/change-password` requires the current password and a new password of at least eight characters. The update is an atomic conditional write against the current session version, hashes through the User model utility, records `MEMBER_PASSWORD_CHANGED`, and increments the session version. The response never contains a password hash or token. Clients clear their bearer token and redirect to login after success.

Login attempts are limited in memory to 10 attempts per IP per 15 minutes. This is appropriate for the current single-instance foundation; production deployments with multiple backend instances should replace it with a shared store.

## Member registration

Registration is available at `POST /api/v1/members/register` and accepts the existing frontend form fields. The server:

- assigns an active `MEMBER` account with a `PENDING` payment/membership state so the applicant can log in and complete payment;
- accepts stable MongoDB district/block IDs from the location APIs and resolves them to existing active database records;
- verifies that the block belongs to the selected district;
- generates the registration ID;
- hashes the password through the existing User model hook;
- calculates subscription amounts from trusted constants (`OFFICE_BEARER: 1000`, `YEARLY: 120`).

Registration does not create a JWT, mark payment as received, or activate membership. `GET /api/v1/members/me` requires an active bearer token, so a pending applicant must first be approved and activated by a later administrative workflow.

Employee Code / Unique ID is mandatory, trimmed at the API boundary, stored as `Member.employeeId`,
and protected by a partial unique index so legacy records without the field remain readable. Duplicate
requests return a conflict response asking the applicant to verify the identifier. Before deploying the
index to another database, inspect for missing or duplicate values; do not modify existing member records
to satisfy the constraint. If the inspection is clean, apply the model index with the deployment's normal
Mongoose index-management procedure.

Location data is read from the database:

- `GET /api/v1/locations/districts`
- `GET /api/v1/locations/districts/:districtId/blocks`

For the temporary district-only registration workaround, the 55 district names from the
Government of India Integrated Government Online Directory are stored in
`src/data/mp-districts-igod.json`. The seeder is insert-only, records the source metadata,
never creates blocks, and can be previewed safely:

```powershell
npm.cmd run seed:mp-districts -- --dry-run
npm.cmd run seed:mp-districts
```

The production command is blocked. Existing district records are never overwritten.
Until verified School Education Department block data is available, registration requires
a district but permits an empty block. Such members receive `locationStatus:
LOCATION_PENDING`; a Super Admin, State Admin, or in-scope District Admin can later assign
an active verified block through:

```text
GET   /api/v1/admin/locations/members/unassigned
PATCH /api/v1/admin/locations/members/:memberId/location
      { "blockId": "<verified block id>" }
```

The assignment is conditional on the member being unassigned and on district ownership,
then records `MEMBER_LOCATION_ASSIGNED`. Block Admins cannot list or assign unassigned
members and a null block never broadens access.

If a development database has no verified blocks, provide a verified external JSON file and run:

```powershell
npm.cmd run seed:locations -- C:\path\to\verified-locations.json
```

The file format is:

```json
{
  "districts": [
    {
      "code": "VERIFIED_DISTRICT_CODE",
      "nameEn": "Verified district name",
      "nameHi": "सत्यापित जिला नाम",
      "blocks": [
        {
          "code": "VERIFIED_BLOCK_CODE",
          "nameEn": "Verified block name",
          "nameHi": "सत्यापित ब्लॉक नाम"
        }
      ]
    }
  ]
}
```

The command refuses to run in production, is idempotent by district/block code, and uses `$setOnInsert` so it does not overwrite existing administrative records. The repository intentionally does not include official location data.

## Phase 4 administration

Administrative accounts use the existing roles and optional `User.districtId` / `User.blockId`
scope references. Passwords remain hidden and are hashed by the existing User save hook.

Admin management:

- `GET /api/v1/admins`
- `POST /api/v1/admins`
- `GET /api/v1/admins/:adminId`
- `PATCH /api/v1/admins/:adminId`
- `PATCH /api/v1/admins/:adminId/status`

Location administration:

- `GET /api/v1/admin/locations/districts`
- `POST /api/v1/admin/locations/districts`
- `GET /api/v1/admin/locations/districts/:districtId`
- `PATCH /api/v1/admin/locations/districts/:districtId`
- `GET /api/v1/admin/locations/districts/:districtId/blocks`
- `POST /api/v1/admin/locations/blocks`
- `PATCH /api/v1/admin/locations/blocks/:blockId`

`SUPER_ADMIN` has full scope. `STATE_ADMIN` can manage district/block administrators
and all state locations. `DISTRICT_ADMIN` is restricted to its district and can manage
only `BLOCK_ADMIN` accounts. `BLOCK_ADMIN` and `MEMBER` cannot use administration APIs.
Scope predicates are applied in services and database filters, not only in route middleware.
Location deletion is intentionally not exposed; deactivation is audited, and referenced
locations cannot be deleted by future deletion code without passing the reference guard.

Sensitive administrator and location changes are recorded in `AuditLog`. Audit metadata
is restricted to safe identifiers/statuses; passwords, bearer tokens, and secrets are never
stored. The existing frontend administrator dashboard remains a demo-data prototype and is
not connected to these live administration APIs in this phase.

## Phase 5 membership and bootstrap

Membership workflow is stored separately from `Member` profile data:

- `Membership` stores the membership number, trusted plan/amount, payment-pending or lifecycle status,
  legacy approval/rejection metadata, payment-verification metadata, and validity dates.
- `RenewalRequest` stores each renewal request and the previous/new validity period;
  historical periods are never overwritten.
- The legacy `Member.membershipStatus` remains for backward-compatible profile responses.
  `Membership.status` is the authoritative application/activation workflow state.

Member endpoints:

- `GET /api/v1/memberships/me/membership`
- `GET /api/v1/memberships/me/membership/history`
- `GET /api/v1/memberships/me/membership/renewals`
- `POST /api/v1/memberships/me/membership/renewal`

Administrative endpoints:

- `GET /api/v1/memberships?status=PENDING|APPROVED|ACTIVE|EXPIRED|REJECTED|SUSPENDED|CANCELLED` (read-only administrative inspection; `APPROVED` is legacy data only)
- `GET /api/v1/memberships/renewals`
- `PATCH /api/v1/memberships/renewals/:renewalId/approve`
- `PATCH /api/v1/memberships/renewals/:renewalId/reject` with `{ "reason": "..." }`

Registration creates a `PENDING` payment membership and an active member login. There is
no manual membership approval endpoint. Activation is an internal service operation requiring
an explicit verified-payment assertion and is not exposed as a fake payment endpoint. `YEARLY`
activation receives a server-calculated 365-day validity period. Office Bearer validity
is intentionally left unset until the organization confirms its business rule.

To bootstrap the first active SUPER_ADMIN, run the controlled CLI from the backend
directory against the intended environment:

```powershell
npm.cmd run bootstrap:super-admin
```

The command prompts for email/mobile and hides password input. `BOOTSTRAP_EMAIL` and
`BOOTSTRAP_MOBILE` may be supplied as runtime environment variables, but credentials
must never be committed. It refuses to run if any `SUPER_ADMIN` already exists, uses
the existing password hashing hook, creates only an active `SUPER_ADMIN`, and records
`SUPER_ADMIN_BOOTSTRAPPED` in `AuditLog`. There is no public bootstrap endpoint.

The User schema also declares a partial unique database index for the
`SUPER_ADMIN` role. Concurrent bootstrap processes therefore have one database
winner; the losing process receives a safe "already exists" error. Before
deploying this index, verify the target database has at most one SUPER_ADMIN
without changing records:

```powershell
npm.cmd run build
node -e 'const mongoose=require("mongoose"); mongoose.connect(process.env.MONGODB_URI).then(async()=>{ console.log(await mongoose.connection.collection("users").aggregate([{ $match:{role:"SUPER_ADMIN"} },{ $group:{_id:null,count:{ $sum:1 }} }]).toArray()); await mongoose.disconnect(); })'
```

Run the index build in an isolated maintenance window using the application
model's `syncIndexes()` only after that count is confirmed. Never run
`syncIndexes()` against production as an ad-hoc repair command.

## Membership stabilization

`Membership.status` is authoritative for payment-pending, activation, expiration,
suspension, and cancellation. `Member.membershipStatus` is retained only as a
derived compatibility field; lifecycle services update it together with
`joinedAt` and `membershipExpiresAt` where applicable. Approval and rejection
use conditional database updates, so concurrent decisions cannot both commit.

Activation is intentionally disabled until Phase 6 provides trusted payment
evidence. No API accepts a `paymentVerified` boolean or a client-supplied
payment timestamp. Payment integration must call a server-side, idempotent
verification workflow tied to the membership, plan, and server-owned amount.

Renewal requests are allowed only for ACTIVE or EXPIRED memberships. Approval
does not activate a renewal. OFFICE_BEARER validity remains unset; YEARLY
validity is 365 days once trusted payment activation exists.

Expired yearly memberships can be processed by a scheduler:

```powershell
npm.cmd run expire:memberships
```

The command connects, atomically changes due ACTIVE memberships to EXPIRED,
synchronizes the derived member status, writes system-attributed audit records,
and disconnects. It is safe to invoke repeatedly. On Windows Task Scheduler,
create a daily task that runs `npm.cmd run expire:memberships` with the
working directory set to `backend` and the intended environment variables
available to the task. Production deployments should use their managed
scheduler instead of an in-process timer.

System-generated registration and expiration audit records use the reserved
all-zero ObjectId actor and metadata identifying the system source; they do not
pretend to be administrator actions.

## Legacy Phase 6 Razorpay Test Mode (historical)

This section documents the retained Razorpay adapter for historical and in-flight
transactions only. New membership and renewal orders use Cashfree as described
in the Current payment provider section below. Configure Razorpay credentials
only if an existing Razorpay transaction must be reconciled or refunded.
Amounts are derived from the approved membership or renewal plan and sent as
integer paise (`OFFICE_BEARER` 100000, `YEARLY` 12000). The client cannot provide
an amount, currency, member ID, or payment status.

Member payment endpoints:

- `POST /api/v1/payments/orders` with exactly one approved `membershipId` or `renewalRequestId`
- `POST /api/v1/payments/verify` with Razorpay order ID, payment ID, and checkout signature
- `GET /api/v1/payments/history`
- `GET /api/v1/payments/:paymentId/receipt`

Scoped administrative endpoints:

- `GET /api/v1/admin/payments`
- `GET /api/v1/admin/payments/:paymentId`
- `POST /api/v1/admin/payments/:paymentId/refund` with optional integer `amountPaise` and reason

Configure Razorpay's webhook URL as
`https://<host>/api/v1/webhooks/razorpay` and provide the webhook secret.
The route is mounted before JSON parsing and verifies the original raw body.
Captured webhook or checkout payments are fetched again from Razorpay and must
match the stored order, INR currency, and server-owned amount before activation.
Duplicate provider event IDs and captured payments are idempotent.

Refunds are provider-backed and tracked with aggregate refunded amount and
provider refund ID. A successful refund does not automatically suspend a
membership because that policy has not been defined; operators must use the
existing membership suspension workflow where required. Refund webhook
reconciliation and tax/GST receipt rendering remain follow-up work.


## Current payment provider: Cashfree PG

New membership and renewal payments use Cashfree Payment Gateway in sandbox mode by default. The previous Razorpay adapter and webhook endpoint remain only to reconcile historical or already-created Razorpay transactions; new orders are never created with Razorpay.

Configure these variables in the backend runtime (Render or local root `.env`):

- `CASHFREE_APP_ID`: Cashfree sandbox App ID (use production credentials only after merchant activation).
- `CASHFREE_SECRET_KEY`: corresponding Cashfree secret key; backend only, never expose to Vite.
- `CASHFREE_ENVIRONMENT=sandbox` for testing, or `production` after approval.
- `CASHFREE_WEBHOOK_URL=https://<backend-host>/api/v1/webhooks/cashfree`.
- `FRONTEND_URL=https://<frontend-host>` so Cashfree returns to `/#/member/payments?cashfree_order_id={order_id}` (the portal uses HashRouter).

Cashfree uses the PG API version `2025-01-01`, server-side order creation, the hosted Cashfree JS v3 checkout, order-payment fetch for authoritative verification, HMAC-SHA256/Base64 webhook signature verification over timestamp + raw request body, and Cashfree refund APIs. POST order and refund requests use Cashfree idempotency keys.

Member payment endpoints:

- `POST /api/v1/payments/orders` with exactly one approved `membershipId` or `renewalRequestId`; returns `paymentSessionId`, `mode`, and the local payment record.
- `POST /api/v1/payments/verify` with `cashfreeOrderId`; backend fetches Cashfree payments and checks order ID, INR currency, and the server-owned amount before activation.
- `GET /api/v1/payments/history`
- `GET /api/v1/payments/:paymentId/receipt`

Webhook:

- `POST /api/v1/webhooks/cashfree` (configure this exact URL in Cashfree dashboard).
- The route must receive the original raw JSON body before Express JSON parsing.
- Payment success is reconciled by fetching payment records from Cashfree; browser redirects alone never activate a membership.
- Refund status notifications update refund totals only after Cashfree reports a successful refund.

Existing Razorpay transactions and their webhook inbox are retained for historical compatibility. Do not delete or bulk-convert these records during deployment. Any legacy Razorpay transaction still in an active state must be reconciled before a new Cashfree attempt is created for the same membership operation.

Cashfree sandbox must be tested end-to-end before switching `CASHFREE_ENVIRONMENT` to `production`. Configure the Cashfree webhook in the dashboard, test UPI and at least one failed/cancelled flow, verify payment history and receipts, and verify a refund status callback. A live production rollout must wait for Cashfree merchant/product activation and production credentials.
