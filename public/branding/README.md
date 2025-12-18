# Tenant Branding Assets

This folder contains brand-specific logos and assets for each tenant.

## Naming Convention

Each tenant should have their logo named as: `{tenant-id}-logo.png`

## Required Assets

| Tenant ID | Logo File | Status | Domain |
|-----------|-----------|--------|--------|
| `hurghada-speedboat` | `hurghada-speedboat-logo.png` | ⏳ Pending | hurghadaspeedboat.com |
| `hurghada` | `hurghada-logo.png` | ⏳ Pending | hurghadatours.com |
| `cairo` | `cairo-logo.png` | ⏳ Pending | cairotours.com |
| `luxor` | `luxor-logo.png` | ⏳ Pending | luxortours.com |
| `sharm` | `sharm-logo.png` | ⏳ Pending | sharmtours.com |
| `aswan` | `aswan-logo.png` | ⏳ Pending | aswantours.com |
| `alexandria` | `alexandria-logo.png` | ⏳ Pending | alexandriatours.com |
| `dahab` | `dahab-logo.png` | ⏳ Pending | dahabtours.com |
| `marsa-alam` | `marsa-alam-logo.png` | ⏳ Pending | marsaalamtours.com |

## Logo Requirements

- **Format**: PNG with transparent background
- **Size**: Recommended 400x200px (will be displayed at ~80px height)
- **Style**: Should work on dark backgrounds (Coming Soon pages use dark themes)

## Hurghada Speedboat Specific Assets

For the speedboat brand, the following additional assets are recommended:

| Asset | File Name | Description |
|-------|-----------|-------------|
| Main Logo | `hurghada-speedboat-logo.png` | Primary logo (white/light version) |
| Dark Logo | `hurghada-speedboat-logo-dark.png` | For light backgrounds |
| Favicon | `hurghada-speedboat-favicon.ico` | Browser tab icon |
| OG Image | `hurghada-speedboat-og.jpg` | Social sharing (1200x630px) |
| Hero Images | `speedboat-hero-1.jpg` to `speedboat-hero-3.jpg` | Homepage hero slider |

### Brand Colors (Speedboat)
- Primary: `#00E0FF` (Cyan/Aqua)
- Secondary: `#001230` (Deep Navy)
- Accent: `#64FFDA` (Mint)

## Adding a New Tenant Logo

1. Add the logo file to this folder
2. Run `pnpm tenant:seed-speedboat` (for speedboat) or create tenant via admin panel
3. Update the tenant configuration in MongoDB if needed
4. The `ComingSoonPage` will automatically use the new logo

## Local Testing

Test different tenant domains locally using different ports:

```bash
# Default tenant (localhost:3000)
pnpm dev

# Speedboat tenant
PORT=3004 pnpm dev:original

# Or use the port mapping in middleware.ts:
# localhost:3000 → default
# localhost:3001 → hurghada
# localhost:3002 → cairo
# localhost:3003 → luxor
# localhost:3004 → hurghada-speedboat
```
