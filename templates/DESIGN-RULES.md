# Template Design Rules

These rules apply to ALL bld402 templates and showcase apps.

## 1. Viewport Fitting — Single Screen

Every app MUST fit in a single viewport on desktop (no vertical scroll in the default/initial state):
- Use `height: 100dvh` on the body or root container
- Use flexbox with `flex: 1` for the main content area to fill available space
- Reduce padding and margins — prefer compact spacing
- The demo notice banner, header, main content, and footer should all fit in one screen
- On mobile, scrolling is acceptable but minimize it

## 2. Responsive Design

Every app MUST look good on all screen sizes:
- Use relative units (rem, %, vw/vh) over fixed px where possible
- Mobile breakpoint at 600px — stack layouts vertically
- Small mobile breakpoint at 400px — reduce font sizes and element sizes
- Touch targets minimum 44px on mobile
- Test at: 375px (phone), 768px (tablet), 1440px (desktop)

## 3. Compact Layout

- Header: single line, small padding (0.5rem 1rem)
- Demo banner: small font (0.8rem), minimal padding (0.35rem)
- Footer: single line, small font (0.75rem), minimal padding (0.5rem)
- Main content: flex-grow to fill space, centered, max-width appropriate for content type
- Avoid large margins between sections — use 0.5-1rem gaps

## 4. Consistent Styling

- Font: system font stack (-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)
- Primary color: #0066cc (bld402 blue)
- Background: #f8f9fa (light gray)
- Border color: #e0e0e0
- Demo banner: background #fff3cd, color #856404
- Footer links: primary color
- Border radius: 6px for buttons/inputs, 8px for cards

## 5. Favicon

All apps MUST include the bld402 favicon as an inline SVG data URI in the `<head>`:
```html
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='4' fill='%23FFF' stroke='%23E5E7EB'/%3E%3Ctext x='2' y='23' font-family='monospace' font-size='20' font-weight='bold' fill='%230066cc'%3E%3E%3C/text%3E%3Cg transform='translate(16,6) rotate(35,8,10)'%3E%3Crect x='7' y='10' width='3' height='14' rx='1' fill='%23374151'/%3E%3Crect x='2' y='5' width='13' height='7' rx='2' fill='%230066cc'/%3E%3C/g%3E%3C/svg%3E">
```

## 6. Standard Page Structure

```html
<body>  <!-- height: 100dvh, display: flex, flex-direction: column -->
  <div class="demo-banner">...</div>     <!-- compact, ~28px -->
  <header>...</header>                    <!-- compact, ~40px -->
  <main>...</main>                        <!-- flex: 1, overflow: auto -->
  <footer>...</footer>                    <!-- compact, ~32px -->
</body>
```

The `<main>` element gets `flex: 1` and `overflow: auto` so if content does exceed viewport, only the main area scrolls (not the whole page). Banner, header, and footer stay fixed.

## 7. Title Format

`<title>App Name — bld402 Demo</title>`
