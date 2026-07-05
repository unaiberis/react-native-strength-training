# Design System Spec

> Cliente: TheHybridProject v0.1
> Fuente: `TheHybridProject_v0_1/` + WhatsApp images 2026-07-05

## Design Tokens

### Colors

| Token | Hex | Uso |
|-------|-----|-----|
| `background` | `#050505` | Fondo general de pantallas |
| `backgroundSoft` | `#0B0B0C` | Fondos secundarios (gradientes) |
| `card` | `#171719` | Superficie de tarjetas |
| `cardSoft` | `#222225` | Tarjetas hover / fondos secundarios |
| `border` | `#343437` | Bordes sutiles |
| `text` | `#F4F4F2` | Texto principal |
| `textMuted` | `#A4A4A8` | Texto secundario |
| `textSubtle` | `#707074` | Texto terciario / placeholders |
| `titanium` | `#B9B9B6` | Gris claro decorativo |
| `graphite` | `#2C2C2E` | Gris oscuro |
| `success` | `#D7D7D2` | Éxito / completado |
| `danger` | `#D65F5F` | Error / peligro |

### Spacing

| Token | px |
|-------|----|
| `xs` | 6 |
| `sm` | 10 |
| `md` | 16 |
| `lg` | 24 |
| `xl` | 32 |
| `xxl` | 44 |

### Border Radius

| Token | px | Uso |
|-------|----|-----|
| `rounded-xl` | 18 | Botones, cards pequeños, inputs |
| `rounded-2xl` | 26 | Cards grandes, contenedores modales |

### Typography

| Token | Size | Weight | Uso |
|-------|------|--------|-----|
| `title` | 34 | 800 | Pantallas de inicio, títulos grandes |
| `h2` | 24 | 800 | Títulos de sección |
| `h3` | 18 | 700 | Subtítulos |
| `body` | 15 | 500 | Texto de cuerpo |
| `small` | 12 | 600 | Labels, metadata |

### Border Width

- Cards y botones: `1px`

## Reglas de Diseño

1. Dark theme siempre — NO existe modo claro.
2. Los botones usan `bg-card-soft` + `border-border` con `rounded-xl` (18px).
3. Las cards usan `bg-card` + `border-border` con `rounded-2xl` (26px).
4. Shadow en botones: `shadowColor: #000, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8`.
5. Gradientes de fondo: `#030303 → #101012 → #050505`.
6. Tipografía bold por defecto (800-900 para títulos, 500-600 para cuerpo).
7. Labels en mayúscula con letter-spacing (opcional según contexto).
8. Iconos de `@expo/vector-icons` (Ionicons).

## Componentes

### PrimaryButton

- `minHeight: 58`, `borderRadius: 18`, `bg-card-soft`, `border-border 1px`
- Texto: 17px, weight 800, color `text`
- Shadow con opacity 0.35

### Card contenedor

- `bg-card`, `borderRadius: 26`, `border-border 1px`, `padding: 20`
- Título opcional: 23px, weight 900

### MetricCard

- `bg: rgba(255,255,255,0.055)`, `borderRadius: 18`, `border-border 1px`
- Value: 22px weight 900
- Label: 12px weight 600, `textMuted`

### Screen container

- `LinearGradient` con `#030303 → #101012 → #050505`
- `SafeAreaView` con flex: 1
