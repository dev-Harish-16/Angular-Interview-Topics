# Angular Router & HTTP Query Params — Interview Cheat Sheet

## 1. `router.navigate()` vs `router.createUrlTree()`

| API                      | Purpose                          | Navigates? | Returns            | Common use                    |
| ------------------------ | -------------------------------- | ---------: | ------------------ | ----------------------------- |
| `router.navigate()`      | Performs navigation              |         ✅ | `Promise<boolean>` | Component/service navigation  |
| `router.createUrlTree()` | Builds a route representation    |         ❌ | `UrlTree`          | Guards, building URLs         |
| `router.serializeUrl()`  | Converts `UrlTree` to URL string |         ❌ | `string`           | `window.open()`, browser APIs |

### `navigate()`

```ts
this.router.navigate(["/products", 101], {
  queryParams: {
    tab: "reviews",
  },
});
```

Result:

```text
/products/101?tab=reviews
```

Use when you want Angular Router to **navigate in the current tab**.

---

### `createUrlTree()`

```ts
const tree = this.router.createUrlTree(["/products", 101], {
  queryParams: {
    tab: "reviews",
  },
});
```

Important: this **does not navigate**.

Think:

```text
navigate()       → Go there
createUrlTree()  → Describe/build the destination
```

---

## 2. Why return `UrlTree` from a guard?

### Preferred

```ts
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(["/login"]);
};
```

### Why?

Returning a `UrlTree` lets Angular Router handle the **redirect as part of the current navigation flow**.

Avoid this pattern in a guard when possible:

```ts
router.navigate(["/login"]);
return false;
```

That starts a separate navigation and cancels the current one.

---

## 3. `serializeUrl()`

Converts:

```text
UrlTree → URL string
```

Example:

```ts
const tree = this.router.createUrlTree(["/products", 101], {
  queryParams: {
    name: "laptop",
    sort: "price",
  },
});

const url = this.router.serializeUrl(tree);

console.log(url);
```

Output:

```text
/products/101?name=laptop&sort=price
```

It **does not navigate**.

---

## 4. Open an Angular route in a new tab

### TypeScript approach

```ts
const tree = this.router.createUrlTree(["/products", 101], {
  queryParams: {
    name: "laptop",
    category: "electronics",
    sort: "price",
  },
});

const url = this.router.serializeUrl(tree);

window.open(url, "_blank");
```

Flow:

```text
createUrlTree()
      ↓
   UrlTree
      ↓
serializeUrl()
      ↓
   URL string
      ↓
window.open()
      ↓
   New tab
```

### Template alternative

For a normal link, this is simpler:

```html
<a
  [routerLink]="['/products', 101]"
  [queryParams]="{
    name: 'laptop',
    category: 'electronics',
    sort: 'price'
  }"
  target="_blank"
>
  Open Product
</a>
```

---

## 5. Router Query Parameters

Syntax:

```text
/path/:id?key1=value1&key2=value2
```

Example:

```text
/products/101?name=laptop&category=electronics&sort=price
```

### Passing query params

```ts
this.router.navigate(["/products", 101], {
  queryParams: {
    name: "laptop",
    category: "electronics",
    sort: "price",
  },
});
```

### Reading query params

```ts
this.route.queryParamMap.subscribe((params) => {
  const name = params.get("name");
  const category = params.get("category");
  const sort = params.get("sort");
});
```

### Snapshot

```ts
const name = this.route.snapshot.queryParamMap.get("name");
```

Use the observable when you need to react to query-param changes.

---

## 6. HTTP Query Parameters with `HttpClient`

For HTTP requests, use the `params` option.

```ts
this.http.get("/api/products", {
  params: {
    page: 1,
    pageSize: 20,
    sort: "price",
  },
});
```

Request:

```text
GET /api/products?page=1&pageSize=20&sort=price
```

### Dynamic values

```ts
getProducts(page: number, search: string, status: string) {
  return this.http.get('/api/products', {
    params: {
      page,
      search,
      status
    }
  });
}
```

---

## 7. `HttpParams`

Useful when building parameters dynamically or conditionally.

```ts
const params = new HttpParams()
  .set("page", "1")
  .set("pageSize", "20")
  .set("sort", "price");

this.http.get("/api/products", { params });
```

### Important: `HttpParams` is immutable

❌ Wrong:

```ts
let params = new HttpParams();
params.set("page", "1");
```

✅ Correct:

```ts
let params = new HttpParams();
params = params.set("page", "1");
```

Each `set()` returns a **new `HttpParams` instance**.

---

## 8. `URLSearchParams` Alternative

Useful when you are manually preparing a browser URL.

```ts
const params = new URLSearchParams({
  name: "laptop",
  category: "electronics",
  sort: "price",
});

const url = `/products/101?${params.toString()}`;
window.open(url, "_blank");
```

Output:

```text
/products/101?name=laptop&category=electronics&sort=price
```

---

## 9. Large Query Parameters

Avoid putting a very large JSON payload into the URL when possible.

### Less ideal

```ts
queryParams: {
  filter: JSON.stringify(largeObject);
}
```

Potential problems:

- URL length limits across browsers/servers/proxies
- Data is visible in the URL
- May appear in browser history and logs
- Not suitable for sensitive information

### Better pattern

```text
Large state
   ↓
Save state / filter
   ↓
Generate small ID
   ↓
/products?filterId=abc123
   ↓
Load the state using that ID
```

---

## 10. Router vs HTTP Query Params

| Scenario                    | Syntax           |
| --------------------------- | ---------------- |
| Router navigation           | `queryParams`    |
| HTTP request                | `params`         |
| Dynamic HTTP params         | `HttpParams`     |
| Convert `UrlTree` to string | `serializeUrl()` |
| Open URL in new tab         | `window.open()`  |

### Router

```ts
this.router.navigate(["/products"], {
  queryParams: { page: 2, sort: "price" },
});
```

### HTTP

```ts
this.http.get("/api/products", {
  params: { page: 2, sort: "price" },
});
```

---

# Interview One-Liners

### `navigate()`

> Used to actually trigger navigation through Angular Router.

### `createUrlTree()`

> Builds Angular's `UrlTree` representation of a destination without navigating.

### `serializeUrl()`

> Converts a `UrlTree` into a URL string.

### `navigateByUrl()`

> Navigates using a URL string or `UrlTree` in the current tab.

### `HttpClient params`

> Used to send query parameters with an HTTP request.

### `HttpParams`

> An immutable Angular class for constructing HTTP query parameters.

---

# Memory Trick

```text
ROUTER

navigate()       → ACTUALLY GO
createUrlTree()  → BUILD ROUTE
serializeUrl()   → CONVERT TO STRING
window.open()    → OPEN NEW TAB

HTTP

params           → SEND QUERY PARAMS
HttpParams       → BUILD HTTP PARAMS
```
