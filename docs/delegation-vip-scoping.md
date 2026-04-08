# Delegation / VIP data scoping (admin APIs)

Principals can delegate admin access to assistants and exclude specific **platform users** (e.g. VIPs) via `delegationExcludedUserIds`.

## Rules

1. **User lists and profile access**  
   Use `mergeTenantUserListWhere` and `assertCanAccessTenantUser` from `server/utils/delegateUserManagement.ts` so delegates never see or mutate excluded accounts.

2. **Rows linked by `userId` to a User**  
   For `PropertyInquiry`, `HomeEstimate`, and `ViewingRequest`, any **tenant-scoped list/count/group** must filter out rows whose `userId` points at an excluded user:
   - `mergeWhereOmitExcludedUserLink` when `userId` is optional (nullable).
   - `mergeWhereOmitExcludedUserLinkRequired` when the query requires a user link (e.g. viewing requests).

3. **Single record by id**  
   After `requireTenantAccess`, if the model has `userId` set, call `assertCanAccessTenantUser` on the linked user before returning or updating (see admin estimate PATCH).

4. **CRM (`CrmClient`)**  
   Clients are not keyed by platform `User` id; the same person may still appear as a CRM row. That is a separate product decision if you need parity with VIP hiding.

## Automation

```bash
npm run check:delegate-sensitive-queries
```

This fails if any `server/api/admin/**/*.ts` file calls `findMany` / `findFirst` / `count` / `groupBy` / `aggregate` on those Prisma models without referencing the merge helpers in the same file. Wire it into CI (e.g. before `build`) so new endpoints cannot skip the filter by accident.
