# Urban Guardian — Product Requirements Document

**Document version:** 1.1  
**Date:** 30 October 2026  
**Product:** Urban Guardian — Pune Women's Safety & Journey Protection  
**Document purpose:** Guide improvements to the existing application, not a ground-up rewrite.

---

## 1. Executive Summary

Urban Guardian is a mobile-first personal safety application for women travelling in Pune, Maharashtra. The existing project already includes a useful foundation: route planning using OSRM, trusted journey sharing, SOS alerts, a Pune facilities directory, community hazard reports, trusted contacts, Web Push, Socket.IO location updates, and a FastAPI movement-anomaly service.

The next version should focus on **making these existing features clearer, more dependable, easier to use on a phone, and more trustworthy**. Add features only where they solve a real user problem or close a safety-critical gap. Avoid adding AI or decorative dashboards merely to make the product appear more advanced.

The app must be honest about what it can and cannot do. A stored SOS is not proof that an SMS was delivered. An SMS marked sent is not proof that a contact read it. A shared journey is not police monitoring. A route, facility, or community report is not a guarantee of safety.

### Product vision

Help women prepare for a journey, keep selected people informed when they choose, find nearby assistance, and access emergency actions quickly—with minimal friction and strict control over personal location data.

### Product principles

1. **Emergency actions first:** critical actions must be reachable quickly from every primary screen.
2. **Mobile-first:** design for small screens, one-handed use, variable connectivity, and interruptions.
3. **Trust through transparency:** show location freshness, notification status, facility verification, and feature limitations.
4. **Privacy by default:** no public live location, no unnecessary background tracking, and no hidden sharing.
5. **Improve before expanding:** audit and refine existing features before replacing them or adding complex systems.
6. **No false assurance:** never invent safety scores or claim that authorities or contacts have responded without evidence.
7. **Accessible and calm:** use clear language, readable contrast, predictable navigation, and restrained visual design.

## 2. Existing Product Baseline

Based on the current README, the project has the following implementation areas. Their presence in the repository should not be treated as proof that every flow is production-ready; each must be verified through code review and real-device testing.

| Existing capability | Current foundation | Product direction |
|---|---|---|
| Pune Journey Planner | React/Leaflet, OSRM routes, alternatives and facility overlays | Simplify route selection; explain route data and limitations; improve mobile map controls |
| Trusted Journey Sharing | Trip lifecycle, expiring share tokens, live location and overdue monitoring | Make consent, sharing status, arrival confirmation and revocation obvious |
| Emergency SOS | Countdown, persistent incident, SMS/mock provider, status logging, direct-call links | Improve activation ergonomics, failure recovery, contact feedback and test-mode separation |
| Pune Facilities | Police, hospitals, transit facilities and navigation links | Validate every record; show source, verification date, hours where confirmed, and data freshness |
| Community Reports | Hazard reports, nearby duplicate merging, votes, abuse flags and expiry | Improve report quality, moderation, freshness labels and protection against identifying individuals |
| Trusted Contacts | Contact management and test notifications | Improve contact verification, consent and notification preferences |
| Web Push | Service worker and push subscriptions | Explain permissions and limitations; provide non-push fallback |
| Movement anomaly service | FastAPI heuristics | Keep optional and conservative; do not make core SOS depend on ML |
| Authentication | JWT-based register/login | Review session security, recovery, rate limiting and authorization on every resource |

## 3. Target Users and Main Jobs to Be Done

### Primary users

- College students and hostel residents travelling between campus, transport hubs and accommodation.
- Working professionals commuting early or late.
- Women travelling alone through unfamiliar areas or changing between walking, transit and ride-hailing.
- Trusted contacts who need a clear, limited view of a journey when the user explicitly shares it.

### User needs

- “I need to start sharing my journey without configuring many settings.”
- “If I need help, I need to reach emergency actions immediately.”
- “I want to know whether my location is actually updating.”
- “I need to know if a contact notification failed, not just assume it worked.”
- “I want useful local information without being told a road is safe based on an invented score.”
- “I need to stop sharing and be certain the link no longer works.”

## 4. Product Scope and Priorities

### P0 — Must be reliable for the MVP

- Mobile-first home screen and consistent app navigation.
- SOS activation, persistence, status reporting and direct emergency-call fallback.
- Trusted contacts with clear consent and permissions.
- Trusted journey start, live sharing, overdue check-in, arrival and immediate revocation.
- Accurate location freshness and permission states.
- Verified facilities directory and external navigation.
- Authentication, authorization and sensitive-data controls.
- Clear offline, GPS-unavailable, notification-failure and service-unavailable states.

### P1 — Valuable next improvements

- Refined journey planner and route comparison.
- Better community reporting, verification, abuse handling and expiry.
- Journey check-in prompts and configurable grace periods.
- Notification preferences and test mode.
- Accessible interface, Marathi/Hindi localization foundations and real-device reliability testing.
- Optional, explainable movement anomaly prompts after core flows are dependable.

### P2 — Consider after pilot feedback

- Optional discreet activation shortcuts, subject to usability and platform constraints.
- Institution/hostel safety workflows, only with explicit user consent and a defined response process.
- Aggregated infrastructure hazard insights with privacy-preserving analytics.
- Native Android evaluation if reliable background location cannot be achieved with the PWA.

### Out of scope for the initial release

- Claiming direct police dispatch without a formally authorized integration.
- Public tracking feeds or public live user locations.
- Facial recognition or automated identification of alleged offenders.
- Automatic recording enabled by default.
- Predictive crime maps or unsupported numerical “safety scores”.
- A volunteer response network without vetting, operations, liability and safeguarding procedures.
- Making AI anomaly detection a dependency for SOS or journey sharing.

## 5. Information Architecture and Mobile Navigation

### Main navigation

Use a small, consistent bottom navigation on mobile:

1. **Home** — quick actions and active journey state.
2. **Journey** — route planner and current trip.
3. **Nearby** — verified facilities and community reports.
4. **Contacts** — trusted contacts and sharing preferences.
5. **Settings** — privacy, permissions, language, notifications and account.

The SOS action must remain visually distinct and reachable from the Home, Journey and active-journey views. Do not use a bottom navigation bar with too many destinations. On wider screens, adapt to a sidebar or compact top navigation without changing the information hierarchy.

### Home screen content order

1. **Current state:** “No active journey”, “Journey in progress”, or a clear location/connection warning.
2. **Primary action:** “Plan a journey” or “Continue journey”.
3. **Emergency action:** prominent SOS control with a clear label.
4. **Quick access:** “Share my journey”, “Nearby help”, and “Trusted contacts”.
5. **Recent status:** last journey or incident status, only when useful and without exposing sensitive data on a shared screen.

Avoid decorative charts, large welcome banners, multiple competing cards, excessive gradients, and long explanatory paragraphs on the home screen.

## 6. UI and Visual Design Requirements

### Design direction

Use a calm, modern, high-contrast interface. The app should feel dependable and legible, not like a gaming dashboard or a generic glassmorphism template.

- Use a light theme as the default for outdoor readability; support dark mode if already implemented and tested.
- Use a restrained neutral background, one consistent brand accent, and red only for urgent/destructive emergency states.
- Keep cards simple with subtle borders and limited shadows. Avoid excessive blur, translucent panels, gradients and nested cards.
- Use consistent typography, spacing, icon sizes, border radii and button heights.
- Use icons with text labels for safety-critical actions; do not rely on icon-only controls.
- Use plain language: “Location last updated 2 minutes ago” rather than “GPS sync degraded”.
- Do not use green badges to imply a person or route is safe. Use neutral, factual statuses.

### Mobile-first layout

- Design from a 360 px wide viewport upward; validate at 320 px and common Android screen sizes.
- Use a single-column layout on phones and progressive enhancement for tablets/desktop.
- Keep primary controls within comfortable thumb reach where feasible.
- Use minimum 44 × 44 CSS px interactive targets; aim for 48 × 48 px for primary actions.
- Respect safe-area insets and device keyboard behaviour.
- Prevent horizontal scrolling, clipped dialogs, map-control overlap and buttons hidden behind the bottom navigation.
- Use bottom sheets for route details and nearby facility previews where appropriate, with accessible full-screen alternatives.
- Keep forms short; use sensible defaults and preserve entered data after recoverable errors.
- Support keyboard navigation, screen readers, visible focus states, scalable text and sufficient contrast (target WCAG 2.2 AA).

### SOS visual and interaction requirements

- The SOS control must be visually prominent but not easy to trigger accidentally while scrolling.
- Use a clearly described activation interaction, such as press-and-hold or a short cancellable countdown. Test the interaction with users; do not add a confirmation step that delays help unnecessarily.
- During countdown, show the remaining time and a large, clearly labelled cancel action.
- After activation, show an incident state with the next actions: notification status, direct call to 112, and current location status.
- Do not use animation that obscures the state or imply help is on the way without confirmation.
- Do not depend on colour alone to communicate success, failure or urgency.

### Required UI states

Every major feature must include designed states for:

- Loading and first use.
- Empty state with a clear next action.
- Permission not granted.
- GPS unavailable or low accuracy.
- Offline or intermittent network.
- Data stale or update delayed.
- API/provider error with retry or fallback.
- Success with a precise description of what succeeded.
- Expired or revoked link.
- Test/simulated notification mode.

## 7. Detailed Functional Requirements

### FR-01 — SOS and Emergency Workflow (P0)

**Goal:** Allow a user to trigger an emergency incident quickly and understand what the system did.

Requirements:

1. SOS must be accessible from all primary safety screens.
2. Support a tested activation interaction with a short cancellation window; provide clear feedback during activation.
3. Create a unique incident record before attempting external notifications.
4. Include the latest available coordinates, accuracy, timestamp and location age when available. If location is unavailable, create the incident anyway and explain the limitation.
5. Notify configured contacts through enabled channels and record each attempt separately.
6. Keep direct calling to India’s emergency number 112 available as an immediate action. Additional numbers must be verified against current official sources before release.
7. Distinguish `queued`, `sent_to_provider`, `delivered` (only where delivery receipts support it), `simulated`, and `failed`. Use wording appropriate to the actual provider response.
8. Retry transient failures safely with idempotency protection. Do not create duplicate incidents for the same activation.
9. Allow cancellation of accidental alerts while preserving an appropriate audit event. Do not silently delete the incident record.
10. Offer optional evidence capture only after a separate privacy and legal review; disabled by default.
11. Keep the emergency workflow independent of the ML service.
12. Provide a post-incident status and a way to mark the incident resolved without implying external responders have confirmed resolution.

**Acceptance criteria**

- If the SMS provider is down, the incident remains persisted and the UI shows a failure state and direct-call option.
- A missing GPS fix does not prevent incident creation.
- Repeated network requests do not generate duplicate incidents or repeated notifications beyond the defined retry policy.
- The UI never claims that police have been dispatched unless a verified authorized integration confirms that state.
- A simulated notification is visibly labelled as a test/simulation and cannot be mistaken for a real SMS.

### FR-02 — Trusted Contacts (P0)

1. Allow add, edit, remove and prioritization of trusted contacts.
2. Verify contact details where technically feasible before relying on them for critical notifications.
3. Explain which events a contact receives: SOS, journey share, overdue check-in, or test notification.
4. Provide a clearly labelled test flow and show whether the test was simulated or sent through a live provider.
5. Do not share location with a contact unless the user has authorized the relevant journey or incident sharing.
6. Allow immediate contact removal and revocation of that contact’s active access.
7. Prevent enumeration of registered users and exposure of contact details through API errors or logs.

**Acceptance criteria:** A contact without active authorization cannot retrieve journey coordinates or subscribe to live location events.

### FR-03 — Trusted Journey Sharing (P0)

1. Start a journey with origin, destination and expected arrival time; allow editing the ETA.
2. Explain exactly what is shared, with whom and until when before creating a share link.
3. Generate a cryptographically random, unguessable token; store a hash where practical.
4. Show an active-sharing indicator and the last location update time.
5. Allow extension, arrival confirmation, cancellation and early completion.
6. Trigger an overdue check-in after the configured ETA plus a user-configurable grace period.
7. Use a staged workflow: prompt the traveller first when possible, then notify chosen contacts according to preferences.
8. Treat missed arrival as an unconfirmed check-in, not evidence of assault.
9. Revoke the token immediately on completion, cancellation, expiry or manual revocation.
10. Share only the minimum information required and never expose historical location to a share-link viewer.
11. If location updates stop, display the last update timestamp and a stale-location warning to the viewer.

**Acceptance criteria:** A revoked or expired link cannot retrieve current location, past location, or journey details beyond any explicitly permitted minimal expiry message.

### FR-04 — Journey Planner and Route Comparison (P0/P1)

1. Keep OSRM-based route calculation and map geometry where reliable.
2. Improve origin/destination search for Pune landmarks, neighbourhoods and common transport hubs.
3. Present route alternatives with distance, ETA and clear selection; do not label any route “safe” without validated evidence.
4. Show nearby verified facilities as optional overlays that do not overwhelm the map.
5. Keep map controls, route cards and destination selection usable on narrow screens.
6. Provide a list-based route summary as an alternative to map-only interaction.
7. Clearly label estimated travel times and identify when routing is unavailable.
8. Provide external navigation links when appropriate, while explaining that navigation occurs in another application.
9. Avoid sending precise location to analytics or unrelated third parties.

**Acceptance criteria:** A user can choose a destination, compare available routes and start optional journey sharing on a mobile screen without horizontal scrolling or obscured controls.

### FR-05 — Nearby Help and Facility Directory (P0)

1. Maintain categories for police stations, hospitals, emergency services and transport facilities.
2. Show name, category, address, distance, directions, phone number where verified, source and last verification date.
3. Distinguish official/verified records from unverified or community-supplied information.
4. Do not claim 24/7 availability unless supported by a reliable source and a current verification process.
5. Support category filters and distance sorting, with a list alternative to the map.
6. Allow facility lookup without requiring continuous location access; offer manual area search when GPS is denied.
7. Provide a correction/report-information flow.

**Acceptance criteria:** Every facility shown as verified has a documented source and verification timestamp; stale records are flagged or rechecked.

### FR-06 — Community Safety Reports (P1)

1. Support relevant categories such as poor lighting, isolated road, obstruction, harassment concern and other infrastructure hazard.
2. Capture only the information needed: category, approximate location, time and optional description.
3. Display report age and moderation/verification status prominently.
4. Merge or link duplicate reports within the existing approximate 150 m radius where suitable; avoid automatically combining reports that refer to different incidents or conditions.
5. Provide report flagging and a moderation queue with reason codes.
6. Expire reports after 30 days by default, as described in the existing baseline, with an option for earlier expiry or revalidation based on category.
7. Prevent publication of names, phone numbers, identifiable photos, accusations against named people or other doxxing content.
8. Apply rate limits and abuse detection; do not allow votes to be presented as proof that a report is true.
9. Show reports as community-submitted information, not as official police data.

**Acceptance criteria:** A report clearly shows its age and status, and users can flag abusive content. Expired reports are not presented as current.

### FR-07 — Push Notifications and Notification Preferences (P1)

1. Ask for browser notification permission only after explaining the benefit, not immediately on first load.
2. Explain that browser push and background execution can be restricted by device settings, browser support, battery saving or network conditions.
3. Offer event preferences for journey updates, overdue check-ins, SOS status and test notifications.
4. Avoid sensitive location details in lock-screen notifications by default.
5. Provide SMS/direct-call fallback where configured; do not imply push is guaranteed.
6. Show a clear notification test result and the provider mode.

### FR-08 — Optional Movement Anomaly Prompts (P1, only after P0 reliability)

1. Start with transparent rules such as missed ETA, prolonged stop or substantial route deviation.
2. Make anomaly assistance opt-in and explain what signals are used.
3. Allow configuration of thresholds and grace periods where feasible.
4. Prompt for confirmation before escalation unless the user explicitly configures a different workflow.
5. Never label an anomaly as an assault or crime.
6. Keep the feature operationally separate from core SOS.
7. Measure false positives and allow the user to disable the feature.

### FR-09 — Privacy and Safety Centre (P0)

Add a dedicated screen with:

- Current active journeys and who can see each one.
- One-tap stop-sharing/revoke action.
- Location and notification permissions with plain-language explanations.
- Trusted contacts and the events each receives.
- Data retention and account deletion information.
- Recent security-sensitive actions, such as share-link revocation.
- A clear statement of the app’s emergency limitations.

**Acceptance criteria:** A user can find active sharing, identify the recipients and stop access without contacting support.

## 8. Trust and Reliability Model

Trust is a product feature. All screens that present time-sensitive or safety-critical information must expose its source and freshness.

### Status language

| System state | User-facing language | Must not say |
|---|---|---|
| Incident saved | “Emergency alert recorded” | “Help is on the way” |
| Provider accepted request | “Notification request sent to provider” or provider-appropriate wording | “Contact received your alert” |
| Delivery receipt confirmed | “SMS delivered” | “Contact has read it” |
| Mock provider used | “Test notification simulated; no SMS was sent” | “SMS sent” |
| Location update is old | “Last location update: [time]” | “Live location” |
| Journey overdue | “Arrival not confirmed” | “User is in danger” |
| Community report | “Community report · [age] · [status]” | “This road is unsafe” |
| Facility not recently checked | “Verification may be outdated” | “Verified and currently open” |

### Reliability requirements

- Separate database persistence from external notification delivery.
- Use idempotency keys for emergency activation and notification retries.
- Use a durable queue or equivalent retry mechanism for production notifications.
- Log provider result codes and correlation IDs without logging unnecessary personal data.
- Expose service health internally and provide safe user-facing failure states.
- Test database outage, provider outage, slow requests, duplicate requests and expired tokens.
- Keep mock/development mode unmistakable and prevent accidental production use of mock configuration.

## 9. Security and Privacy Requirements

1. Enforce authorization on every API endpoint and every Socket.IO room subscription.
2. Use HTTPS/TLS in deployed environments and encrypt backups and sensitive stored data.
3. Store passwords with a modern password-hashing algorithm; review JWT lifetime, refresh-token storage, rotation and revocation.
4. Rate-limit login, SOS creation, contact tests, report creation, token lookups and other abuse-prone endpoints.
5. Keep secrets in environment/secret management; never commit provider keys or production JWT secrets.
6. Avoid sensitive coordinates, phone numbers and raw share tokens in URLs, logs, analytics and error messages.
7. Define retention by data class: live location, completed journey, SOS incident, delivery logs, community report and audit event.
8. Do not collect continuous location when there is no active journey and no separate consent.
9. Make sharing visible and revocable; assume a malicious person may gain access to a device or trusted contact account.
10. Protect account recovery and contact changes from being used to hijack an active session.
11. Establish a documented security incident and data-breach response process before public launch.
12. Review applicable Indian privacy, data-protection, telecommunications and evidence-handling requirements with qualified counsel before production use.

## 10. Technical Approach — Improve Existing Stack

Retain the existing architecture unless the audit identifies a specific blocker:

- **Frontend:** React 18 + Vite + Leaflet; improve component consistency, mobile responsiveness and accessibility.
- **Backend:** Node.js + Express; keep route handlers thin and move critical workflows into tested service modules.
- **Realtime:** Socket.IO with authenticated, authorized room subscriptions.
- **Database:** PostgreSQL for production; SQLite may remain useful for local development and demos. Test migration parity and do not silently fall back to a local database in production.
- **Routing:** OSRM with explicit handling of errors, timeouts and unavailable routes.
- **Notifications:** existing Twilio integration with a clearly separated mock provider; durable retries and idempotency for production.
- **Push:** Web Push service worker with permission education and fallback behaviour.
- **ML service:** FastAPI remains optional and must not sit in the critical SOS path.

### Code quality expectations

- Inspect existing components and API routes before replacing them.
- Reuse working features and database structures where possible.
- Consolidate repeated UI elements into shared components: buttons, status labels, cards, dialogs, bottom sheets and error states.
- Centralize API error handling and use consistent response schemas.
- Add database constraints and indexes for ownership, token lookup, incident status and spatial queries where applicable.
- Validate inputs server-side; never rely only on frontend validation.
- Add structured, privacy-aware logs and request correlation IDs.
- Keep migrations versioned and test upgrade paths.
- Separate demo data from verified production facility data.

## 11. Proposed Data Model Changes

Audit existing schemas first; add or alter tables only where required.

- **SOS incidents:** unique ID, user ID, trigger timestamp, location snapshot/accuracy if available, incident state, resolution timestamp and idempotency key.
- **Notification attempts:** incident ID, recipient reference, channel, provider mode, provider status, attempt time, retry count and provider reference.
- **Journeys:** user ID, origin/destination, expected arrival, grace period, state and lifecycle timestamps.
- **Share tokens:** journey ID, token hash, creation/expiry/revocation timestamps and minimal access metadata.
- **Location updates:** journey ID, coordinates, accuracy and recorded timestamp; retention and deletion must be enforced.
- **Trusted contacts:** owner ID, contact details, verification state and user-selected notification preferences.
- **Facilities:** category, coordinates, source, verification date, contact details and current verification state.
- **Community reports:** category, approximate location, created/expiry timestamps, moderation state and report age.
- **Audit events:** actor, action, resource reference and timestamp, without unnecessary location payloads.

## 12. Non-Functional Requirements

### Performance

- Main screen should remain usable before optional map tiles or noncritical data finish loading.
- Define and measure API latency targets; initial target for core read/write APIs is p95 under 500 ms under expected pilot load, excluding external-provider latency.
- SOS incident persistence should be fast and independent of notification provider response time.
- Avoid unnecessary rerenders and excessive location polling; balance update interval, responsiveness and battery usage.

### Accessibility and usability

- Target WCAG 2.2 AA contrast and interaction practices.
- Support screen readers, text scaling, keyboard operation and visible focus.
- Test the SOS and sharing flows with users under time pressure and with one hand.
- Use concise labels and confirm important state changes in text, not colour alone.

### Compatibility

- Prioritize current Android Chrome and common Android phones for the Pune pilot; test iOS Safari/PWA separately.
- Test at 320 px, 360 px, 390 px and tablet/desktop widths.
- Test denied permissions, location disabled, low battery, locked screen, app backgrounding, poor network and browser notification restrictions.

### Availability and recovery

- Define backup, restore, monitoring and incident response for production.
- Test restoration rather than merely creating backups.
- Do not promise 24/7 operational response unless staffed and supported by an actual service agreement.

## 13. Success Metrics

These are proposed targets for the pilot, not current measured performance.

| Metric | Initial target or method |
|---|---|
| SOS incident persistence | 100% of accepted test activations persisted in the critical workflow test suite |
| SOS acknowledgement | p95 under 2 seconds under healthy test conditions; measure separately from delivery |
| Duplicate incidents on retry | Zero in idempotency test suite |
| Unauthorized share-link access | Zero successful unauthorized accesses in the security test suite |
| Revocation | Access denied immediately after server-side revocation |
| Journey location freshness | Display actual last-update age; measure update success by device/network condition |
| Notification reporting | Every attempt has an explicit, accurate state; report success rates by provider/channel |
| Facility quality | Every verified facility has a source and verification timestamp |
| Report freshness | Expired reports are not displayed as current |
| Mobile usability | Core flows complete without horizontal scrolling at supported phone widths |
| False anomaly prompts | Measure in pilot; do not escalate feature until false-positive rate is acceptable |
| Battery impact | Measure on representative Android devices during a typical journey |

## 14. Testing and Release Gates

### Automated tests

- Authentication, invalid credentials and rate limits.
- User ownership and authorization for every sensitive resource.
- Contact CRUD, verification and test notification states.
- SOS persistence when SMS, push, database or ML services fail.
- Duplicate request/idempotency and notification retry behaviour.
- Journey lifecycle, ETA extension, overdue alert, completion, expiry and token revocation.
- Socket.IO authorization and location freshness.
- Facility filtering, proximity lookup and missing GPS.
- Community report duplicates, moderation, abuse flags and expiry.
- Development mock mode versus live provider mode.

### Manual real-device tests

- Activate and cancel SOS one-handed.
- Trigger SOS with GPS disabled and with network disconnected.
- Put the browser/app in the background and lock the screen.
- Test battery saver, denied notification permissions and revoked location permissions.
- Verify the user sees stale location rather than false live status.
- Open a share link after arrival, cancellation and expiry.
- Test map usability at narrow widths and with the keyboard open.
- Verify all facilities and emergency instructions against reliable current sources.

### Release gate

Do not call the app production-ready until critical workflows, security tests, provider configuration, privacy notices, retention rules, monitoring and real-device limitations have been documented and reviewed.

## 15. Delivery Plan

This is an indicative six-week sequence for a small team, subject to the repository audit and available contributors.

### Week 1 — Audit and UI foundation

- Run the app and existing tests.
- Review current SOS, journey, auth, socket and notification code.
- Identify security and schema gaps.
- Establish design tokens, typography, spacing, buttons, status labels, forms, dialogs and responsive navigation.

### Week 2 — SOS reliability

- Improve incident persistence, provider states, idempotency, retries and failure handling.
- Refine the SOS activation and post-activation UI.
- Validate direct-call fallback and clearly separate simulated from live delivery.

### Week 3 — Journey and contact reliability

- Improve consent, contact verification and event preferences.
- Refine start/share/overdue/extend/arrive/revoke journeys.
- Test token expiry and socket authorization.

### Week 4 — Map and nearby facilities

- Refine route comparison and mobile map interactions.
- Validate facility sources and freshness.
- Add list-based alternatives and manual search when GPS is unavailable.

### Week 5 — Reports, privacy and accessibility

- Improve report moderation and expiry.
- Build Privacy & Safety Centre.
- Test keyboard/screen-reader access, contrast, text scaling and narrow screens.

### Week 6 — Reliability pilot

- Run automated and manual test plans.
- Test on representative devices and network conditions.
- Fix critical issues, document known limitations and conduct a small controlled pilot.

Do not add new AI features during the critical path unless P0 requirements are already met.

## 16. Definition of Done

A feature is done only when:

- Its loading, empty, success, failure, offline and permission states are designed.
- Mobile layout is validated at supported widths.
- Keyboard, screen-reader and contrast requirements are checked where applicable.
- Server-side validation and authorization are implemented.
- Critical failure and retry paths are tested.
- Logs and analytics avoid unnecessary personal data.
- User-facing wording accurately describes what happened.
- Documentation and tests are updated.

The MVP is ready for a controlled pilot when all P0 requirements and release gates pass. A working demo with mock SMS is not equivalent to a production emergency service.

## 17. Implementation Guidance for the Existing Repository

1. Start by inspecting the current code, schema versions, tests and running behaviour; do not assume the README proves implementation correctness.
2. Create a gap list mapping each requirement to existing components, routes, services and tests.
3. Preserve functional code and make targeted changes rather than rewriting the entire app.
4. Refactor the UI in layers: design system, mobile navigation, home screen, then each existing feature.
5. Fix security and reliability defects before adding advanced features.
6. Use feature flags for risky changes and keep mock-provider mode explicit in development.
7. Validate each change with regression tests so improvements do not break existing journeys, SOS or facility flows.
8. Record any requirement that cannot be safely met by a browser/PWA and evaluate native Android only where evidence justifies it.

---

**Product decision:** Urban Guardian should differentiate itself through dependable emergency workflows, clear journey-sharing consent, accurate local information and a polished mobile-first experience—not through unsupported claims, decorative complexity or AI features that have not been validated.
