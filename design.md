# SafeHer --- Responsive UI Design System

**Document:** `design.md`\
**Product:** SafeHer --- Women's Safety Mobile App\
**Purpose:** Establish a consistent, mobile-first visual and interaction
system inspired by the supplied SafeHer reference image.

------------------------------------------------------------------------

## 1. Design direction

SafeHer should feel **reassuring, clear, modern, discreet, and
dependable**. Use the reference image's soft pink gradient, rose
accents, white surfaces, rounded cards, subtle shadows, and friendly
line icons as the visual foundation.

The reference image is a promotional mockup, not a complete production
interface. Use it for visual direction, but prioritize usability and
accessibility over decorative effects. The app must feel calm during
ordinary use and become highly legible during an emergency.

### Design principles

1.  **Mobile first:** Design for a narrow phone viewport before adapting
    to tablet and desktop.
2.  **Safety before decoration:** SOS, location status, journey state,
    and emergency actions must be immediately understandable.
3.  **Consistent patterns:** Reuse the same spacing, typography, button
    styles, card treatments, icon sizes, and status language.
4.  **Calm, not childish:** Pink is the brand accent, balanced with deep
    plum text, white surfaces, and neutral backgrounds.
5.  **Trust through transparency:** Clearly show when location is
    active, who can see it, whether an alert was sent, and when data was
    last updated.
6.  **Accessible contrast:** Never use pale pink text for essential
    information on a white background.
7.  **Progressive disclosure:** Show the most important action first;
    place secondary controls and detailed settings one level deeper.

------------------------------------------------------------------------

## 2. Brand and visual identity

### Brand personality

-   Reassuring, not alarmist
-   Feminine in colour direction without relying on stereotypes
-   Professional and credible
-   Friendly and easy to understand
-   Action-oriented when safety is at stake

### Colour palette

Use the following as initial design tokens. The hex values are
implementation starting points inspired by the reference image and
should be validated against contrast requirements.

  -----------------------------------------------------------------------
  Token                   Hex                     Intended use
  ----------------------- ----------------------- -----------------------
  `brand-rose-700`        `#C2185B`               Primary actions,
                                                  selected navigation,
                                                  high-emphasis brand
                                                  elements

  `brand-rose-600`        `#D81B60`               Primary brand colour
                                                  and active controls

  `brand-rose-500`        `#EC407A`               Decorative accents and
                                                  selected icons

  `brand-pink-300`        `#F48FB1`               Soft accent surfaces
                                                  and illustrations

  `brand-pink-100`        `#FCE4EC`               Selected chips, soft
                                                  callouts, subtle
                                                  backgrounds

  `brand-pink-50`         `#FFF5F8`               App background tint and
                                                  empty-state surfaces

  `plum-900`              `#321525`               Main text and headings

  `plum-700`              `#5A3447`               Secondary emphasis

  `neutral-700`           `#454047`               Body text

  `neutral-500`           `#77717A`               Supporting text and
                                                  metadata

  `neutral-300`           `#E6DFE4`               Borders and dividers

  `neutral-100`           `#F7F4F6`               Neutral page
                                                  backgrounds

  `surface`               `#FFFFFF`               Cards, sheets, forms,
                                                  navigation

  `success`               `#217A52`               Confirmed, completed,
                                                  or delivered states

  `warning`               `#946200`               Delays, stale location,
                                                  attention required

  `danger`                `#B42332`               Critical errors and
                                                  destructive actions

  `info`                  `#245CA6`               Informational status
  -----------------------------------------------------------------------

### Colour rules

-   Use rose for branding and normal primary actions, not as the only
    indication of an emergency.
-   Use a high-contrast danger red for SOS and critical danger states.
    Keep SOS visually distinct from the standard pink primary button.
-   Do not communicate status using colour alone; pair colour with a
    label and icon.
-   Keep most screens white or near-white. Reserve gradients for
    onboarding, welcome areas, and limited decorative sections.
-   Use pale pink as a background tint, never for small body text.
-   Avoid placing long paragraphs over gradients or images.

### Suggested gradient

Use a restrained gradient for onboarding headers or hero backgrounds
only:

``` css
background: linear-gradient(135deg, #FFF5F8 0%, #FCE4EC 55%, #F8D7E5 100%);
```

Do not use a full-screen gradient behind every page. Main app screens
should prioritize clean white surfaces and readable information.

------------------------------------------------------------------------

## 3. Typography

Use a modern, highly readable sans-serif typeface. Recommended stack:

``` css
font-family: Inter, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
```

If Inter is not bundled, the system font fallback is acceptable.

  Style          Mobile size     Weight Usage
  ------------ ------------- ---------- ---------------------------------------
  Display          30--34 px        700 Welcome and onboarding headline
  H1               26--30 px        700 Main page title
  H2               20--24 px   650--700 Major section title
  H3               17--20 px        600 Card title
  Body             15--16 px        400 Main content
  Body small       13--14 px   400--500 Descriptions and supporting text
  Label            12--13 px        600 Input labels, chips, compact controls
  Caption          11--12 px   400--500 Timestamps and secondary metadata

### Typography rules

-   Body text should generally be at least 14 px.
-   Use sentence case, not all caps, for most headings and actions.
-   Keep line height around 1.45--1.6 for body text.
-   Avoid long blocks of centered text on functional screens.
-   Use tabular numerals for timers, distances, and arrival times where
    supported.
-   Never rely on thin font weights for important status messages.

------------------------------------------------------------------------

## 4. Layout, spacing, and responsive behaviour

Use a 4 px base spacing system. Common spacing values are 4, 8, 12, 16,
20, 24, 32, and 40 px.

  Token          Value Typical use
  ------------ ------- -----------------------------
  `space-1`       4 px Icon-to-label micro spacing
  `space-2`       8 px Compact control spacing
  `space-3`      12 px Card internal gaps
  `space-4`      16 px Standard screen padding
  `space-5`      20 px Form and section spacing
  `space-6`      24 px Major card padding
  `space-8`      32 px Section separation
  `space-10`     40 px Large page separation

### Mobile-first breakpoints

Use content-driven breakpoints; these are suggested defaults:

-   **Small mobile:** up to 359 px
-   **Mobile:** 360--767 px
-   **Tablet:** 768--1023 px
-   **Desktop:** 1024 px and above
-   **Wide desktop:** 1440 px and above

### Responsive rules

#### Mobile (default)

-   Use a single-column layout.
-   Apply 16 px horizontal page padding, with 12 px only on very narrow
    screens when necessary.
-   Keep primary actions full-width when that improves speed and
    accuracy.
-   Use a fixed bottom navigation bar for the app's top-level
    destinations.
-   Keep important actions above the fold where practical.
-   Respect device safe areas and browser bottom bars.
-   Avoid horizontal scrolling except for intentional, labelled filter
    chips.
-   Use bottom sheets for compact actions when they preserve context and
    are accessible.

#### Tablet

-   Increase outer page padding to 24--32 px.
-   Use two-column layouts only where they improve comprehension, such
    as a map beside a facility list.
-   Keep emergency actions prominent and avoid stretching text forms
    excessively.

#### Desktop

-   Use a centered content container with a maximum width of
    approximately 1200 px.
-   Use a sidebar or compact desktop navigation rather than enlarging
    the mobile bottom bar.
-   Keep text-heavy content within a readable line length.
-   For map views, use a map/list split layout when space permits.
-   Do not scale every mobile component proportionally; reorganize the
    layout for the available space.

Example CSS:

``` css
:root {
  --page-gutter: 16px;
  --content-max: 1200px;
}

.app-page {
  width: 100%;
  max-width: var(--content-max);
  margin-inline: auto;
  padding-inline: var(--page-gutter);
}

@media (min-width: 768px) {
  :root { --page-gutter: 28px; }
}

@media (min-width: 1024px) {
  :root { --page-gutter: 32px; }
}
```

------------------------------------------------------------------------

## 5. Shape, elevation, and surface system

The reference uses rounded cards and soft shadows. Keep these treatments
consistent and restrained.

  Element                                    Radius
  ----------------------------- -------------------
  Small icon container / chip             10--12 px
  Input                                   12--14 px
  Standard card                           16--20 px
  Large feature card                      20--24 px
  Bottom sheet                    24 px top corners
  Pill button / status chip                  999 px

### Elevation

-   Default card: subtle border, minimal shadow.
-   Floating bottom navigation: subtle shadow and a white surface.
-   Modal and bottom sheet: stronger elevation plus a dimmed backdrop.
-   Avoid shadows on every nested element.
-   Use a clear border when shadow alone does not sufficiently
    distinguish a surface.

Suggested CSS:

``` css
.card {
  background: #FFFFFF;
  border: 1px solid #F0E7EC;
  border-radius: 18px;
  box-shadow: 0 4px 16px rgba(71, 28, 49, 0.06);
}

.card--interactive {
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.card--interactive:focus-within {
  outline: 3px solid rgba(216, 27, 96, 0.22);
  outline-offset: 2px;
}
```

Do not use heavy glassmorphism, blurred surfaces, or decorative glow
effects on emergency and tracking screens. These can reduce clarity and
may compromise legibility.

------------------------------------------------------------------------

## 6. Buttons and touch targets

### Button hierarchy

1.  **Primary:** rose background with white text for the main
    non-emergency action.
2.  **Secondary:** white or pale-pink surface with a visible border.
3.  **Tertiary:** text or icon button for low-priority actions.
4.  **Destructive / emergency:** high-contrast danger treatment, used
    only for critical actions.
5.  **Disabled:** visibly disabled and not mistaken for an action that
    is processing.

### Sizing

-   Standard button height: 48--52 px.
-   Compact button height: at least 40 px where space is constrained.
-   Interactive touch targets: aim for 44 × 44 px minimum; use larger
    targets for critical actions.
-   Use clear labels such as "Start journey", "Share journey", "Call
    112", and "End sharing".
-   Avoid icon-only buttons unless the icon is universally understood
    and has an accessible name.
-   Provide pressed, focus, disabled, loading, success, and failure
    states.

### SOS control

-   Use a dedicated danger-red control, not the normal rose primary
    button.
-   Keep it visually consistent across the home screen and journey
    screens.
-   Give it a clear "SOS" label and an accessible name.
-   Do not depend on a tiny icon or colour alone.
-   Use the established product activation flow, such as press-and-hold
    or a short cancellable countdown. Test it with users to balance
    accidental activation against quick access.
-   Display what the app is doing after activation. Do not imply
    emergency services have been contacted unless this is confirmed by
    an actual integration.

------------------------------------------------------------------------

## 7. Navigation and information architecture

### Mobile bottom navigation

Limit primary navigation to **four or five destinations**. Suggested
structure:

1.  **Home** --- safety overview and quick actions
2.  **Journey** --- plan, start, and manage a trip
3.  **Map** --- facilities and community reports
4.  **Activity** --- journey history and incident status
5.  **Profile** --- trusted contacts, privacy, permissions, and settings

The SOS action should remain prominent and accessible independently of
the selected tab. Do not turn the bottom navigation into a row of many
small icons.

### Navigation rules

-   Use the same icon and label for the same destination everywhere.
-   Highlight the active tab with both colour and another cue, such as a
    filled icon or indicator.
-   Preserve navigation state when users return from a detail page.
-   Provide clear back navigation and meaningful page titles.
-   Avoid duplicate destinations or different labels for the same
    feature.
-   Keep account, privacy, contact management, and notification
    preferences in predictable locations.

------------------------------------------------------------------------

## 8. Screen-level design requirements

### 8.1 Onboarding and sign-in

**Visual direction:** Use the reference's soft pink gradient sparingly,
with the SafeHer brand mark, concise headline, and a calm illustration
or abstract shield motif.

-   Explain the app's core benefits in plain language.
-   Request location and notification permissions at the point they are
    needed, with a clear explanation.
-   Do not require continuous location permission just to register.
-   Keep forms short and readable on small screens.
-   Show validation messages next to the relevant field.
-   Never use a permission prompt as a substitute for explaining the
    data practice.

### 8.2 Home dashboard

**Priority order:**

1.  Greeting and concise status summary.
2.  Current journey state, if a journey is active.
3.  Prominent SOS action.
4.  Start or plan a journey.
5.  Trusted contacts and nearby help.
6.  Recent relevant updates, such as an overdue check-in or a failed
    notification.

Use a compact grid for secondary quick actions, but do not allow
decorative cards to push SOS or an active journey below several screens
of scrolling.

### 8.3 Journey planner

-   Put origin and destination fields at the top.
-   Use a large map, but preserve enough space for route choices and
    controls on mobile.
-   Show distance and estimated duration clearly.
-   Explain route alternatives without unsupported "safe route" claims.
-   Show nearby verified facilities and their verification status.
-   Provide a clear "Start journey" action.
-   Handle loading, no route found, GPS unavailable, and network failure
    states.
-   On desktop, allow a map/list split view.

### 8.4 Active journey

This is a high-priority screen and should be calmer than the promotional
reference image.

Display:

-   Destination and estimated arrival time.
-   Journey status.
-   Last location update and accuracy, where available.
-   Sharing status and the names or count of authorized viewers.
-   Actions to extend, finish, or cancel the journey.
-   Persistent access to SOS and direct emergency calling.

Avoid continuously pulsing location markers or alarming animations. If
tracking stops, communicate it clearly and offer the next useful action.

### 8.5 SOS and incident status

-   Use a clear incident timeline.
-   Separate "Alert recorded", "Notification sent", "Delivery
    confirmed", and "Failed" states.
-   Use plain language and a visible timestamp.
-   Keep direct calling prominent.
-   Do not show fake success states or an animation that suggests help
    is on the way when that is not known.
-   If an external provider fails, explain the failure and show
    available alternatives.

### 8.6 Nearby facilities

-   Provide search and category filters.
-   Show name, type, distance, address, contact option, and directions.
-   Distinguish verified, unverified, and stale information.
-   Do not use a verification badge unless a real verification process
    supports it.
-   Make list results usable without needing to interact with a tiny map
    pin.

### 8.7 Community safety reports

-   Use neutral, factual categories such as poor lighting, road
    obstruction, isolated stretch, or reported harassment.
-   Show report age and verification state.
-   Let users flag inaccurate or abusive reports.
-   Avoid publishing personal identities or unverified accusations.
-   Clearly indicate that reports can become outdated.

### 8.8 Trusted contacts and privacy

-   Show who is authorized to receive alerts or view journeys.
-   Explain exactly what each permission grants.
-   Make revoke, remove, and stop-sharing actions easy to locate.
-   Confirm consequential changes without burying the user in dialogs.
-   Avoid exposing sensitive contact or location information in
    notification previews by default.

------------------------------------------------------------------------

## 9. Components and consistency rules

Build a shared component library rather than styling each screen
independently.

### Required shared components

-   `AppHeader`
-   `BottomNavigation`
-   `PrimaryButton`
-   `SecondaryButton`
-   `SOSButton`
-   `StatusBadge`
-   `InfoCard`
-   `QuickActionCard`
-   `FormField`
-   `PermissionDisclosure`
-   `JourneyStatusCard`
-   `LocationFreshnessIndicator`
-   `FacilityCard`
-   `EmptyState`
-   `ErrorState`
-   `LoadingSkeleton`
-   `ConfirmationDialog`
-   `BottomSheet`
-   `Toast` or inline feedback component

### Component rules

-   Each component should use design tokens, not hard-coded one-off
    colours.
-   Define consistent loading, error, empty, disabled, and success
    states.
-   Use the same radius, spacing, icon scale, and typography rules
    across the application.
-   Reuse form validation and error presentation patterns.
-   Use one icon family consistently; avoid mixing emoji, filled icons,
    and unrelated outline styles.
-   Prefer simple line icons similar to the reference, with consistent
    stroke weight.
-   Icons must be decorative or have accessible labels; do not leave
    ambiguous icon-only controls.

### Status language

Use consistent labels throughout the product:

-   **Active:** journey sharing is currently enabled.
-   **Paused:** updates are intentionally paused, if this state is
    supported.
-   **Last updated:** the time of the most recent location update.
-   **Sent:** the provider accepted or sent the notification, according
    to its documented semantics.
-   **Delivered:** only when the channel provides delivery confirmation.
-   **Failed:** delivery attempt failed.
-   **Simulated:** development-only notification; no real message was
    sent.
-   **Expired / Revoked:** a share link no longer grants access.

Do not use "Safe", "Protected", or "Help is coming" as a status unless
the product can substantiate the claim.

------------------------------------------------------------------------

## 10. Interaction, feedback, and motion

-   Use short transitions, generally 150--220 ms.
-   Prefer opacity and small position changes over large animated
    movement.
-   Respect `prefers-reduced-motion`.
-   Never make SOS access depend on animation completion.
-   Provide visible feedback after save, share, revoke, report, and
    cancellation actions.
-   Use inline error messages for field-specific problems.
-   Use a confirmation dialog for irreversible or high-impact actions.
-   Avoid excessive popups, confetti, gamification, or celebratory
    visuals in safety workflows.
-   Ensure loading states do not resemble completed actions.
-   Avoid auto-dismissing critical delivery failures before the user can
    read them.

------------------------------------------------------------------------

## 11. Accessibility requirements

Target **WCAG 2.2 AA** as the baseline.

-   Maintain at least 4.5:1 contrast for normal text and 3:1 for large
    text and applicable UI components.
-   Do not use pale pink text on white for essential information.
-   Ensure all controls are keyboard accessible.
-   Provide visible keyboard focus states.
-   Add meaningful accessible names to icon buttons.
-   Support screen readers with correct headings, labels, status
    announcements, and form errors.
-   Avoid conveying state through colour alone.
-   Support text scaling without clipped labels or inaccessible
    controls.
-   Keep touch targets sufficiently large and separated.
-   Ensure maps have a usable list alternative.
-   Respect reduced-motion preferences.
-   Test important flows using Android screen readers and keyboard
    navigation where applicable.

------------------------------------------------------------------------

## 12. Responsive QA checklist

Test at a minimum of:

-   320 × 568
-   360 × 800
-   390 × 844
-   430 × 932
-   768 × 1024
-   1024 × 768
-   1440 × 900

### Acceptance criteria

-   [ ] No unintended horizontal scrolling at supported widths.
-   [ ] No clipped text, buttons, status badges, or form fields.
-   [ ] Bottom navigation respects device safe areas.
-   [ ] The SOS control remains easy to locate on primary screens.
-   [ ] The home screen prioritizes active journey state and key
    actions.
-   [ ] Map interactions work with touch and have a list alternative.
-   [ ] Loading, offline, permission-denied, and error states are
    designed.
-   [ ] Text remains readable at larger accessibility sizes.
-   [ ] Buttons and form controls meet touch-target expectations.
-   [ ] The same component looks and behaves consistently on all
    screens.
-   [ ] Desktop layouts reorganize content rather than stretching mobile
    UI.
-   [ ] Contrast and screen-reader checks pass on critical flows.
-   [ ] Notification and SOS states do not overstate delivery or
    emergency response.

------------------------------------------------------------------------

## 13. Implementation guidance for the existing project

This document is a design specification, not a request to rebuild the
product from scratch.

1.  Audit the existing React + Vite frontend and identify the current
    page/component structure.
2.  Inventory existing colours, fonts, spacing, card styles, buttons,
    icons, and navigation.
3.  Introduce shared design tokens and global CSS variables.
4.  Refactor repeated patterns into shared components before restyling
    every screen.
5.  Update the mobile home screen and active-journey/SOS flows first.
6.  Apply the same component system to journey planning, facilities,
    reports, contacts, and settings.
7.  Improve responsive behaviour using the breakpoints and rules above.
8.  Preserve existing API contracts and working backend features unless
    a change is required.
9.  Do not fabricate backend functionality in the UI. If a feature is
    unavailable, show an honest unavailable or setup-required state.
10. Run responsive, accessibility, and critical-flow regression tests
    after each phase.

### Recommended implementation order

**Phase 1:** Design tokens, typography, buttons, cards, inputs, icon
system, and navigation.

**Phase 2:** Home dashboard, SOS control, active journey, incident
status, and trusted-contact access.

**Phase 3:** Journey planner, map/facility list, and community reports.

**Phase 4:** Profile, privacy settings, onboarding, empty/error/loading
states, and responsive refinements.

**Phase 5:** Accessibility audit, real-device testing, and visual
consistency review.

------------------------------------------------------------------------

## 14. Definition of design done

The design is complete when the application has one coherent visual
language across mobile, tablet, and desktop; core actions are easy to
discover; all interactive states are specified; the pink brand theme
remains readable; and emergency screens communicate only what the system
actually knows.

**Final design direction:** Use the reference image for the SafeHer
brand's soft rose palette, rounded geometry, gentle gradient, and
consistent line-icon style. Keep the actual application cleaner and more
restrained than the promotional mockup. Safety information should always
take priority over decorative elements.
