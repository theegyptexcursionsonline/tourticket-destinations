# Tenant Branding Assets

This folder contains brand-specific logos and assets for each tenant.

## Naming Convention

Each tenant should have their logo named as: `{tenant-id}-logo.png`

## Required Assets

| Tenant ID | Logo File | Status |
|-----------|-----------|--------|
| `hurghada-speedboat` | `hurghada-speedboat-logo.png` | ⏳ Pending |
| `hurghada` | `hurghada-logo.png` | ⏳ Pending |
| `cairo` | `cairo-logo.png` | ⏳ Pending |
| `luxor` | `luxor-logo.png` | ⏳ Pending |
| `sharm` | `sharm-logo.png` | ⏳ Pending |
| `aswan` | `aswan-logo.png` | ⏳ Pending |
| `alexandria` | `alexandria-logo.png` | ⏳ Pending |
| `dahab` | `dahab-logo.png` | ⏳ Pending |
| `marsa-alam` | `marsa-alam-logo.png` | ⏳ Pending |

## Logo Requirements

- **Format**: PNG with transparent background
- **Size**: Recommended 400x200px (will be displayed at ~80px height)
- **Style**: Should work on dark backgrounds (Coming Soon pages use dark themes)

## Adding a New Tenant Logo

1. Add the logo file to this folder
2. Update the tenant configuration in MongoDB (or environment)
3. The `ComingSoonPage` will automatically use the new logo
