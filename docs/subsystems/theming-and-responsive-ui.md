# Theming and Responsive UI

Color schemes, typography, spacing, and core UI components.

## Theme and Colors
- `constants/theme.ts` defines light/dark palettes and fonts.
- `lib/theme-context.tsx` stores preferred theme (system/light/dark) with persistence.
- Hooks:
  - `hooks/use-color-scheme*.ts` handles platform-specific scheme detection.
  - `hooks/use-theme-color.ts` resolves themed colors by key.

## Responsive Utilities
- `constants/responsive.ts` provides:
  - Typography scales (xs..display, responsive sizes)
  - Spacing tokens
  - Touch target sizes
  - Border radius and shadows
  - Helpers: `ResponsiveUtils.fontSize`, `getBorderRadius`, `getShadow`, `widthPercentage`, `getResponsiveValue`.

## Core UI Components (contracts)
- Button (`components/ui/Button.tsx`)
  - Variants: primary, secondary, danger
  - Sizes: sm, md, lg; fullWidth
  - A11y labels/hints; hover/press states; responsive font size
- Card (`components/ui/Card.tsx`)
  - Variants: default, elevated, outlined; pressable option with hover/scale on web
- Input (`components/ui/Input.tsx`)
  - Label, helper, error; sizes; focus/error border logic; multiline support
- DateFilterModal (`components/ui/DateFilterModal.tsx`)
  - Month/year or all-time export selector with reset/apply
- Layout (`components/ui/Layout.tsx`)
  - Container/ScrollContainer/Stack/Grid/Row/Column helpers with responsive spacing
- SyncStatusIndicator (`components/ui/SyncStatusIndicator.tsx`)
  - Shows online/sync states with animation; navigates to Sync Status
- ZoomImageModal (`components/ui/ZoomImageModal.tsx`)
  - Gesture-based zoom and panning for images
- Misc (`Chip.tsx`, `collapsible.tsx`, `icon-symbol*.tsx`)

## Accessibility
- Text sizing respects `ResponsiveUtils.fontSize`; buttons/inputs meet touch target guidance.
- Components expose `accessibilityLabel` and `accessibilityHint` where applicable.

## Testing
- `__tests__/responsive-typography.test.ts` verifies scaling across device sizes and constraints.
