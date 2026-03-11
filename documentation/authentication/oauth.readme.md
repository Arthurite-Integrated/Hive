# OAuth Callback Response Page

This project returns an HTML response page from the OAuth callback endpoint.

## Supported Providers

- Google
- Facebook

## Flow Overview

OAuth in this project is popup-based:

1. Frontend opens a popup window pointed at the initiate endpoint (`/api/v1/auth/google` or `/api/v1/auth/facebook`).
2. Server generates a provider auth URL and returns it - frontend redirects the popup to it.
3. After the user authorizes, the provider redirects to the callback URL.
4. Server exchanges the auth code for tokens, creates or updates the user, builds an HTML response page, and sends it.
5. The callback page posts the result payload to the parent window via `postMessage`, then closes the popup.
6. The parent window receives the message and stores tokens / navigates.

## Endpoints

### Google

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/auth/google` | Initiate - returns a `{ url }` JSON response. Open the URL in a popup. |
| `GET` | `/api/v1/auth/google/login/callback` | Login callback - called by Google; returns HTML response page. |
| `GET` | `/api/v1/auth/google/signup/callback` | Signup callback - called by Google; returns HTML response page. |

### Facebook

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/auth/facebook` | Initiate - returns a `{ url }` JSON response. Open the URL in a popup. |
| `GET` | `/api/v1/auth/facebook/login/callback` | Login callback - called by Facebook; returns HTML response page. |
| `GET` | `/api/v1/auth/facebook/signup/callback` | Signup callback - called by Facebook; returns HTML response page. |

## Query Parameters

### Initiate Request

Both `/api/v1/auth/google` and `/api/v1/auth/facebook` require:

| Parameter | Type | Required | Values |
|-----------|------|----------|--------|
| `userType` | string | yes | `instructor`, `parent`, `student` |
| `action` | string | yes | `login`, `signup` |

### Callback Request

These are set by the provider and forwarded automatically. You do not send these manually.

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | Authorization code from the provider |
| `state` | string | Base64-encoded `userType` passed through from the initiate request |

## Notes About Facebook Email Permission

Facebook does not always return an email address. If the user's account has no email or the permission was not granted, the signup/login flow will fail with a bad request error. Ensure the app requests `email` in its Facebook app permissions config.

## Notes About Window Closing

`window.close()` only works reliably when the callback page was opened by script (for example, via `window.open`).
If users navigate directly to the callback URL, most browsers will block automatic closing.

The page can:

- post OAuth result data to the opener window using `window.opener.postMessage(payload, "*")`
- attempt to auto-close after 2 seconds
- show a fallback message (`You can close this window now.`) if the browser blocks `window.close()`

## Payload Sent To Frontend

The backend sends one of the payloads below via `postMessage`.

### Success Payload

```json
{
  "type": "oauth_success",
  "user": { "...": "authenticated user object" },
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token"
}
```

### Error Payload

```json
{
  "type": "oauth_error",
  "code": "AUTHENTICATION_FAILED"
}
```

Common error codes currently used:

- `AUTHENTICATION_FAILED` - provider token exchange failed
- `ACCOUNT_EXISTS` - account already registered (signup), or account not linked with this provider (login)
- `ACCOUNT_NOT_FOUND` - no account found with this email during login (Facebook)

## Frontend Listener Example

```javascript
window.addEventListener("message", (event) => {
  // Validate event.origin in production before trusting message data.
  if (event.data?.type === "oauth_success") {
    storeTokens(event.data.accessToken, event.data.refreshToken);
    router.push("/dashboard");
    return;
  }

  if (event.data?.type === "oauth_error") {
    showToast("OAuth failed. Please try again.");
  }
});
```
