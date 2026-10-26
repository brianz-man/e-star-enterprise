# Production secrets and deployment

## Treat the old credentials as compromised

Changing `.env` values does not remove credentials from Git history. Revoke or
rotate each credential with its provider, then update the deployment secrets.
Do not paste credentials into GitHub issues, chat, source files, or this guide.

Rotate:

- Database user password; update `DATABASE_URL` with the provider's new URL.
- JWT signing and refresh secrets; this signs users out and requires them to
  authenticate again.
- Cloudinary API secret/key.
- Safaricom Daraja consumer key/secret and passkey.
- Resend API key.
- M-Pesa callback secret.

Create long random application secrets locally, for example in PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Generate separate values for `JWT_SECRET`, `JWT_REFRESH_SECRET`, and
`MPESA_CALLBACK_SECRET`. Never reuse a provider credential as an application
secret. Revoke old credentials after the corresponding new value is active.

The repository's tracked `client/.env` in the checked history was empty. The
server `.env` is ignored and is not tracked in the checked repository history;
nevertheless, rotate any credential known to have been exposed elsewhere or
published in an earlier repository state. Rewriting history is not a substitute
for revocation and requires coordination with every collaborator and clone.

## Render API service

Set these in the Render service's Environment settings. Use the exact production
URLs, not local development values:

| Variable                 | Value                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `NODE_ENV`               | `production`                                                                          |
| `DATABASE_URL`           | Database provider URL with the rotated password                                       |
| `CLIENT_URL`             | Exact Vercel production origin; no trailing path                                      |
| `API_BASE_URL`           | Public Render API origin; HTTPS, no trailing slash                                    |
| `SERVE_CLIENT`           | `false` when Vercel serves the frontend                                               |
| `JWT_SECRET`             | New independent random secret                                                         |
| `JWT_REFRESH_SECRET`     | Another new independent random secret                                                 |
| `JWT_EXPIRES_IN`         | `15m`                                                                                 |
| `JWT_REFRESH_EXPIRES_IN` | `7d`                                                                                  |
| `JWT_REFRESH_TTL_MS`     | `604800000`                                                                           |
| `BCRYPT_ROUNDS`          | `12` or a measured higher value                                                       |
| `COOKIE_SAME_SITE`       | `none` for default Vercel/Render domains; see cookie note below                       |
| `CLOUDINARY_CLOUD_NAME`  | Cloudinary account cloud name                                                         |
| `CLOUDINARY_API_KEY`     | Rotated Cloudinary API key                                                            |
| `CLOUDINARY_API_SECRET`  | Rotated Cloudinary API secret                                                         |
| `MPESA_CONSUMER_KEY`     | Daraja key for the selected environment                                               |
| `MPESA_CONSUMER_SECRET`  | Daraja secret for the selected environment                                            |
| `MPESA_SHORTCODE`        | Production shortcode (or sandbox shortcode for staging)                               |
| `MPESA_PASSKEY`          | Matching Daraja passkey                                                               |
| `MPESA_ENV`              | `production` for live payments; `sandbox` only for staging                            |
| `MPESA_CALLBACK_SECRET`  | New random secret used to protect the callback                                        |
| `RESEND_API_KEY`         | Resend API key                                                                        |
| `EMAIL_FROM`             | Sender address on a verified Resend domain, e.g. `E-Star Orders <orders@example.com>` |
| `PRISMA_QUERY_LOG`       | `false`                                                                               |

Do not manually set `PORT` unless the Render service configuration requires it;
Render supplies the listening port.

With the default `*.vercel.app` and `*.onrender.com` domains, the API refresh
cookie is cross-site and requires `SameSite=None; Secure`. Browser third-party
cookie restrictions may still block it. For the most reliable authentication,
configure the frontend and API on subdomains of the same custom registrable
domain, then use `COOKIE_SAME_SITE=lax` (or `strict` after validating all flows).
The API CORS `CLIENT_URL` must still be the exact frontend origin.

## Vercel frontend

Set this in Vercel's Environment Variables for **Production**, then redeploy:

| Variable       | Value                                               |
| -------------- | --------------------------------------------------- |
| `VITE_API_URL` | `https://<your-render-service>.onrender.com/api/v1` |

`VITE_*` values are included in browser assets and are public. Never put secrets
in Vercel frontend variables. The frontend uses `/api/v1` as a same-origin
fallback for local proxy development.

## Resend verification and smoke test

1. Add and verify the sending domain in Resend, including its required DNS
   records. Use a sender address on that verified domain for `EMAIL_FROM`.
2. Set `RESEND_API_KEY` only in Render's server environment. Production startup
   now fails if it is missing.
3. Set `CLIENT_URL` on Render and `VITE_API_URL` on Vercel as shown above.
4. After both services deploy, request a password reset for a test account and
   register another test account. Confirm the reset and verification messages
   arrive, their links use the Vercel production origin, and each link can only
   be consumed once.
5. Check Render logs for email delivery failures without logging tokens or
   credentials.

The API already sends verification and password-reset email through Resend.
Email delivery failures are logged without disclosing whether an account exists
in the forgot-password response.

## Git history and deploy checks

After provider credentials are revoked, use the hosting platform's repository
secret-scanning tools and check all branches, tags, releases, and forks. If
history must be rewritten, coordinate a repository-wide filter-and-force-push
with collaborators; old clones and forks can still contain the former secrets.
Do not run a history rewrite as part of a routine deploy.

Apply reviewed database migrations with `npx prisma migrate deploy`, then
confirm Render `/health` and `/ready`, password reset/verification emails,
refresh-cookie behavior, and payment callbacks before enabling live payments.
