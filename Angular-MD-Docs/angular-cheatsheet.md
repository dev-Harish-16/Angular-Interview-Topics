# Angular Performance & Core Concepts Cheatsheet

## 1. Change Detection Optimization

```typescript
@Component({ changeDetection: ChangeDetectionStrategy.OnPush })
```

```typescript
// Signals avoid CD entirely for reads
count = signal(0);
doubled = computed(() => this.count() * 2);
```

```html
@for (item of items; track item.id) { ... }
```

- Avoid method calls in templates — use pure pipes or computed signals instead.
- Use `async` pipe over manual `.subscribe()` (auto unsub + triggers CD correctly).
- `takeUntilDestroyed()` (v16+) instead of manual `Subject` teardown.

---

## 2. Bundle Size

```bash
ng build --configuration production --stats-json
npx webpack-bundle-analyzer dist/<project>/stats.json
```

**angular.json budgets:**
```json
"budgets": [
  { "type": "initial", "maximumWarning": "500kb", "maximumError": "1mb" },
  { "type": "anyComponentStyle", "maximumWarning": "4kb", "maximumError": "8kb" }
]
```

| Budget type | Checks |
|---|---|
| `bundle` | specific named bundle |
| `initial` | main initial bundle (JS+CSS) |
| `allScript` | all scripts combined |
| `all` | entire app |
| `anyComponentStyle` | each component style file individually |
| `anyScript` | any individual JS file |
| `any` | any individual file |

**Terminal output on breach:**
```
▲ [WARNING] budgets exceeded for component "dashboard.component.scss"
Maximum: 4.00 kB
Actual:  5.23 kB
```
- `maximumWarning` → build succeeds, logs warning
- `maximumError` → build fails, exit code 1

**Check stats.json manually:**
```bash
cat dist/*/stats.json | jq '.assets | sort_by(.size) | reverse | .[0:10]'
```

---

## 3. Lazy Loading

```typescript
{ path: 'feature', loadComponent: () => import('./feature.component').then(m => m.FeatureComponent) }
```

```html
@defer (on viewport) {
  <heavy-widget />
} @placeholder {
  <div>Loading...</div>
}
```

---

## 4. Audit Checklist

```bash
ng version                          # check outdated Angular/CLI
npm outdated
npm audit --audit-level=high        # dependency vulnerabilities
npx madge --circular src            # circular deps
npx tsc --noEmit                    # strict mode violations
grep -rn "innerHTML" src/app --include=*.ts
grep -rn "bypassSecurityTrust" src/app --include=*.ts
grep -rn "eval(\|new Function(" src/app
grep -rn "ngZone.run(\|runOutsideAngular" src/app --include=*.ts
```

**Report table format:**
| Area | Finding | Severity | Effort | Recommendation |
|---|---|---|---|---|
| Bundle | Initial chunk 1.8MB | High | Medium | Lazy-load reports module |
| CD | 40% components missing OnPush | Medium | Low | Bulk migration |

---

## 5. HTTP Interceptors

**Functional (v15+):**
```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  if (token) req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  return next(req); // proceeds to next interceptor / backend
};
```

**Register:**
```typescript
provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))
```

**Class-based (legacy):**
```typescript
intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
  return next.handle(req.clone({...})); // must always call next.handle()
}
```
⚠️ Every branch must call `next.handle()`/`next()` or return a substitute Observable — else request hangs.

---

## 6. NgZone

```typescript
constructor(private ngZone: NgZone) {}

// Skip CD for high-frequency ops (scroll, websocket, setInterval)
this.ngZone.runOutsideAngular(() => {
  window.addEventListener('scroll', this.onScroll);
});

// Re-enter zone only when template-bound state changes
this.ngZone.run(() => {
  this.criticalAlert = data; // used in template → needs zone.run()
});
```

**Rule of thumb:**
| Action | Needs `zone.run()`? |
|---|---|
| `this.prop = x` used in `{{ }}` / `[binding]` / `*ngIf` | ✅ Yes |
| `signal.set(x)` | ❌ No |
| `renderer.setStyle()` / direct DOM write | ❌ No |
| `renderer.addClass()` | ❌ No |

---

## 7. provideZoneChangeDetection

```typescript
// app.config.ts
providers: [
  provideZoneChangeDetection({ eventCoalescing: true, runCoalescing: true }),
]
```

- **Defaults:** `eventCoalescing: false`, `runCoalescing: false`
- `eventCoalescing: true` → batches multiple DOM events in same cycle into ONE CD run.
- `runCoalescing: true` (v18+) → batches multiple `ngZone.run()` calls similarly.
- Zero code changes, safe app-wide default — **except** for components with high-frequency events assuming immediate CD (e.g. PDF viewers) → can cause load regressions if not isolated via `runOutsideAngular`.

**Interview one-liner:**
> "Merges multiple DOM-event-triggered change detection cycles into a single cycle, reducing unnecessary re-renders — free performance win, no code changes, but can regress components with event bursts unless isolated with runOutsideAngular."

---

## 8. Zoneless Change Detection

```typescript
provideExperimentalZonelessChangeDetection() // v18: experimental
provideZonelessChangeDetection()             // v20.2+: stable
```

- **v21+: zoneless is default for NEW apps** (`ng new`).
- Existing apps keep whatever provider is already in `app.config.ts` — `ng update` doesn't force the switch.
- To force zone-based on a new app: `ng new my-app --zoneless=false`.
- To stay zone-based during migration: don't touch `provideZoneChangeDetection(...)`, keep `zone.js` in `angular.json` polyfills.

**Migration to zoneless — replace state mutations:**
```typescript
// ❌ Breaks silently in zoneless (no zone to re-enter)
this.ngZone.run(() => { this.criticalAlert = data; });

// ✅ Fix: signals (preferred)
criticalAlert = signal<Data | null>(null);
this.criticalAlert.set(data);

// ✅ Fix: manual CD (incremental migration)
this.criticalAlert = data;
this.cdr.markForCheck();
```

| Pattern found in code | Zoneless risk | Action |
|---|---|---|
| `runOutsideAngular` only | None (becomes no-op) | Safe to leave |
| `ngZone.run()` updating UI state | High — silently stops rendering | Convert to signal or `markForCheck()` |

---

## 9. Renderer2

```typescript
constructor(private renderer: Renderer2, private el: ElementRef) {}
```

| Method | Use |
|---|---|
| `setStyle(el, prop, value)` | inline CSS |
| `addClass` / `removeClass` | CSS classes |
| `setAttribute` / `removeAttribute` | HTML attributes |
| `setProperty` | DOM property |
| `createElement` / `appendChild` / `removeChild` | DOM node ops |
| `listen(el, event, cb)` | event listener — **returns unlisten fn, must call manually** |

```typescript
ngOnInit() {
  this.unlisten = this.renderer.listen(this.el.nativeElement, 'click', () => {});
}
ngOnDestroy() {
  this.unlisten(); // required — no auto cleanup
}
```

**Why not `nativeElement` directly:** breaks in SSR (no real DOM), no sanitization (XSS risk).

**Interview one-liner:**
> "Renderer2 is Angular's safe, platform-agnostic API for DOM manipulation — used instead of nativeElement to stay SSR-compatible and avoid XSS, with methods like setStyle, addClass, and listen."

---

## 10. Case Study: eventCoalescing PDF Viewer Regression

**Symptom:** Load time increased to 12s after migration enabled `eventCoalescing: true`.

**Root cause chain:**
1. PDF viewer fires burst of events per page render (paint, resize, intersection observer)
2. Coalescing batches these into fewer, larger CD cycles
3. Larger batched cycles block main thread longer
4. Synchronous DOM reads (canvas measurements) mismatch with delayed batched writes → retries
5. Cumulative delay across N pages → 12s load

**Short-term fix:** `eventCoalescing: false` globally (safe, reverts to default).

**Long-term fix:** isolate PDF viewer via `runOutsideAngular`, re-enable `eventCoalescing: true` globally without regression.
