# Angular: ViewContainerRef, TemplateRef & Dynamic Views

## 1. Core Mental Model

| Concept            | Meaning                                                |
| ------------------ | ------------------------------------------------------ |
| `TemplateRef`      | **WHAT** to render                                     |
| `ViewContainerRef` | **WHERE** to render it                                 |
| `ViewChild`        | Find something in **my own template**                  |
| `ContentChild`     | Find something in **projected content** (`ng-content`) |
| `ElementRef`       | Reference to a **native DOM element**                  |

```
TemplateRef        → WHAT
ViewContainerRef   → WHERE
ViewChild          → MY VIEW
ContentChild       → PROJECTED CONTENT
ElementRef         → DOM
```

---

## 2. ViewChild vs ContentChild

**ViewChild** — accesses elements/components/templates inside the component's own template.

```ts
@ViewChild(ChildComponent) child!: ChildComponent;
@ViewChild('btn') button!: ElementRef<HTMLButtonElement>;
```

Used for: child component methods/properties, DOM elements, `TemplateRef`, `ViewContainerRef`.

**ContentChild** — accesses content projected via `<ng-content>`.

```html
<!-- Parent -->
<app-card><p #description>Hello</p></app-card>

<!-- Card template -->
<ng-content></ng-content>
```

```ts
@ContentChild('description') description!: ElementRef;
```

```
ViewChild    → component's own template
ContentChild → projected content
```

---

## 3. TemplateRef

Represents an Angular template definition. Declaring `<ng-template>` does **not** render it — it just defines what _could_ be rendered.

```html
<ng-template #hello><p>Hello Angular!</p></ng-template>
```

```ts
@ViewChild('hello') template!: TemplateRef<unknown>;
```

---

## 4. ViewContainerRef

Represents a location in Angular's view hierarchy where views can be created/managed.

```html
<ng-container #container></ng-container>
```

```ts
@ViewChild('container', { read: ViewContainerRef })
container!: ViewContainerRef;
```

Capabilities: create components, create embedded views, insert, move, detach, remove, clear.

---

## 5. TemplateRef + ViewContainerRef Relationship

```
TemplateRef (WHAT) → Angular View → ViewContainerRef (WHERE) → Rendered UI
```

```ts
this.container.createEmbeddedView(this.template);
```

---

## 6. createEmbeddedView()

Creates an embedded view from a `TemplateRef`.

```html
<ng-template #userTemplate><p>Hello User</p></ng-template>
<ng-container #container></ng-container>
```

```ts
@ViewChild('userTemplate') template!: TemplateRef<unknown>;
@ViewChild('container', { read: ViewContainerRef }) container!: ViewContainerRef;

show() {
  this.container.createEmbeddedView(this.template);
}
```

**Passing context:**

```html
<ng-template #userTemplate let-name="name">
  <p>Hello {{ name }}</p>
</ng-template>
```

```ts
this.container.createEmbeddedView(this.template, { name: "Harish" });
// → Hello Harish
```

---

## 7. createComponent()

Dynamically creates an Angular component.

```ts
const ref = this.container.createComponent(UserComponent);
ref.instance; // component instance
ref.setInput("userId", 10); // modern Angular
```

Returns `ComponentRef<UserComponent>`.

Use cases: dynamic dialogs/popups, notifications, dashboard widgets, plugin systems, dynamic forms.

---

## 8. createComponent() vs createEmbeddedView()

|                       | `createComponent()` | `createEmbeddedView()`     |
| --------------------- | ------------------- | -------------------------- |
| Creates               | Angular component   | Embedded view              |
| Input                 | Component class     | `TemplateRef`              |
| Returns               | `ComponentRef`      | `EmbeddedViewRef`          |
| Full component (I/O)? | Yes                 | No — uses template context |
| Typical use           | Dynamic component   | Dynamic template snippet   |

```
createComponent()     → Component class → ComponentRef
createEmbeddedView()  → TemplateRef     → EmbeddedViewRef
```

---

## 9. Structural Directives Use This Under the Hood

```html
<div *appHasPermission="'EDIT_USER'">Edit User</div>
```

desugars to:

```html
<ng-template [appHasPermission]="'EDIT_USER'">
  <div>Edit User</div>
</ng-template>
```

So a structural directive injects both:

```ts
constructor(
  private templateRef: TemplateRef<unknown>,
  private viewContainer: ViewContainerRef
) {}
```

**Full example — permission directive:**

```ts
@Directive({ selector: "[appHasPermission]" })
export class HasPermissionDirective {
  constructor(
    private templateRef: TemplateRef<unknown>,
    private viewContainer: ViewContainerRef,
    private permissionService: PermissionService,
  ) {}

  @Input() set appHasPermission(permission: string) {
    this.viewContainer.clear();
    if (this.permissionService.hasPermission(permission)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
```

```html
<button *appHasPermission="'EDIT_USER'">Edit User</button>
```

---

## 10. Why Not ElementRef for This?

`ElementRef` gives DOM access only:

```ts
elementRef.nativeElement.style.display = "none"; // hides it — view still exists
```

`TemplateRef` + `ViewContainerRef` control the **Angular view**, not just visibility:

```ts
viewContainer.clear(); // actually removes the view
```

**Interview phrasing:**

> "`ElementRef` can be used for DOM manipulation, but it isn't the right abstraction for a structural permission directive — we want to conditionally create/destroy an Angular view, not just hide a DOM element."

---

## 11. ViewContainerRef Methods

| Method                 | Meaning                            |
| ---------------------- | ---------------------------------- |
| `createComponent()`    | Dynamically create a component     |
| `createEmbeddedView()` | Create a view from a `TemplateRef` |
| `insert()`             | Insert an existing view            |
| `move()`               | Move a view                        |
| `detach()`             | Remove view, keep it alive         |
| `remove()`             | Remove and destroy view            |
| `clear()`              | Remove and destroy all views       |
| `get()`                | Get view at index                  |
| `indexOf()`            | Get index of a view                |

**`remove()` vs `detach()`:**

```ts
container.remove(0); // remove + destroy
const view = container.detach(0); // remove, keep alive (re-insertable)
```

---

## 12. Senior-Level Answers (Quick Recall)

**What is ViewContainerRef?**

> A location in Angular's view hierarchy where views can be dynamically created and managed — via `createComponent()`, `createEmbeddedView()`, and APIs to insert, move, detach, remove, and clear views.

**TemplateRef vs ViewContainerRef?**

> `TemplateRef` represents _what_ should be rendered; `ViewContainerRef` represents _where_ it should be rendered.

**createComponent() vs createEmbeddedView()?**

> `createComponent()` instantiates a full Angular component and returns a `ComponentRef`. `createEmbeddedView()` creates a view from a `TemplateRef` and returns an `EmbeddedViewRef`.

**Why not ElementRef for a permission directive?**

> `ElementRef` works at the DOM level. A structural permission directive needs to control the Angular view itself, so `TemplateRef` + `ViewContainerRef` are the right abstractions.

---

## 13. Final Mental Model

```
                Angular Template
                       │
             ┌─────────┴─────────┐
        TemplateRef         Component Type
             │                   │
 createEmbeddedView()    createComponent()
             │                   │
             ▼                   ▼
      EmbeddedViewRef      ComponentRef
             │                   │
             └─────────┬─────────┘
                        ▼
                ViewContainerRef ("WHERE")
                        │
                        ▼
                  Angular View → DOM
```

### ⭐ Five Lines to Remember

1. `ElementRef` → DOM
2. `TemplateRef` → Template / WHAT
3. `ViewContainerRef` → Location / WHERE
4. `createEmbeddedView()` → Template → `EmbeddedViewRef`
5. `createComponent()` → Component → `ComponentRef`
