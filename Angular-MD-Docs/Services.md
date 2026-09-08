# Angular Services — Deep Dive

## 1. What a Service Actually Is

A service is just a plain class marked `@Injectable()` — no special runtime magic. Angular's DI system decides **when to create it** and **how many instances exist**. The `@Injectable` decorator itself does almost nothing except enable Angular to inject dependencies _into_ it via metadata.

```typescript
@Injectable({ providedIn: "root" })
export class UserService {
  private users: User[] = [];
  getUsers() {
    return this.users;
  }
}
```

Without a class-level dependency injected, `@Injectable()` is technically optional — but always add it; omitting it breaks the moment you inject something into the service later, and tooling/AOT expects it.

---

## 2. `providedIn` — where the service lives in the injector tree

| `providedIn` value                    | Scope                                                   | Instance count           |
| ------------------------------------- | ------------------------------------------------------- | ------------------------ |
| `'root'`                              | App-wide singleton                                      | 1 per app                |
| `'platform'`                          | Shared across multiple Angular apps on same page        | 1 per platform           |
| `'any'`                               | New instance per lazy-loaded module, singleton in eager | Varies                   |
| `SomeModule`                          | Only available if that module is loaded                 | 1 per module load        |
| (none, only in component `providers`) | Scoped to that component + its children                 | 1 per component instance |

```typescript
@Injectable({ providedIn: "root" }) // most common — tree-shakable singleton
export class AuthService {}

@Injectable({ providedIn: "any" }) // rare — per-lazy-module instance
export class FeatureCacheService {}
```

### Why `providedIn: 'root'` beats `providers: [UserService]` in `AppModule`

```typescript
// OLD WAY — module-level provider
@NgModule({ providers: [UserService] })
export class AppModule {}

// MODERN WAY — tree-shakable
@Injectable({ providedIn: "root" })
export class UserService {}
```

`providedIn: 'root'` is **tree-shakable** — if nothing in your app ever injects `UserService`, it's stripped from the production bundle entirely. Module-array providers are NOT tree-shaken; they ship even if unused.

---

## 3. Component-level providers — creating scoped instances

```typescript
@Component({
  selector: "app-shopping-cart",
  providers: [CartService], // NEW instance per <app-shopping-cart> element
})
export class ShoppingCartComponent {
  constructor(private cart: CartService) {}
}
```

Every instance of `<app-shopping-cart>` gets its **own** `CartService` — separate state, not shared with other cart components on the page. Child components of `ShoppingCartComponent` also share that same scoped instance (unless they redeclare their own).

### Real use case: multi-instance widgets

```typescript
@Component({
  selector: "app-chat-widget",
  providers: [ChatSessionService], // each chat window = isolated session state
})
export class ChatWidgetComponent {}
```

```html
<app-chat-widget></app-chat-widget>
<!-- session A -->
<app-chat-widget></app-chat-widget>
<!-- session B, completely separate -->
```

If `ChatSessionService` were `providedIn: 'root'` instead, both widgets would share the same session — usually wrong for this use case.

---

## 4. `viewProviders` vs `providers` — subtle but important

```typescript
@Component({
  selector: 'app-parent',
  providers: [SharedService],      // available to parent AND its content-projected children
  viewProviders: [SharedService]   // available ONLY to parent's own template children (view), NOT <ng-content>
})
```

`viewProviders` is rare — mostly relevant for component library authors controlling exactly what content-projected children can access.

---

## 5. Singleton pitfalls — the "service exists but state leaks" trap

```typescript
@Injectable({ providedIn: "root" })
export class FormStateService {
  data: any = {};
}
```

If two unrelated feature pages both inject `FormStateService` expecting fresh state, they'll **share the same object** — stale data from Page A leaks into Page B. Fix: either scope it to the component/route (`providers: [FormStateService]` on the routed component), or explicitly `reset()` it on navigation.

```typescript
@Injectable({ providedIn: "root" })
export class FormStateService {
  private initial = { name: "", email: "" };
  data = { ...this.initial };
  reset() {
    this.data = { ...this.initial };
  }
}
```

```typescript
ngOnDestroy() { this.formState.reset(); } // call on route leave
```

---

## 6. HttpClient patterns — the most common service type

```typescript
@Injectable({ providedIn: "root" })
export class UserApiService {
  private http = inject(HttpClient);
  private base = "/api/users";

  getAll(): Observable<User[]> {
    return this.http.get<User[]>(this.base);
  }

  getById(id: string): Observable<User> {
    return this.http.get<User>(`${this.base}/${id}`);
  }

  create(user: Partial<User>): Observable<User> {
    return this.http.post<User>(this.base, user);
  }
}
```

### Caching pattern (avoid duplicate HTTP calls)

```typescript
@Injectable({ providedIn: "root" })
export class UserApiService {
  private http = inject(HttpClient);
  private cache$?: Observable<User[]>;

  getAll(): Observable<User[]> {
    if (!this.cache$) {
      this.cache$ = this.http.get<User[]>("/api/users").pipe(
        shareReplay(1), // cache the result, share across all subscribers
      );
    }
    return this.cache$;
  }
}
```

### Retry + error handling pattern

```typescript
getAll(): Observable<User[]> {
  return this.http.get<User[]>('/api/users').pipe(
    retry(2),
    catchError(err => {
      console.error('Failed to load users', err);
      return of([]); // fallback empty array
    })
  );
}
```

---

## 7. Service-to-service communication (state sharing without a store)

```typescript
@Injectable({ providedIn: "root" })
export class NotificationService {
  private messageSubject = new Subject<string>();
  message$ = this.messageSubject.asObservable();

  notify(msg: string) {
    this.messageSubject.next(msg);
  }
}
```

```typescript
// Service A triggers
@Injectable({ providedIn: "root" })
export class OrderService {
  private notifications = inject(NotificationService);
  placeOrder() {
    // ...
    this.notifications.notify("Order placed successfully");
  }
}
```

```typescript
// Component B listens
export class ToastComponent {
  private notifications = inject(NotificationService);
  constructor() {
    this.notifications.message$.subscribe((msg) => this.showToast(msg));
  }
}
```

Classic **pub/sub via a shared injectable Subject** — no NgRx needed for simple cross-component events.

---

## 8. Signal-based service state (Angular 16+, modern pattern)

```typescript
@Injectable({ providedIn: "root" })
export class CartService {
  private itemsSignal = signal<CartItem[]>([]);
  items = this.itemsSignal.asReadonly(); // expose read-only outward
  total = computed(() =>
    this.itemsSignal().reduce((sum, i) => sum + i.price * i.qty, 0),
  );

  addItem(item: CartItem) {
    this.itemsSignal.update((items) => [...items, item]);
  }

  removeItem(id: string) {
    this.itemsSignal.update((items) => items.filter((i) => i.id !== id));
  }
}
```

```html
<!-- component template -->
<p>Total: {{ cart.total() }}</p>
<div *ngFor="let item of cart.items()">{{ item.name }}</div>
```

This pattern is increasingly replacing small NgRx stores for local/feature-level state — reactive, no boilerplate actions/reducers, but still centralizes state in one injectable.

---

## 9. Factory Providers — conditional/computed service creation

```typescript
export function loggerFactory(config: AppConfig): LoggerService {
  return config.production
    ? new RemoteLoggerService()
    : new ConsoleLoggerService();
}

providers: [
  {
    provide: LoggerService,
    useFactory: loggerFactory,
    deps: [APP_CONFIG],
  },
];
```

Or with `inject()`:

```typescript
providers: [
  {
    provide: LoggerService,
    useFactory: () => {
      const config = inject(APP_CONFIG);
      return config.production
        ? new RemoteLoggerService()
        : new ConsoleLoggerService();
    },
  },
];
```

---

## 10. `APP_INITIALIZER` — service logic that must run before app starts

```typescript
export function initializeApp(configService: ConfigService) {
  return () => configService.loadConfig(); // returns a Promise/Observable
}

providers: [
  {
    provide: APP_INITIALIZER,
    useFactory: initializeApp,
    deps: [ConfigService],
    multi: true,
  },
];
```

Common real use: fetch remote config/feature flags before any component renders, so services depending on that config aren't racing against an unresolved HTTP call.

---

## 11. Service Lifecycle — `OnDestroy` in a service

Services can implement `ngOnDestroy()` — fires when the **injector that created them** is destroyed (relevant for component-scoped or lazy-module-scoped services; root services live for the app's lifetime and rarely see this fire before app close).

```typescript
@Injectable()
export class PollingService implements OnDestroy {
  private intervalId = setInterval(() => this.poll(), 5000);
  poll() {
    /* ... */
  }
  ngOnDestroy() {
    clearInterval(this.intervalId);
  }
}
```

```typescript
@Component({ providers: [PollingService] }) // scoped — cleans up when component destroys
export class DashboardComponent {}
```

---

## 12. Testing Services

```typescript
describe("UserApiService", () => {
  let service: UserApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserApiService],
    });
    service = TestBed.inject(UserApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it("fetches users", () => {
    service.getAll().subscribe((users) => {
      expect(users.length).toBe(2);
    });
    const req = httpMock.expectOne("/api/users");
    req.flush([{ id: 1 }, { id: 2 }]);
  });

  afterEach(() => httpMock.verify());
});
```

### Mocking a service dependency

```typescript
const mockAuth = { isLoggedIn: () => true };
TestBed.configureTestingModule({
  providers: [{ provide: AuthService, useValue: mockAuth }],
});
```

---

## 13. Real-world service architecture (typical enterprise layering)

```
Component
   ↓ calls
Facade Service (orchestrates, exposes clean API to components)
   ↓ calls
API Service (raw HttpClient calls)
   ↓ calls
State Service (signal/BehaviorSubject store)
```

```typescript
// API layer — pure HTTP
@Injectable({ providedIn: "root" })
export class OrderApiService {
  private http = inject(HttpClient);
  fetchOrders() {
    return this.http.get<Order[]>("/api/orders");
  }
}

// State layer — holds data
@Injectable({ providedIn: "root" })
export class OrderStateService {
  private ordersSignal = signal<Order[]>([]);
  orders = this.ordersSignal.asReadonly();
  setOrders(orders: Order[]) {
    this.ordersSignal.set(orders);
  }
}

// Facade — what components actually talk to
@Injectable({ providedIn: "root" })
export class OrderFacadeService {
  private api = inject(OrderApiService);
  private state = inject(OrderStateService);
  orders = this.state.orders;

  loadOrders() {
    this.api.fetchOrders().subscribe((orders) => this.state.setOrders(orders));
  }
}
```

```typescript
@Component({...})
export class OrdersPageComponent {
  private facade = inject(OrderFacadeService);
  orders = this.facade.orders;
  ngOnInit() { this.facade.loadOrders(); }
}
```

Component never touches `HttpClient` or raw state directly — clean separation, each layer independently testable.

---

## 14. Quick decision guide

| Need                                             | Approach                                     |
| ------------------------------------------------ | -------------------------------------------- |
| App-wide shared state/logic                      | `@Injectable({ providedIn: 'root' })`        |
| Fresh instance per component/widget              | `providers: [Service]` on that component     |
| Cross-component event bus                        | `Subject`/`Observable` inside a root service |
| Reactive local state, less boilerplate than NgRx | Signal-based service (`signal`, `computed`)  |
| Conditional service creation (env-based)         | `useFactory`                                 |
| Must resolve before app renders                  | `APP_INITIALIZER`                            |
| Clean layering for large features                | API service → State service → Facade service |
| Avoid duplicate HTTP calls                       | `shareReplay(1)` on cached Observable        |

## 15. One-sentence summary

> A service is just an `@Injectable` class — its **power comes entirely from where Angular's DI decides to scope it** (`root`, module, or component), and modern practice favors `providedIn: 'root'` for tree-shaking, signals for reactive state instead of manual `BehaviorSubject` boilerplate, and a facade layer to keep components decoupled from raw HTTP/state logic.
