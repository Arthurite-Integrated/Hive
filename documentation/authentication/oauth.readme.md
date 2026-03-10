# OAuth Callback Response Page

This project returns an HTML response page from the OAuth callback endpoint.

The page can:

- post OAuth result data to the opener window using `window.opener.postMessage(payload, "*")`
- attempt to auto-close after 2 seconds
- show a fallback message (`You can close this window now.`) if the browser blocks `window.close()`

## Notes About Window Closing

`window.close()` only works reliably when the callback page was opened by script (for example, via `window.open`).
If users navigate directly to the callback URL, most browsers will block automatic closing.

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

- `AUTHENTICATION_FAILED`
- `ACCOUNT_EXISTS`

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
		showToast("Google OAuth failed. Please try again.");
	}
});
```