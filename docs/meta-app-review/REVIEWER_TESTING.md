# Meta App Review — Reviewer Testing Pack

This document is the source of truth for everything Meta App Reviewers
need to test the DeelBot Facebook integration during App Review. It
exists for two audiences:

1. **You (Abdul)** — to keep the reviewer credentials, screencast URL,
   and submission text in one place so you can paste them into Meta's
   forms without hunting through Slack/notes.
2. **Future you** — when Meta opens a re-review in 12 months (they do
   this annually for every app), you'll need all of this again. Update
   the file at that time rather than rebuilding it from scratch.

> ⚠️ **DO NOT COMMIT REAL PASSWORDS HERE.** Keep them in a password
> manager. The `<PASSWORD_FROM_PASSWORD_MANAGER>` placeholder below is
> the safe form for git.

---

## 1. Reviewer Test Account — credentials

This is a real DeelBot tenant on production, created specifically for
Meta App Reviewers. It is `role=admin` with `adminId=null`, which
makes it an independent principal-admin tenant separate from AOhomes
or any other paying tenant.

| Field | Value |
|---|---|
| URL | `https://deelbot.ai/auth/login` |
| Email | `info@deelbot.com` |
| Password | `<PASTE_FROM_PASSWORD_MANAGER>` — stored in 1Password under "DeelBot · Meta App Review Tester" |
| First Name | Meta |
| Last Name | Review Tester |
| Role | admin (principal admin — its own tenant) |
| Created via | `/admin/users` while signed in as super_admin |
| Created on | 2026-06-17 |

### How to recreate this account if needed

1. Sign in to https://deelbot.ai as a `super_admin`.
2. Go to `/admin/users` → click **Add User**.
3. Fill in:
   - First Name: `Meta`
   - Last Name: `Review Tester`
   - Email: a real address you control
   - Role: **`admin`** (must be `admin`, not `user`)
   - Password: 8+ characters, store in your password manager
4. Click **Save**.
5. Sign out, sign back in as the new admin to verify it lands on
   an empty tenant dashboard (not AOhomes').
6. Connect a real Facebook Page via `/admin/facebook`.
7. Publish at least one test post via `/admin/properties → Post to
   Facebook` to confirm the full flow works.

### Connected Facebook Page

The reviewer account has the following Facebook Page connected so
they can immediately see the integration's connected state without
having to bring their own Page:

| Field | Value |
|---|---|
| Page name | `Abdulkabir - Abdul Ojulari` |
| Page ID | `<look this up on /admin/facebook → Test → Connection Diagnostics, or in the URL of your FB Page>` |
| Page URL | `<paste from your Facebook Page browser tab>` |
| Connected on | 2026-06-17 |
| Token expiry | Aug 16, 2026 (long-lived user token; the page token derived from it does not expire) |

---

## 2. Reviewer Instructions — paste this verbatim into Meta's
##    "Testing Instructions" field

The block below is what goes into the App Review submission's
"Provide testing instructions" field. Copy from `BEGIN` to `END`.

````
================================================================
DEELBOT — FACEBOOK INTEGRATION TEST WALKTHROUGH
================================================================

Last verified working: 2026-06-17
Test environment: production (https://deelbot.ai)

----------------------------------------------------------------
TESTER CREDENTIALS
----------------------------------------------------------------
Email:    info@deelbot.com
Password: <PASTE_FROM_PASSWORD_MANAGER_BEFORE_PASTING_INTO_META>

This is a dedicated DeelBot tenant on production, created for Meta
App Review. The account is role=admin with its own tenant scope
(adminId=null) and is fully isolated from AOhomes and every other
paying tenant. The account already has a Facebook Page connected so
you can immediately see the connected state and exercise the
read/post flows without bringing your own Page.

Please do not change the password during your review. If the account
becomes locked out for any reason, email support@deelbot.ai and we
will reset it within one business day.

----------------------------------------------------------------
1. SIGN IN
----------------------------------------------------------------
1.1  Open https://deelbot.ai/auth/login in a modern desktop browser
     (Chrome, Safari, Edge, or Firefox).
1.2  Enter the credentials above and click "Sign In".
1.3  You will land on the DeelBot admin dashboard.

----------------------------------------------------------------
2. CONFIRM CONNECTED STATE  (tests `pages_show_list`)
----------------------------------------------------------------
2.1  Click "Facebook" in the left navigation. You will land on
     https://deelbot.ai/admin/facebook.
2.2  Observe the green "Connected" panel showing the Page name, the
     connected Facebook user name, and a token expiry date.
2.3  To re-test the `pages_show_list` permission from scratch, click
     "Disconnect", then click "Login with Facebook" and complete the
     OAuth flow with any Facebook account you own that manages at
     least one Page. The Page picker is the result of
     `pages_show_list`.

----------------------------------------------------------------
3. PUBLISH A POST  (tests `pages_manage_posts`)
----------------------------------------------------------------
3.1  Click "Properties" in the left navigation.
3.2  Open any listing in the list.
3.3  Click "Post to Facebook" in the Quick Actions sidebar.
3.4  The post composer opens with the listing photos and a caption
     pre-filled from the listing's details. Edit the caption if
     desired — the post is published only when you click "Post".
3.5  Click "Post".
3.6  A success message appears with the Facebook post ID and a
     "View on Facebook" link.
3.7  Click the link to open the live post on the connected Facebook
     Page. Verify the post is live on the Page selected during
     connection — not on any other Page.

----------------------------------------------------------------
4. READ POST ENGAGEMENT  (tests `pages_read_engagement`)
----------------------------------------------------------------
4.1  From the connected Facebook Page tab (opened in Step 3.7), use a
     separate Facebook account to leave a reaction or comment on the
     post you just published. Wait ~30 seconds for Facebook's
     engagement counters to settle.
4.2  Return to DeelBot and click "Posts" in the Facebook section, or
     navigate to https://deelbot.ai/admin/facebook/posts.
4.3  Find the post you just published. Observe the engagement counts
     (reactions, comments, shares) displayed against the post. These
     are read via `pages_read_engagement` — only aggregate counts on
     posts DeelBot itself created; never the content of comments,
     never the authors of comments, and never engagement on posts
     not created by DeelBot.

----------------------------------------------------------------
5. DISCONNECT  (tests user revocation flow)
----------------------------------------------------------------
5.1  Return to https://deelbot.ai/admin/facebook.
5.2  Click the red "Disconnect" button.
5.3  The state reverts to "Not Connected". The Page access token,
     user access token, granted permissions, and all Facebook
     identifiers are cleared from DeelBot's database immediately.

(Reviewer note: if you do disconnect, please reconnect the same Page
afterward so the next reviewer who picks up this account doesn't
have to repeat Step 2.3.)

----------------------------------------------------------------
6. WEBHOOK CALLBACKS — SIGNED_REQUEST VERIFICATION
----------------------------------------------------------------
The two webhook endpoints registered in the DeelBot App Settings:

  Deauthorize:    https://deelbot.ai/api/facebook/deauthorize
  Data deletion:  https://deelbot.ai/api/facebook/data-deletion

Both endpoints verify Meta's signed_request HMAC-SHA256 against our
App Secret using constant-time comparison before any database
write. The deauthorize endpoint clears the affected tenant's tokens
on a valid request. The data-deletion endpoint additionally returns
the required JSON status URL + confirmation code per Meta's
specification, and serves a public status page at:

  https://deelbot.ai/facebook/deletion-status?code=<code>

Both URLs respond 200 OK on valid signed requests and 400 Bad
Request on malformed or unsigned requests. You can verify them via
the "Verify" button in App Settings → Webhooks.

----------------------------------------------------------------
7. CONTACT
----------------------------------------------------------------
For any issue during testing, email support@deelbot.ai. A live human
responds within one business day, Monday-Friday, Mountain Time
(Canada).

Thank you for reviewing DeelBot.
````

---

## 3. Screencast URL

| Field | Value |
|---|---|
| Platform | YouTube |
| Visibility | **Unlisted** (NOT Private — reviewers don't have your Google account) |
| Duration | 90 seconds to 3 minutes |
| URL | `<PASTE_YOUR_YOUTUBE_URL_AFTER_UPLOAD>` |
| Last re-recorded | 2026-06-17 |

### Screencast script (the one we recorded)

Beats and their on-screen captions:

| Time | What's shown | Caption overlay |
|---|---|---|
| 0:00 | Open https://deelbot.ai/auth/login in a clean browser | "DeelBot — SaaS for licensed Realtors in Canada" |
| 0:10 | Sign in as `meta-review@deelbot.ai` | |
| 0:20 | Click "Facebook" in left nav. Land on /admin/facebook | "Tenants connect their own Facebook Page" |
| 0:25 | Hold on the consent panel for 4-5 seconds | "Scopes are explained before any consent dialog" |
| 0:35 | Click "Login with Facebook" — OAuth popup appears | "pages_show_list, pages_manage_posts, pages_read_engagement" |
| 0:45 | Approve all permissions | |
| 0:50 | Page picker dialog appears. Select a Page. Click "Connect Page" | "pages_show_list returns the list of Pages" |
| 1:00 | Connected state shows the Page name + token expiry. Click "Test" | |
| 1:10 | Navigate to /admin/properties. Open a listing. Click "Post to Facebook" | "Posts only publish when the tenant clicks Post" |
| 1:20 | Composer fills with property details + photos. Edit caption | |
| 1:30 | Click "Post". Success receipt with FB post ID | "pages_manage_posts publishes to the tenant's own Page" |
| 1:35 | Click link → open Facebook Page → see post is live | "Posts go to the tenant's Page, never to AOhomes' or any other tenant's" |
| 1:50 | Back to /admin/facebook. Click "Disconnect" | "Tenant can revoke at any time" |
| 2:00 | END | |

---

## 4. Submission cross-reference — paste-points

Quick map from this document to the Meta dashboard fields.

| Meta field | Source in this doc |
|---|---|
| App Review → Reviewer Instructions → testing instructions | Section 2 (the `````-fenced block) |
| App Review → Reviewer Instructions → screencast URL | Section 3 |
| App Settings → Basic → Privacy Policy URL | `https://deelbot.ai/privacy` |
| App Settings → Basic → Terms of Service URL | `https://deelbot.ai/terms` |
| App Settings → Basic → Data deletion instructions URL | `https://deelbot.ai/facebook/deletion-status` |
| App Settings → Webhooks → Deauthorize Callback URL | `https://deelbot.ai/api/facebook/deauthorize` |
| App Settings → Webhooks → Data Deletion Request URL | `https://deelbot.ai/api/facebook/data-deletion` |
| Data Handling → responsible-1 | `17129629 CANADA INC.` (or your exact incorp name) |
| Data Handling → processors | `Hetzner Online GmbH` (Germany, IT), `DeelBot` (Canada, IT) |
| Data Handling → requests-4 | Check all four (review legality, challenge unlawful, data min, documentation) |

---

## 5. After approval — annual re-review checklist

Meta runs an annual Data Use Checkup. When you receive the email
(usually around the 12-month anniversary of approval), come back to
this file and:

- [ ] Verify the reviewer test account still works — log in fresh
- [ ] Verify the connected Facebook Page is still connected
- [ ] Re-record the screencast if any UI element has materially
      changed (button label, layout, navigation)
- [ ] Update the `Last verified working` date in Section 2
- [ ] Re-submit through the Data Use Checkup form

Most apps are approved on the re-review within hours because Meta
already has the previous evidence on file.
