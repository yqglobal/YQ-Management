---
name: Modern Professional
colors:
  surface: '#f9f9ff'
  surface-dim: '#d7dae3'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3fc'
  surface-container: '#ebedf7'
  surface-container-high: '#e6e8f1'
  surface-container-highest: '#e0e2eb'
  on-surface: '#181c22'
  on-surface-variant: '#414753'
  inverse-surface: '#2d3037'
  inverse-on-surface: '#eef0fa'
  outline: '#717785'
  outline-variant: '#c1c6d5'
  surface-tint: '#005db8'
  primary: '#005ab4'
  on-primary: '#ffffff'
  primary-container: '#0a73e0'
  on-primary-container: '#fefcff'
  inverse-primary: '#aac7ff'
  secondary: '#465f88'
  on-secondary: '#ffffff'
  secondary-container: '#b6d0ff'
  on-secondary-container: '#3f5881'
  tertiary: '#964400'
  on-tertiary: '#ffffff'
  tertiary-container: '#bd5700'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#aac7ff'
  on-primary-fixed: '#001b3e'
  on-primary-fixed-variant: '#00458d'
  secondary-fixed: '#d6e3ff'
  secondary-fixed-dim: '#aec7f7'
  on-secondary-fixed: '#001b3d'
  on-secondary-fixed-variant: '#2d476f'
  tertiary-fixed: '#ffdbc9'
  tertiary-fixed-dim: '#ffb68c'
  on-tertiary-fixed: '#321200'
  on-tertiary-fixed-variant: '#763400'
  background: '#f9f9ff'
  on-background: '#181c22'
  surface-variant: '#e0e2eb'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin: 24px
---

# Design System: Modern Professional

## Brand & Style
The brand personality is professional, reliable, and modern. It transitions from an aggressive, high-energy orange palette to a balanced and trustworthy blue-centric aesthetic. The UI evokes a sense of stability and technological sophistication, utilizing a "Corporate / Modern" style inspired by high-quality interface guidelines. It prioritizes clarity and efficiency for a streamlined user experience.

## Colors
The color palette is built around a "Modern Blue" primary hex (#1275e2), providing a dependable and accessible foundation. The secondary color is a muted steel blue (#5f78a3) for supporting elements, while the tertiary color provides a high-contrast warm accent (#c55b00) for specific call-outs or warnings. The neutral tones are shifted toward a cool grey (#74777f) to maintain professional cohesion. The system uses a light color mode with a fidelity variant to ensure brand colors remain true to their intended hues across the UI.

## Typography
The system uses **Inter**, a highly legible sans-serif font designed for screens. This choice enhances the "Corporate / Modern" aesthetic. Headlines use a semi-bold weight to establish clear hierarchy, while body text remains clean and readable. 

- **Headline Large:** 32px / 40px line-height (Inter)
- **Headline Medium:** 24px / 32px line-height (Inter)
- **Body Large:** 16px / 24px line-height (Inter)
- **Body Medium:** 14px / 20px line-height (Inter)
- **Label Medium:** 12px / 16px line-height (Inter)

## Layout & Spacing
The layout follows a fluid grid philosophy with a base 8px spatial system. Standard margins are set to 24px with 16px gutters between columns. This consistent rhythm ensures that components are logically spaced, maintaining the clean and balanced look characteristic of modern professional interfaces.

## Elevation & Depth
Depth is communicated through tonal layers and soft, ambient shadows. Rather than harsh borders, the system uses subtle surface-container variations to stack elements. Primary surfaces sit at 0dp, while cards and modals use low-opacity, diffused shadows to indicate elevation and focus.

## Shapes
The design utilizes a **Rounded** shape language (Level 2). Standard UI elements like buttons and input fields feature a 0.5rem (8px) corner radius. Larger components like cards use 1rem (16px), and containers requiring high emphasis use 1.5rem (24px). This provides an approachable and contemporary feel.

## Components
- **Buttons:** Feature 8px rounded corners, utilizing the primary blue (#1275e2) for high-priority actions.
- **Inputs:** Use the neutral grey (#74777f) for borders with an Inter-based label system.
- **Cards:** Utilize elevated surfaces with 16px roundedness to group related content.
- **Chips:** Highly rounded elements used for filtering and tagging, drawing from secondary or tertiary accents.
- **Navigation:** Clean, list-based layouts with clear active states using primary color highlights.