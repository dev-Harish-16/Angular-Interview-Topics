# Angular Material Theming Cheat Sheet (M3 / Angular 17+)

## 1. Basic Theme Setup

```scss
// styles.scss
@use "@angular/material" as mat;

html {
  @include mat.theme(
    (
      color: (
        theme-type: light,
        primary: mat.$violet-palette,
        tertiary: mat.$blue-palette,
      ),
      typography: Roboto,
      density: 0,
    )
  );
}
```

## 2. Dark Mode

**Auto (system preference):**

```scss
html {
  @include mat.theme(
    (
      color: (
        theme-type: color-scheme,
        primary: mat.$violet-palette,
      ),
    )
  );
}
```

**Manual toggle:**

```scss
.dark-mode {
  @include mat.theme(
    (
      color: (
        theme-type: dark,
        primary: mat.$violet-palette,
      ),
    )
  );
}
```

```ts
document.body.classList.toggle("dark-mode");
```

## 3. System Tokens (use anywhere in CSS)

```css
.custom-card {
  background: var(--mat-sys-surface);
  color: var(--mat-sys-on-surface);
  border-radius: var(--mat-sys-corner-large);
}
```

Common tokens: `--mat-sys-primary`, `--mat-sys-on-primary`, `--mat-sys-surface`, `--mat-sys-surface-variant`, `--mat-sys-outline`, `--mat-sys-corner-small/medium/large`.

## 4. Component-Level Overrides

```scss
.custom-button {
  @include mat.button-overrides(
    (
      filled-container-color: var(--brand-primary),
      filled-label-text-color: white,
    )
  );
}
```

Pattern: `mat.<component>-overrides((token: value))`. Check each component's API docs for token names.

## 5. Runtime / White-Label Theming

```ts
document.documentElement.style.setProperty("--mat-sys-primary", tenantColor);
```

No SCSS recompile needed — swap brand colors per tenant/user at runtime.

## 6. Generate Palette from Brand Color

```bash
# Interactive
ng generate @angular/material:theme-color

# Scripted
ng generate @angular/material:theme-color --primary-color="#3f51b5"

# Multiple seeds
ng generate @angular/material:theme-color \
  --primary-color="#3f51b5" \
  --secondary-color="#ff4081" \
  --tertiary-color="#4caf50"
```

Output: `_theme-colors.scss` with full M3 tonal palette (tones 0–100).

**Use it:**

```scss
@use "./theme-colors" as my-theme;
html {
  @include mat.theme(my-theme.$primary-palette);
}
```

Alternative (no CLI): Material Theme Builder — `m3.material.io` → export SCSS/JSON.

## 7. Migrating from M2 → M3

```bash
ng generate @angular/material:m2-theming
```

Scaffolds M3 theme alongside existing M2 theme for incremental migration.

## Quick Reference: Old (M2) vs New (M3)

| Task               | M2                                        | M3                                    |
| ------------------ | ----------------------------------------- | ------------------------------------- |
| Define theme       | `mat.define-light-theme(...)`             | `mat.theme((...))`                    |
| Apply globally     | `mat.all-component-themes($theme)`        | Automatic via `mat.theme()` on `html` |
| Palette            | `mat.define-palette(mat.$indigo-palette)` | `mat.$violet-palette` (M3 palettes)   |
| Component override | `::ng-deep` / `mat.*-overrides()`         | `mat.*-overrides()` (token-based)     |
| Dark theme         | `mat.define-dark-theme(...)`              | `theme-type: dark`                    |
| CSS variables      | Not native                                | `--mat-sys-*` built in                |
