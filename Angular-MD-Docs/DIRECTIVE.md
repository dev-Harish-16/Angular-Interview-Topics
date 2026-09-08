# Angular Directives — Deep Dive

## 1. The Three Types

| Type           | Purpose                                        | Changes DOM structure? | Example                                |
| -------------- | ---------------------------------------------- | ---------------------- | -------------------------------------- |
| **Component**  | Directive WITH a template                      | N/A (has its own view) | `@Component`                           |
| **Structural** | Add/remove/repeat DOM elements                 | ✅ Yes                 | `*ngIf`, `*ngFor`, `*ngSwitch`         |
| **Attribute**  | Change appearance/behavior of existing element | ❌ No                  | `ngClass`, `ngStyle`, `[appHighlight]` |

A Component **is** a directive (`@Component` extends `@Directive` under the hood, adds `template`).

---

## 2. Attribute Directive — full anatomy

```typescript
import {
  Directive,
  ElementRef,
  HostListener,
  HostBinding,
  Input,
  inject,
} from "@angular/core";

@Directive({
  selector: "[appHighlight]",
  standalone: true, // Angular 15+, no NgModule needed
})
export class HighlightDirective {
  private el = inject(ElementRef);

  @Input("appHighlight") color = "yellow"; // aliased input — bracket name = directive selector

  @HostBinding("style.backgroundColor") bgColor = "";

  @HostListener("mouseenter")
  onEnter() {
    this.bgColor = this.color;
  }

  @HostListener("mouseleave")
  onLeave() {
    this.bgColor = "";
  }
}
```

```html
<p [appHighlight]="'orange'">Hover me</p>
```

### `@HostBinding` vs `@HostListener`

|                          | Direction                | Purpose                                  |
| ------------------------ | ------------------------ | ---------------------------------------- |
| `@HostBinding('prop')`   | Directive → Host element | Set an attribute/style/class on the host |
| `@HostListener('event')` | Host element → Directive | React to a DOM event on the host         |

### Modern equivalent — `host` metadata (preferred since v14+, cleaner)

```typescript
@Directive({
  selector: "[appHighlight]",
  standalone: true,
  host: {
    "[style.backgroundColor]": "bgColor",
    "(mouseenter)": "onEnter()",
    "(mouseleave)": "onLeave()",
  },
})
export class HighlightDirective {
  @Input("appHighlight") color = "yellow";
  bgColor = "";
  onEnter() {
    this.bgColor = this.color;
  }
  onLeave() {
    this.bgColor = "";
  }
}
```

Angular team recommends `host` object over `@HostBinding`/`@HostListener` decorators in new code — keeps all host bindings in one place, better tree-shaking, easier to scan.

---

## 3. Structural Directives — the real mechanics

`*ngIf` is **syntactic sugar**. This:

```html
<div *ngIf="isVisible">Hello</div>
```

desugars to:

```html
<ng-template [ngIf]="isVisible">
  <div>Hello</div>
</ng-template>
```

The `*` prefix means: "wrap this element in an `<ng-template>`, and the following binding is a structural directive input."

### What structural directives actually manipulate

Two core APIs:

- **`TemplateRef`** — reference to the `<ng-template>` content (uninstantiated)
- **`ViewContainerRef`** — the "slot" in the DOM where views get inserted/removed

```typescript
import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
} from "@angular/core";

@Directive({
  selector: "[appIf]",
  standalone: true,
})
export class AppIfDirective {
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private hasView = false;

  @Input() set appIf(condition: boolean) {
    if (condition && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef); // insert
      this.hasView = true;
    } else if (!condition && this.hasView) {
      this.viewContainer.clear(); // remove
      this.hasView = false;
    }
  }
}
```

That's the **entire mechanism** behind `*ngIf`. `*ngFor` does the same thing in a loop, calling `createEmbeddedView` once per item with an injected `$implicit` context.

### Building `*ngFor`-like directive with context

```typescript
import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
} from "@angular/core";

interface AppForOfContext<T> {
  $implicit: T;
  index: number;
}

@Directive({
  selector: "[appForOf]",
  standalone: true,
})
export class AppForOfDirective<T> {
  private templateRef = inject(TemplateRef<AppForOfContext<T>>);
  private viewContainer = inject(ViewContainerRef);

  @Input() set appForOf(items: T[]) {
    this.viewContainer.clear();
    items.forEach((item, index) => {
      this.viewContainer.createEmbeddedView(this.templateRef, {
        $implicit: item,
        index,
      });
    });
  }
}
```

```html
<div *appForOf="let item of items; let i = index">{{ i }}: {{ item }}</div>
```

`let item` binds to `$implicit`. `let i = index` binds to the `index` key in context. This is exactly how real `*ngFor` exposes `index`, `first`, `last`, `even`, `odd`.

---

## 4. New Control Flow (Angular 17+) — replaces most structural directive use

```html
<!-- OLD -->
<div *ngIf="user; else noUser">{{ user.name }}</div>
<ng-template #noUser>No user</ng-template>

<!-- NEW: @if -->
@if (user) {
<div>{{ user.name }}</div>
} @else {
<div>No user</div>
}
```

```html
<!-- OLD -->
<div *ngFor="let item of items; trackBy: trackFn">{{ item.name }}</div>

<!-- NEW: @for -->
@for (item of items; track item.id) {
<div>{{ item.name }}</div>
} @empty {
<div>No items</div>
}
```

```html
<!-- OLD -->
<div [ngSwitch]="status">
  <p *ngSwitchCase="'active'">Active</p>
  <p *ngSwitchDefault>Unknown</p>
</div>

<!-- NEW: @switch -->
@switch (status) { @case ('active') {
<p>Active</p>
} @default {
<p>Unknown</p>
} }
```

**Why it's better:** built into the template compiler (not a directive) → smaller bundles, better type-narrowing (`@if (user)` narrows `user` type inside the block like TS), mandatory `track` in `@for` prevents the classic "forgot trackBy" perf bug.

Still need `*ngIf`/`*ngFor` if you're on <17 or working in a legacy codebase — mechanics above still explain what's happening.

---

## 5. `ngTemplateOutlet` — render a template imperatively

```html
<ng-template #greeting let-name>
  <p>Hello, {{ name }}!</p>
</ng-template>

<ng-container *ngTemplateOutlet="greeting; context: { $implicit: 'Harish' }">
</ng-container>
```

Useful for passing templates as `@Input()` — e.g. custom table components accepting a cell template from the consumer.

```typescript
@Component({ selector: "app-table" })
export class TableComponent {
  @Input() rowTemplate!: TemplateRef<any>;
}
```

```html
<app-table [rowTemplate]="customRow"></app-table>
<ng-template #customRow let-row>
  <td>{{ row.name }}</td>
</ng-template>
```

---

## 6. `exportAs` — template reference variables on directives

```typescript
@Directive({
  selector: "[appTooltip]",
  standalone: true,
  exportAs: "appTooltip",
})
export class TooltipDirective {
  show() {
    /* ... */
  }
  hide() {
    /* ... */
  }
}
```

```html
<button [appTooltip] #tip="appTooltip" (click)="tip.show()">Hover</button>
```

`ngForm` uses this exact pattern — `#form="ngForm"` is `NgForm`'s `exportAs`.

---

## 7. Directive Composition API (Angular 15+) — `hostDirectives`

Apply a directive's behavior to a component **without the consumer writing the selector on the host element**.

```typescript
@Directive({ selector: "[cdkMenuItem]", standalone: true })
export class CdkMenuItem {
  /* keyboard nav, a11y, etc. */
}

@Component({
  selector: "app-menu-item",
  standalone: true,
  hostDirectives: [
    {
      directive: CdkMenuItem,
      inputs: ["disabled"], // re-expose CdkMenuItem's @Input as app-menu-item's own
      outputs: ["selected"],
    },
  ],
  template: `<ng-content></ng-content>`,
})
export class AppMenuItemComponent {}
```

```html
<!-- consumer never mentions cdkMenuItem — it's baked in -->
<app-menu-item [disabled]="false" (selected)="onSelect()">Item 1</app-menu-item>
```

This is **composition over inheritance** for directives — bundle multiple directive behaviors (a11y, keyboard handling, focus trap) into one component cleanly. Used heavily inside Angular CDK/Material internally.

---

## 8. Multiple directives, same element — order matters for structural directives

Only **one structural directive per element** is allowed:

```html
<!-- ❌ COMPILE ERROR -->
<div *ngIf="show" *ngFor="let i of items"></div>
```

Fix — wrap in `<ng-container>`:

```html
<ng-container *ngIf="show">
  <div *ngFor="let i of items">{{ i }}</div>
</ng-container>
```

`<ng-container>` renders nothing itself — pure logical grouping, no extra DOM node.

Attribute directives, however, **can stack freely**:

```html
<div appHighlight appTooltip [ngClass]="classes"></div>
```

---

## 9. Directive Lifecycle Hooks

Directives support the same lifecycle hooks as components (minus template-related ones):

| Hook          | Fires                                                                 |
| ------------- | --------------------------------------------------------------------- |
| `ngOnChanges` | On every `@Input()` change                                            |
| `ngOnInit`    | Once, after first `ngOnChanges`                                       |
| `ngDoCheck`   | Every change detection cycle                                          |
| `ngOnDestroy` | On removal — **critical for cleanup** (unsubscribe, remove listeners) |

```typescript
@Directive({ selector: "[appAutoFocus]", standalone: true })
export class AutoFocusDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef);
  private sub?: Subscription;

  ngOnInit() {
    this.el.nativeElement.focus();
    this.sub = fromEvent(window, "resize").subscribe(() => {
      /* ... */
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe(); // prevent memory leaks
  }
}
```

---

## 10. Signal-based inputs in directives (Angular 17.1+)

```typescript
import { Directive, input, effect } from "@angular/core";

@Directive({
  selector: "[appHighlight]",
  standalone: true,
})
export class HighlightDirective {
  color = input<string>("yellow"); // signal-based input, replaces @Input()

  constructor() {
    effect(() => {
      console.log("Color changed to", this.color()); // reactive, no ngOnChanges needed
    });
  }
}
```

Advantages over `@Input()`: no `ngOnChanges` boilerplate, automatically reactive in computed/effect, required inputs via `input.required<T>()`.

---

## 11. Real-world custom directive examples

### Debounced input (common enterprise use case)

```typescript
@Directive({
  selector: "[appDebounceInput]",
  standalone: true,
})
export class DebounceInputDirective implements OnInit, OnDestroy {
  @Input() debounceTime = 300;
  @Output() debouncedInput = new EventEmitter<string>();

  private el = inject(ElementRef);
  private sub?: Subscription;

  ngOnInit() {
    this.sub = fromEvent(this.el.nativeElement, "input")
      .pipe(
        debounceTime(this.debounceTime),
        map((e: any) => e.target.value),
      )
      .subscribe((val) => this.debouncedInput.emit(val));
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
```

### Click-outside directive

```typescript
@Directive({
  selector: "[appClickOutside]",
  standalone: true,
})
export class ClickOutsideDirective {
  private el = inject(ElementRef);
  @Output() clickOutside = new EventEmitter<void>();

  @HostListener("document:click", ["$event.target"])
  onClick(target: HTMLElement) {
    if (!this.el.nativeElement.contains(target)) {
      this.clickOutside.emit();
    }
  }
}
```

### Permission-based structural directive (common in enterprise apps — like Boeing Toolbox RBAC)

```typescript
@Directive({
  selector: "[appHasPermission]",
  standalone: true,
})
export class HasPermissionDirective {
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private authService = inject(AuthService);

  @Input() set appHasPermission(permission: string) {
    if (this.authService.hasPermission(permission)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
```

```html
<button *appHasPermission="'DELETE_RECORD'">Delete</button>
```

---

## 12. Testing directives

```typescript
@Component({
  template: `<div [appHighlight]="'red'">Test</div>`,
  standalone: true,
  imports: [HighlightDirective],
})
class TestHostComponent {}

describe("HighlightDirective", () => {
  it("applies background on mouseenter", () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    const div = fixture.debugElement.query(By.css("div"));
    div.triggerEventHandler("mouseenter", null);
    fixture.detectChanges();
    expect(div.nativeElement.style.backgroundColor).toBe("red");
  });
});
```

Use a **test host component** — directives have no template of their own, so you test them attached to a throwaway host.

---

## 13. Quick decision guide

| Need                                                | Use                                                             |
| --------------------------------------------------- | --------------------------------------------------------------- |
| Reusable styling/behavior on existing element       | Attribute directive (`[appX]`)                                  |
| Conditionally add/remove/repeat DOM                 | Structural directive (`*appX`) — or `@if`/`@for` if Angular 17+ |
| Bundle directive behavior into a component silently | `hostDirectives` (Directive Composition API)                    |
| Pass a template as data                             | `TemplateRef` + `@Input()` + `ngTemplateOutlet`                 |
| Expose directive's public API to template           | `exportAs`                                                      |
| React to host DOM events                            | `host: { '(event)': 'handler()' }` or `@HostListener`           |
| Set host element property/attribute/style           | `host: { '[prop]': 'value' }` or `@HostBinding`                 |

## 14. One-sentence summary

> A directive is a class with `@Directive` that either **changes appearance/behavior** (attribute), **changes DOM structure** via `TemplateRef` + `ViewContainerRef` (structural), or **has a template** (component, technically a directive too) — and since Angular 17, most structural directive use cases are better served by built-in `@if`/`@for`/`@switch` control flow.
