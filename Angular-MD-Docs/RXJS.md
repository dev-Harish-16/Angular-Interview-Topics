# RxJS Cheat Sheet

## 1. Observable
Lazy, cold by default — nothing runs until `.subscribe()`. Each subscribe = independent execution.

```typescript
const obs$ = new Observable<number>(sub => {
  sub.next(1);
  sub.complete();
});
obs$.subscribe(v => console.log(v));
```

| Property | Behavior |
|---|---|
| Execution | Lazy — runs only on subscribe |
| Multiplicity | Cold/unicast — each subscriber gets a fresh run |
| Values | 0 to many `next()`, then `error()` or `complete()` |
| Cancellation | `.unsubscribe()` — Promises can't do this |

```typescript
// Observable vs Promise
new Promise(res => { console.log('runs immediately'); res(1); });      // eager
new Observable(sub => { console.log('runs on subscribe'); sub.next(1); }); // lazy

firstValueFrom(obs$);  // Observable -> Promise (first value)
lastValueFrom(obs$);   // Observable -> Promise (value on complete)
defer(() => fetch(url)); // Promise creation delayed until subscribe (unlike from(promise))
```

---

## 2. Subject
Observer + Observable combined. Hot, multicast, no memory by default.

```typescript
const subject$ = new Subject<number>();
subject$.subscribe(v => console.log('A', v));
subject$.next(1);                     // A: 1
subject$.subscribe(v => console.log('B', v)); // subscribes late
subject$.next(2);                     // A: 2, B: 2 (B missed the 1)
```

Hide behind `asObservable()` in services so consumers can't call `.next()`:
```typescript
private _x$ = new Subject<T>();
x$ = this._x$.asObservable(); // read-only outward view
```

### Subject variants

| Type | Memory | Needs initial value | Use case |
|---|---|---|---|
| `Subject` | none | no | event bus, fire-and-forget |
| `BehaviorSubject` | last value | yes | live state (auth, theme, current user) |
| `ReplaySubject(n)` | last N values | no | activity feed, recent logs |
| `AsyncSubject` | only final value, on `complete()` | no | final result of long-running op |

```typescript
const bs$ = new BehaviorSubject(0);
bs$.getValue();      // synchronous read — only BehaviorSubject can do this

const rs$ = new ReplaySubject(2);   // buffers last 2
new ReplaySubject(2, 5000);          // last 2, only if within 5s window

const as$ = new AsyncSubject();
as$.next(1); as$.next(2); as$.complete(); // only emits 2, only after complete
```

---

## 3. Multicasting
Sharing one execution across multiple subscribers — fixes duplicate HTTP calls / duplicate side effects.

```typescript
// share() — live sharing only, no memory of past values
const shared$ = this.http.get('/api/user').pipe(share());

// shareReplay(n) — sharing + replay of last n values for late subscribers
const cached$ = this.http.get('/api/config').pipe(
  shareReplay({ bufferSize: 1, refCount: true }) // ALWAYS use refCount:true to avoid leaks
);
```

| | `share()` | `shareReplay(n)` |
|---|---|---|
| Late subscriber | gets nothing if source already completed | gets last `n` cached values |
| Leak risk | low | high without `refCount: true` |
| Typical use | live/ongoing stream (WebSocket) | cache a one-off HTTP call |

Manual control:
```typescript
const ticks$ = interval(1000).pipe(multicast(() => new Subject())) as ConnectableObservable<number>;
ticks$.subscribe(...); // registers, doesn't start
ticks$.connect();      // NOW it starts, shared by all subscribers
```

### `shareReplay` vs `BehaviorSubject` for caching
| | `shareReplay` | `BehaviorSubject` pattern |
|---|---|---|
| Trigger | Lazy — fires on first subscribe | Eager — fires immediately (e.g. in constructor) |
| Initial/null state | None needed | Needs initial value (often `null`), forces null-checks |
| Refetch/invalidate | No built-in method, re-create pipe | Explicit `.next()` call whenever you want |
| Error propagation | Errors propagate to all subscribers, tears down cache | Error in source `subscribe()` doesn't auto-propagate |
| Best for | Caching the output of a one-off async call | Modeling live state mutated over time |

**Rule of thumb:** caching an async result → `shareReplay`. Modeling state that changes over time → `BehaviorSubject`.

---

## 4. Hot vs Cold

| | Cold | Hot |
|---|---|---|
| Trigger | Subscribing **causes** the work | Work happens regardless of subscribers |
| Late subscriber | Gets everything from the start | Misses what already happened (unless Behavior/ReplaySubject) |
| Examples | `HttpClient.get()`, `of()`, `interval()`, `from()` | `Subject`, `fromEvent()`, WebSocket |
| Convert cold → hot | — | `.pipe(share())` / `.pipe(shareReplay(n))` |

**One-line test:** *"Does subscribing cause the work, or is it already happening?"*

```typescript
const cold$ = interval(1000);          // each subscriber = own timer
const hot$ = cold$.pipe(share());      // all subscribers share ONE timer
```

---

## 5. Operators

### Creation (no source needed)
```typescript
of(1, 2, 3)
from([1, 2, 3])            // array / promise / iterable
from(fetch('/api'))
interval(1000)              // never completes
timer(2000, 1000)
fromEvent(el, 'click')
```

### Pipeable — everyday toolkit
```typescript
map(x => x * 2)                                  // transform value
filter(x => x > 0)                                // keep matching values
tap(v => console.log(v))                           // side effect only
debounceTime(300)                                   // wait for pause before emitting
distinctUntilChanged()                               // skip consecutive dupes
take(5)                                               // complete after N values
takeUntil(this.destroy$)                               // unsubscribe on signal (Angular cleanup)
scan((acc, v) => acc + v, 0)                            // running accumulator
startWith(false)                                         // seed initial value
catchError(err => of(fallback))                           // recover from error
retry(3)                                                    // resubscribe N times on error
combineLatest([a$, b$])                                      // emit on any source, latest of all
withLatestFrom(other$)                                        // emit on source tick + latest of other
```

### Order = execution order
```typescript
search$.pipe(
  debounceTime(300),      // 1. cut noise
  filter(v => v.length > 2), // 2. skip short input
  distinctUntilChanged(),      // 3. dedupe
  switchMap(term => api.search(term)) // 4. call API
);
```

### Marble diagram notation
```
source: ---1---2---3---4---5|
         map(x => x * 10)
result: ---10--20--30--40--50|
```
`|` = complete · `X` = error · digits/letters = values · `-` = time passing

---

## Quick decision guides

**Which Subject?**
- Fire-and-forget event → `Subject`
- Current value matters, even to late subscribers → `BehaviorSubject`
- Need history of last N events → `ReplaySubject`
- Only care about final settled result → `AsyncSubject`

**shareReplay vs BehaviorSubject?**
- Caching one async call's output → `shareReplay({ bufferSize: 1, refCount: true })`
- Live app state mutated from multiple places → `BehaviorSubject`

**Cold or Hot?**
- Subscribing triggers the work → Cold
- Work exists independently of subscribers → Hot