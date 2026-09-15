# ForecourIQ Font Assets Directory

Place self-hosted font files in this folder (`/public/fonts/`).

### Typeface Priority
1. **Lufga** (Primary licensed typeface)
   - `Lufga-Regular.woff2` (Weight: 400)
   - `Lufga-Medium.woff2` (Weight: 500)
   - `Lufga-SemiBold.woff2` (Weight: 600)
   - `Lufga-Bold.woff2` (Weight: 700)

2. **General Sans** (Tier 1 Fallback)
   - `GeneralSans-Regular.woff2` (Weight: 400)
   - `GeneralSans-Medium.woff2` (Weight: 500)
   - `GeneralSans-SemiBold.woff2` (Weight: 600)
   - `GeneralSans-Bold.woff2` (Weight: 700)

3. **Inter** (Tier 2 Fallback, system-supported)
4. **system-ui** (OS native fallback)

The CSS `@font-face` declarations and Tailwind font families are pre-configured in `globals.css` and `tailwind.config.ts`. Dropping in the `.woff2` files will immediately activate them without code changes.
