# Design System Documentation
## Based on kfouri-laurentbellue.paris Analysis

This design system has been extracted and adapted from the professional legal website kfouri-laurentbellue.paris for use in a Next.js application.

## 🎨 Color Palette

### Primary Colors
- **Deep Navy Blue** `#001b5b` - Main brand color, used for headers and primary elements
- **Light Blue** `#2ea3f2` - Links, accents, and interactive elements
- **Dark Navy** `#222637` - Headers and emphasis

### Secondary Colors
- **Purple Accent** `#7e3bd0` - Special highlights and secondary CTAs
- **Light Purple** `#9b51e0` - Hover states and lighter accents
- **Teal/Turquoise** `#29c4a9` - Primary CTA buttons and success states

### Neutral Colors
```css
White:        #ffffff
Off-white:    #f4f4f4
Light Gray:   #e5e5e5
Gray:         #d9d9d9
Medium Gray:  #999999
Dark Gray:    #666666
Charcoal:     #3e3e3e
Black:        #2b2b2b
```

### State Colors
- ✅ Success: `#00d084`
- ⚠️ Warning: `#fcb900`
- ❌ Error: `#cf2e2e`
- ℹ️ Info: `#0693e3`

## 📝 Typography

### Font Families
1. **Primary Font**: Acumin Pro (fallback to system fonts)
2. **Secondary Font**: Open Sans (for body text if needed)
3. **Monospace**: Courier New (for code/legal documents)

### Font Scale
```
xs:   12px (0.75rem)
sm:   14px (0.875rem)
base: 16px (1rem)
lg:   18px (1.125rem)
xl:   20px (1.25rem)
2xl:  24px (1.5rem)
3xl:  30px (1.875rem)
4xl:  36px (2.25rem)
5xl:  44px (2.75rem)
6xl:  56px (3.5rem)
```

### Heading Hierarchy
- **H1**: 44px, Bold, Tight letter-spacing
- **H2**: 36px, Semibold
- **H3**: 30px, Semibold
- **H4**: 24px, Semibold
- **H5**: 20px, Semibold
- **H6**: 18px, Semibold

## 📐 Layout & Spacing

### Container
- **Max Width**: 1200px
- **Padding**: 16px (mobile), 16px (desktop)

### Spacing Scale
```
0:  0
1:  4px  (0.25rem)
2:  8px  (0.5rem)
3:  12px (0.75rem)
4:  16px (1rem)
5:  20px (1.25rem)
6:  24px (1.5rem)
7:  28px (1.75rem)
8:  32px (2rem)
9:  40px (2.5rem)
10: 48px (3rem)
12: 64px (4rem)
16: 96px (6rem)
20: 128px (8rem)
```

### Section Padding
- Desktop: 64px vertical (4rem)
- Mobile: 32px vertical (2rem)

## 🎭 Components

### Buttons
```css
/* Primary Button */
background: #001b5b;
color: white;
padding: 12px 24px;
border-radius: 8px;
font-weight: 500;
transition: all 250ms ease;

/* Hover State */
background: #222637;
transform: translateY(-2px);
box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
```

### Cards
```css
background: white;
border: 1px solid #e5e5e5;
border-radius: 12px;
padding: 24px;
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

/* Hover State */
box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
transform: translateY(-4px);
```

### Navigation
```css
background: white;
border-bottom: 1px solid #e5e5e5;
box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
position: sticky;
top: 0;
z-index: 1020;
```

### Forms
```css
/* Input Fields */
background: white;
border: 1px solid #e5e5e5;
border-radius: 8px;
padding: 12px 16px;
font-size: 16px;

/* Focus State */
border-color: #001b5b;
box-shadow: 0 0 0 3px rgba(0, 27, 91, 0.1);
```

## 🎬 Animations & Transitions

### Transition Durations
- **Fast**: 150ms
- **Base**: 250ms
- **Slow**: 350ms

### Common Transitions
```css
/* Standard transition */
transition: all 250ms ease-in-out;

/* Color transitions */
transition: background-color 250ms, border-color 250ms, color 250ms;

/* Transform transitions */
transition: transform 250ms ease-out;
```

## 📱 Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 480px)

/* Tablet */
@media (max-width: 768px)

/* Desktop */
@media (min-width: 769px)

/* Large Desktop */
@media (min-width: 1200px)
```

## 🎯 Design Principles

1. **Professional & Trustworthy**: Deep navy blue conveys authority and trust
2. **Clean & Modern**: Ample white space and clean typography
3. **Accessible**: High contrast ratios and clear hierarchy
4. **Responsive**: Mobile-first approach with proper scaling
5. **Consistent**: Unified spacing, color, and component systems

## 💻 Implementation in Next.js

### Using CSS Variables
```jsx
// Import in your main layout or _app.js
import '/styles/design_system_nextjs.css'
```

### Using Tailwind Classes
```jsx
// Example component with Tailwind
<button className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md transition-all duration-250 hover:-translate-y-0.5 hover:shadow-lg">
  Contact Us
</button>
```

### Example Component Structure
```jsx
// Professional Card Component
<div className="bg-white border border-gray-200 rounded-lg p-6 shadow-md hover:shadow-xl transition-all duration-250 hover:-translate-y-1">
  <h3 className="text-2xl font-semibold text-primary-dark mb-4">
    Legal Services
  </h3>
  <p className="text-gray-500 leading-relaxed">
    Professional legal consultation and representation...
  </p>
  <button className="mt-4 bg-accent hover:bg-accent-hover text-white px-6 py-3 rounded-md transition-all duration-250">
    Learn More
  </button>
</div>
```

## 🔧 Files Created

1. **design_system_nextjs.css** - Complete CSS with variables and component styles
2. **tailwind.config.js** - Tailwind configuration matching the design system
3. **design_system.json** - Raw extracted design data
4. **design_system.css** - Generated CSS from extraction

## 📚 Usage Tips

1. **Consistency**: Always use the defined color variables rather than hardcoding colors
2. **Spacing**: Use the spacing scale for all margins and paddings
3. **Typography**: Stick to the defined font scale for all text elements
4. **Shadows**: Use the predefined shadow utilities for depth
5. **Transitions**: Apply consistent transition durations across all interactive elements

This design system provides a professional, legal-industry-appropriate aesthetic that maintains consistency across your entire application while being flexible enough to accommodate various components and layouts.