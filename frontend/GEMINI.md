# Project Rules & Design System Guidelines

This document defines the mandatory development, UI/UX, styling, typography, component, and code-quality rules for the Hospital Management System project.

The project follows a **Preline UI-inspired, Tailwind CSS-based design system**. All developers and AI coding agents must follow these rules consistently.

---

# 1. Core Principles

## 1.1 Production First
All code must be written as production-ready code.
* No temporary implementations or placeholder hacks.
* No unnecessary mock logic in production features.
* No duplicated business logic.
* No hardcoded values when they belong to configuration or reusable constants.
* Existing functionality must not be broken when modifying UI.
* Prefer reusable components over repeated markup.
* Keep frontend, backend, API, validation, and state-management responsibilities clearly separated.

## 1.2 Existing UI Must Be Preserved
When modifying an existing page or feature:
* Do not redesign the existing UI unless explicitly requested.
* Do not change spacing, colors, typography, layout, or component behavior unnecessarily.
* If the request is specifically for functionality, change functionality only.
* If the request is specifically for UI/UX, do not modify business logic or API behavior.
* Preserve existing responsive behavior unless responsive improvement is explicitly required.

## 1.3 Consistency Over Creativity
Do not introduce random:
* colors
* fonts
* font sizes
* border radiuses
* shadows
* spacing
* button styles
* icon styles
* component patterns

Every new component must strictly follow the project's existing design tokens.

---

# 2. Strict UI & Form Policies

## 2.1 Input Placeholder Conventions (Mandatory)
* **No Direct or Real Names in Placeholders**:
  - Never use specific human names, doctor names, or sample names as input placeholders (e.g., do **NOT** use `"e.g. Dr. Tanvir Hossain"`, `"Rahim Ahmed"`, `"John Doe"`).
  - Always use clear, generic, action-oriented placeholders such as:
    - `"Enter full name"`
    - `"Enter age"`
    - `"Enter contact number"` / `"Enter phone number"`
    - `"Enter email address"`
    - `"Enter symptoms or medical notes..."`
    - Or similar `"Enter [field]"` style placeholders.

## 2.2 Frontend UI Cleanliness & Package Name Policy (Mandatory)
* **No Technical Package / Library Names in UI**:
  - Never display technical package names, library names, dependencies, or internal tool names on the user-facing frontend UI (e.g., do **NOT** display badges, labels, or text like `"React Hook Form"`, `"Zod"`, `"Tailwind CSS"`, `"React Redux"`, `"Redux Toolkit"`, etc.).
  - The UI must strictly represent the application domain and business features (e.g., *Hospital Management System*, *Patient Admission & Records*, *Appointment Scheduling*), maintaining a clean, production-ready product presentation.

## 2.3 Badge & Label Policy (Mandatory)
* **No Badges Attached to Headings or Field Labels**:
  - Never attach inline pill badges, chip counters, or tags beside headings, section titles, or field labels (e.g., do **NOT** put `"0 total"` or status chips right beside headers).
  - Keep headings and section titles clean, simple, and uncluttered.
  - Badges should only be used as standalone status indicators inside tables, cards, or list items (e.g., indicating `Active`, `Pending`, `Discharged`).

## 2.4 Cursor Pointer Requirement (Mandatory)
* **Interactive Elements Must Have `cursor: pointer`**:
  - Every clickable or interactive element (buttons, `<select>` dropdowns, custom select boxes, tabs, checkboxes, radio buttons, links, clickable list items, modal close buttons) **MUST** have `cursor-pointer` (or `cursor: pointer;`).

## 2.5 Mandatory Cross-Device Responsiveness
* **Universal Screen Support**:
  - The application must adapt fluidly across all device viewports:
    - Mobile: `<640px` (`default` / touch devices)
    - Tablet: `640px - 1024px` (`sm:` and `md:`)
    - Desktop: `1024px - 1280px` (`lg:`)
    - Large Screens: `>1280px` (`xl:` and `2xl:`)
* **Zero Horizontal Scrolling**:
  - Never allow unintended horizontal overflow on mobile screens (`overflow-x-hidden` or responsive container widths).
* **Touch-Friendly Controls**:
  - All interactive tap targets (buttons, inputs, select triggers, links) must meet a minimum target height of `40px` (`h-10` or `min-h-10`).
* **Adaptive Navigation & Data Views**:
  - Top navigation must provide an accessible responsive mobile navigation on small screens.
  - Data tables must degrade gracefully on mobile into responsive stacked card views.
  - Form grids must collapse to single-column layouts on mobile and expand into multi-column grids on tablets/desktops (`grid-cols-1 sm:grid-cols-2`).

## 2.6 Mandatory Theme System (Light, Dark, System)
* **Three Supported Modes**:
  - Every page and component must seamlessly support:
    1. **Light Mode** (`light`): Clean white surface cards (`bg-white`), neutral app background (`bg-gray-50`), crisp gray borders (`border-gray-200`).
    2. **Dark Mode** (`dark`): Deep dark surfaces (`dark:bg-gray-900`), app background (`dark:bg-gray-950`), dark borders (`dark:border-gray-800`), readable text (`dark:text-gray-100`).
    3. **System Mode** (`system`): Automatically matches and synchronizes with the operating system preference (`prefers-color-scheme: dark`).
* **Persistent Preference**:
  - The active theme mode must be stored and persisted in `localStorage`.
* **Theme Switcher Interface**:
  - An accessible theme toggle with Lucide icons (`Sun` for Light, `Moon` for Dark, `Monitor` for System) must be readily accessible in the application navigation.

## 2.7 Mandatory Reusable Component Architecture (Inputs, Dialogs, Buttons, Accordions, etc.)
* **Zero Repeated Primitive Markup**:
  - Never repeat raw inline markup or styling across pages for standard UI building blocks.
  - Every primitive UI element must be constructed and consumed as a modular, standalone reusable component (e.g., inside `src/components/ui/` or dedicated component files).
* **Core Reusable Component Categories**:
  - **Form Controls**: `Input`, `Select`, `Textarea`, `Checkbox`, `Radio`, `Switch`.
  - **Interactive Actions**: `Button`, `IconButton`, `ButtonGroup`.
  - **Overlays & Dialogs**: `Modal` / `Dialog`, `ConfirmDialog`, `Drawer`, `Sheet`.
  - **Disclosure & Layout**: `Accordion`, `Tabs`, `Card`, `Collapse`, `DropdownMenu`.
  - **Feedback & Status**: `Badge`, `Alert`, `Toast`, `SkeletonLoader`.
* **Reusable Component Standards**:
  - **TypeScript First**: Strict prop interfaces extending standard HTML element attributes (e.g., `React.InputHTMLAttributes<HTMLInputElement>`, `React.ButtonHTMLAttributes<HTMLButtonElement>`).
  - **Form Validation Ready**: Form inputs must support `ref` forwarding (`React.forwardRef`) to integrate seamlessly with `React Hook Form` and display field errors cleanly.
  - **Full Theme Support**: Every reusable component must include dark mode classes (`dark:bg-gray-800`, `dark:border-gray-700`, `dark:text-gray-100`, etc.) out of the box.
  - **Interactive Elements**: All interactive controls must strictly include `cursor-pointer`.
  - **Accessibility**: Include appropriate ARIA attributes, semantic tags, and accessible focus states (`focus:ring-2 focus:ring-blue-500/20 focus:outline-none`).

## 2.8 Mandatory Form Validation, Error Handling & Required Indicator Rules
* **Required Field Asterisk (`*`) Standard**:
  - Every mandatory input field **MUST** render an unambiguous red asterisk `*` beside its label:
    `<span className="text-red-600 dark:text-red-400">*</span>`.
  - Reusable form controls (`Input`, `Select`, `Textarea`, etc.) must provide a `required?: boolean` prop that automatically renders the red asterisk and attaches `aria-required="true"`.
  - Non-mandatory fields should explicitly display `(Optional)` in subtle muted text (`text-gray-400 dark:text-gray-500 font-normal`).
* **Client-Side Validation & Error Feedback**:
  - Every form must enforce validation prior to submission using `Zod` schemas and `React Hook Form`.
  - Errors must appear immediately beneath the offending control in clear, readable text:
    `text-xs font-medium text-red-600 dark:text-red-400 mt-1`.
  - The invalid input's border must clearly shift to red:
    `border-red-500 focus:border-red-500 focus:ring-red-500/20`.
  - Error messages must be field-aware, precise, and human-friendly (e.g., `"Enter a valid 11-digit phone number"`).
* **Server-Side Validation & Exception Handling**:
  - When backend APIs return validation errors (e.g., HTTP `422 Unprocessable Entity` or `400 Bad Request` with field maps), the UI must programmatically set field errors using `setError` from `react-hook-form`.
  - Global or unexpected server errors (HTTP `500`, `502`, `503`, network dropped) must be rendered in a dismissible, accessible `Alert` banner at the top of the form, preventing unhandled raw stack traces from showing to the user.
* **Input Helper & Hint Messages**:
  - Non-error informational instructions, guidance, or format examples must be rendered as subtle helper text:
    `text-xs text-gray-500 dark:text-gray-400 mt-1`.
  - When an error occurs, it should replace or clearly supersede the helper text without causing layout jumps.

---

# 3. Design System & Design Tokens

The project uses a **Preline UI-inspired design system** built on Tailwind CSS.
> **Philosophy**: Clean, minimal, professional, consistent, accessible, responsive, and production-ready.

The UI prioritizes:
1. Clarity
2. Consistency
3. Accessibility
4. Usability
5. Performance
6. Maintainability

---

# 4. Color System

## 4.1 Primary Brand / Action Color
Use **Blue** as the primary brand/action color:
* Primary 50:  `#EFF6FF` (`bg-blue-50`)
* Primary 100: `#DBEAFE` (`bg-blue-100`)
* Primary 200: `#BFDBFE`
* Primary 300: `#93C5FD`
* Primary 400: `#60A5FA`
* Primary 500: `#3B82F6` (`focus:ring-blue-500`)
* Primary 600: `#2563EB` (`bg-blue-600` - default primary action)
* Primary 700: `#1D4ED8` (`hover:bg-blue-700` - primary hover)
* Primary 800: `#1E40AF`
* Primary 900: `#1E3A8A`

## 4.2 Neutral / Gray Palette
* Gray 50:  `#F9FAFB` (`bg-gray-50` - main application background)
* Gray 100: `#F3F4F6` (`bg-gray-100` - secondary background)
* Gray 200: `#E5E7EB` (`border-gray-200` - default card/divider borders)
* Gray 300: `#D1D5DB` (`border-gray-300` - input borders)
* Gray 400: `#9CA3AF` (`text-gray-400` - placeholders)
* Gray 500: `#6B7280` (`text-gray-500` - muted / supporting text)
* Gray 600: `#4B5563`
* Gray 700: `#374151` (`text-gray-700` - labels & secondary text)
* Gray 800: `#1F2937`
* Gray 900: `#111827` (`text-gray-900` - primary headings & titles)

## 4.3 Semantic Colors
* **Success**: `#16A34A` (`bg-green-600`, `text-green-700`, `bg-green-50`) - completed status, active states
* **Warning**: `#D97706` (`bg-amber-600`, `text-amber-700`, `bg-amber-50`) - pending states, alerts
* **Danger**:  `#DC2626` (`bg-red-600`, `text-red-700`, `bg-red-50`) - destructive actions, errors, validation failure
* **Info**:    `#2563EB` (`bg-blue-600`, `text-blue-700`, `bg-blue-50`) - informational notices

*Never use semantic colors purely for decoration.*

---

# 5. Background & Surface Hierarchy

Recommended application structure:
```text
Application Container → bg-gray-50 (#F9FAFB)
Sidebar               → bg-white (#FFFFFF)
Navbar                → bg-white (#FFFFFF)
Card / Panel          → bg-white (#FFFFFF)
Input / Select        → bg-white (#FFFFFF)
```

---

# 6. Typography & Text

## 6.1 Font Family
* **Primary font**: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
* Do not introduce another font unless explicitly required.

## 6.2 Scale & Weights
| Role | Size | Weight | Tailwind Classes |
| :--- | :--- | :--- | :--- |
| **Page Title** | 24–30px | 600 (Semibold) | `text-2xl sm:text-3xl font-semibold text-gray-900` |
| **Section Title** | 18–20px | 600 (Semibold) | `text-lg sm:text-xl font-semibold text-gray-900` |
| **Card Title** | 16–18px | 600 (Semibold) | `text-base sm:text-lg font-semibold text-gray-900` |
| **Input Label** | 14px | 500 (Medium) | `text-sm font-medium text-gray-700` |
| **Body Text** | 14px | 400 (Regular) | `text-sm text-gray-600` |
| **Button Text** | 14px | 500 (Medium) | `text-sm font-medium` |
| **Caption / Helper** | 12px | 400 (Regular) | `text-xs text-gray-500` |
| **Error Message** | 12px | 500 (Medium) | `text-xs font-medium text-red-600` |

---

# 7. Button Guidelines

All buttons must have `cursor-pointer`, consistent height, and clear hierarchy:

## 7.1 Primary Action Button
* Background: `bg-blue-600 hover:bg-blue-700 active:bg-blue-800`
* Text: `text-white text-sm font-medium`
* Height: `h-10` (or `py-2.5 px-4`)
* Border Radius: `rounded-lg` (8px)
* Cursor: `cursor-pointer`
* Focus: `focus:outline-none focus:ring-2 focus:ring-blue-500/20`
* Disabled: `disabled:opacity-50 disabled:cursor-not-allowed`

## 7.2 Secondary / Neutral Button
* Background: `bg-white hover:bg-gray-50`
* Border: `border border-gray-300`
* Text: `text-gray-700 text-sm font-medium`
* Cursor: `cursor-pointer`

## 7.3 Danger / Destructive Button
* Background: `bg-white hover:bg-red-50 text-red-600 hover:text-red-700 border border-red-200`
  *(Or `bg-red-600 hover:bg-red-700 text-white` for primary destructive actions)*
* Cursor: `cursor-pointer`

## 7.4 General Button Rules
* No excessive rounded pills for standard buttons.
* No gradients or heavy shadows (`shadow-sm` or border-first).
* Always keep icons aligned with text using flexbox (`inline-flex items-center gap-2`).

---

# 8. Input & Form Guidelines

## 8.1 Inputs & Selects
* **Height**: `40px` (`h-10` or `py-2.5 px-3.5`)
* **Font**: `14px` (`text-sm`)
* **Background**: `bg-white`
* **Border**: `border border-gray-300 rounded-lg`
* **Text**: `text-gray-900 placeholder:text-gray-400`
* **Focus State**: `focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`
* **Dropdowns (`<select>`)**: Must always include `cursor-pointer`.

## 8.2 Form Validation (React Hook Form + Zod)
* Always use field-aware, specific error messages.
* Render errors directly beneath the relevant input using `text-xs font-medium text-red-600`.
* Mark the input border with `border-red-500 focus:border-red-500 focus:ring-red-500/20`.

---

# 9. Card & Surface Rules

* **Background**: `bg-white`
* **Border**: `border border-gray-200`
* **Border Radius**: `rounded-xl` (12px)
* **Shadow**: Subtle only (`shadow-sm`).
* **Padding**: `p-6` (24px) or `p-4 sm:p-6`
* **Principle**: *Border-first, shadow-second.* Avoid heavy shadows (`shadow-xl`, `shadow-2xl`) on standard content cards.

---

# 10. Status Badges & Indicators

Badges must only be used to communicate state/status in context:
* **Success / Active**: `bg-green-50 text-green-700 border border-green-200 px-2.5 py-0.5 rounded-full text-xs font-medium`
* **Warning / Pending**: `bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-medium`
* **Danger / Inactive**: `bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full text-xs font-medium`
* **Neutral**: `bg-gray-100 text-gray-700 border border-gray-200 px-2.5 py-0.5 rounded-full text-xs font-medium`

*Remember: Never attach badges to section titles or field labels.*

---

# 11. Icon Standards

* **Library**: `lucide-react` (Lucide Icons)
* **Sizes**:
  - `14px` (`size-3.5` / `w-3.5 h-3.5`) → Tiny inline badges
  - `16px` (`size-4` / `w-4 h-4`) → Button icons and input prefixes
  - `18–20px` (`size-5` / `w-5 h-5`) → Navigation, header actions
  - `24px` (`size-6` / `w-6 h-6`) → Section / empty-state icons
* **Rules**:
  - Maintain consistent stroke widths (`strokeWidth={2}`).
  - Maintain proper gap (`gap-2`) when combined with text.

---

# 12. States: Empty, Loading, and Errors

Every data-driven feature must handle four distinct states:
1. **Loading**: Use skeleton loaders (`animate-pulse bg-gray-200 rounded`) matching final component layout instead of isolated full-screen spinners.
2. **Success with Data**: Render clean cards/tables adhering to table and card rules.
3. **Success without Data (Empty State)**:
   - Clear icon (Lucide).
   - Clear description explaining what is empty and why.
   - Actionable button (e.g., `Register Patient`).
4. **Error State**: User-friendly, actionable error banner or modal (never expose raw API or SQL traces).

---

# 13. State Management & Frontend Architecture

* **React Redux (Redux Toolkit)**:
  - Store global business data (e.g. auth, hospital departments, active records) in Redux Toolkit slices.
  - Keep local, ephemeral UI state (e.g., form inputs, dropdown open/close) inside React component state (`useState` / React Hook Form).
* **React Hook Form + Zod**:
  - Form validation must be handled via Zod schemas and `zodResolver`.
  - Infer TypeScript types directly from schemas (`z.infer<typeof schema>`).
* **Transitions**: Smooth, subtle micro-interactions (`transition duration-150 ease-in-out`).

---

# 14. Golden Rule

> **Do not create UI based on personal preference. Follow the project's established design system.**
> Every new component, feature, or page must look like it naturally belongs to the existing application. Consistency is more important than visual novelty.
