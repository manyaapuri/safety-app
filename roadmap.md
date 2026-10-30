# SafeHer --- Phase-Wise Implementation Roadmap

**File:** `roadmap.md`\
**Product:** SafeHer / Urban Guardian women's safety application\
**Purpose:** Give an AI coding agent an execution plan to improve the
existing repository in safe, verifiable phases.

> **Primary instruction to the coding agent:** Do not rebuild the
> application from scratch. First inspect the repository and current
> behaviour. Reuse and improve existing features, routes, components,
> schemas, and tests wherever practical. Work phase by phase, keep the
> application runnable, and do not move to the next phase until the
> current phase's acceptance criteria pass.

------------------------------------------------------------------------

## 1. Product and repository context

The current README describes a women's journey-safety platform with:

-   React 18 + Vite + Leaflet frontend.
-   Node.js + Express backend and Socket.IO.
-   PostgreSQL or SQLite database support.
-   Trusted journey sharing, live location updates, and overdue alerts.
-   SOS incident persistence, SMS provider integration, and
    delivery-state tracking.
-   Trusted contacts and test notifications.
-   Pune route planning using OSRM.
-   A facilities directory.
-   Community hazard reporting.
-   Web Push notifications.
-   A Python FastAPI movement-anomaly service.

The README mentions Twilio and a development mock notification provider.
It also lists a police dispatch webhook as a placeholder requiring
formal authorization. The coding agent must verify the actual code and
environment before assuming any integration is functional.

**WhatsApp is a requested priority.** The existing README specifically
documents SMS and Web Push, not a working WhatsApp integration. Treat
WhatsApp as an integration to inspect and, if absent, implement through
an approved WhatsApp Business Platform provider. Do not assume ordinary
personal WhatsApp accounts, unofficial automation, or a mock provider
can send real emergency messages.

------------------------------------------------------------------------

## 2. Non-negotiable execution rules

1.  **Audit before editing.** Read the README, package manifests,
    frontend routes/components, backend routes/services, database
    schemas/migrations, environment example files, and tests.
2.  **Map features to implementation.** For each critical feature,
    identify its UI entry point, API endpoint, service/provider,
    persistence model, environment variables, and tests.
3.  **Do not trust README claims without verification.** Test each
    workflow against the actual repository and document mismatches.
4.  **Do not rewrite the stack.** Preserve React + Vite, Express, the
    existing database abstraction, Socket.IO, and FastAPI unless a
    concrete issue requires a scoped change.
5.  **Protect existing working behaviour.** Make small changes, keep
    current API contracts where possible, and add migrations rather than
    destructive schema edits.
6.  **No fake success.** A mock notification must be labelled
    `simulated`. A provider API accepting a request is not necessarily
    delivery confirmation. Never claim police dispatch without a real
    authorized integration and confirmation.
7.  **Keep secrets out of source control.** Use environment variables
    and update `.env.example` with placeholder values only. Never print
    real credentials into logs or documentation.
8.  **Do not enable dangerous defaults.** Location sharing, evidence
    capture, and background tracking must be consent-based and off
    unless explicitly enabled.
9.  **Use idempotency and auditability.** Retried SOS requests must not
    create duplicate incidents. Record provider attempts and meaningful
    state changes.
10. **No unrelated redesign during Phase 1.** Fix the actual SOS and
    messaging workflows before broad UI polish or new AI features.
11. **Run tests after each phase.** If tests fail, fix regressions
    before proceeding. Add tests for each behaviour changed.
12. **Report honestly.** At the end of every phase, list files changed,
    behaviour implemented, tests run, environment configuration
    required, unresolved risks, and manual verification steps.

------------------------------------------------------------------------

## 3. Overall priorities

  -----------------------------------------------------------------------
  Priority                Workstream              Outcome
  ----------------------- ----------------------- -----------------------
  P0                      Repository audit and    Know what actually
                          critical-path           works before changing
                          verification            it

  P0                      SOS button and incident Reliable emergency
                          lifecycle               activation and clear
                                                  status

  P0                      Real emergency          Trusted contacts can
                          messaging, including    receive actual messages
                          WhatsApp                when correctly
                                                  configured

  P0                      Direct 112 call and     The user retains an
                          fallback handling       independent emergency
                                                  action

  P0                      Trusted contacts and    Only authorized
                          journey-sharing         contacts can access
                          security                shared data

  P1                      Location updates and    Useful tracking with
                          overdue journey alerts  accurate freshness and
                                                  failure states

  P1                      Route planning and      Improve existing
                          verified facilities     navigation and local
                                                  assistance

  P1                      Community hazard        Useful, moderated and
                          reporting               time-bounded reports

  P1                      Mobile-first UI and     Consistent, accessible
                          design system           SafeHer theme

  P2                      Push reliability,       Improve usability and
                          multilingual support    reach
                          and refinements         

  P2                      Movement anomaly        Optional, explainable
                          detection               assistance prompts
                                                  after core reliability
                                                  is proven
  -----------------------------------------------------------------------

**Phase order matters:** do not spend the first phase adding AI, map
effects, dashboards, or cosmetic redesign while the SOS and real
messaging workflows are unreliable.

------------------------------------------------------------------------

# Phase 0 --- Repository audit and baseline

**Goal:** Establish the current state without prematurely changing
behaviour.

### Tasks

-   [ ] Read `README.md`, `package.json` files, lockfiles, environment
    examples, and start/test scripts.
-   [ ] Inspect frontend routing, `SOSButton`, `Contacts`, journey
    sharing, tracking, alert history, and notification setup.
-   [ ] Inspect backend SOS, contacts, journeys, location, push,
    routing, facilities, and report routes.
-   [ ] Inspect notification service/provider abstractions and identify
    the exact SMS/mock behaviour.
-   [ ] Inspect database schemas and migration strategy for SOS
    incidents, contacts, journeys, location updates, and notification
    attempts.
-   [ ] Inspect Socket.IO authentication and share-token validation.
-   [ ] Inspect automated tests and run the existing suite.
-   [ ] Run the application locally using documented setup instructions.
-   [ ] Create a feature matrix: working, partially working, broken,
    unimplemented, or cannot be verified.
-   [ ] Identify the exact WhatsApp integration status: absent, stubbed,
    simulated, or real provider-backed.
-   [ ] Check for accidental credentials or unsafe production defaults
    without printing secret values.

### Deliverables

-   A concise audit report.
-   Reproduction steps for broken SOS or messaging workflows.
-   A list of required environment variables, with no secret values.
-   A proposed minimal implementation plan based on actual findings.

### Exit criteria

-   [ ] The application starts, or the startup failure is documented
    with a reproducible cause.
-   [ ] Existing tests have a recorded baseline.
-   [ ] SOS and messaging call paths are mapped from UI to provider.
-   [ ] WhatsApp support is accurately classified.
-   [ ] No feature is marked functional based only on its name or README
    description.

------------------------------------------------------------------------

# Phase 1 --- Make SOS genuinely functional

**Goal:** Fix the primary emergency workflow before adding other
features.

## 1.1 Audit and repair SOS activation

-   [ ] Verify that the SOS button is visible and reachable on all
    relevant primary screens.
-   [ ] Confirm its activation behaviour, including the countdown or
    press-and-hold behaviour if present.
-   [ ] Make cancellation possible without making activation
    unnecessarily difficult.
-   [ ] Prevent repeated taps or network retries from creating duplicate
    incidents.
-   [ ] Ensure keyboard and screen-reader users can activate the
    control.
-   [ ] Display a clear state during activation and prevent false visual
    success.

## 1.2 Make incident creation reliable

-   [ ] Validate the authenticated user and permitted incident data
    server-side.
-   [ ] Persist the SOS incident before attempting external notification
    delivery.
-   [ ] Return a unique incident ID and explicit incident-creation
    result.
-   [ ] Capture available location, accuracy, and timestamp; do not
    block incident creation when GPS is unavailable.
-   [ ] Use an idempotency key or equivalent server-side deduplication.
-   [ ] Persist each notification attempt separately from the incident.
-   [ ] Ensure provider failures do not delete or invalidate the
    incident.
-   [ ] Implement bounded retries for transient failures, with duplicate
    prevention.

## 1.3 Make SOS status honest

Use a documented state model consistent with actual provider
capabilities. Suggested concepts:

-   `recorded`: incident saved.
-   `queued`: notification awaits processing.
-   `sent`: provider confirms the message was sent or accepted,
    according to that provider's semantics.
-   `delivered`: only when the provider reports delivery confirmation.
-   `simulated`: development mock only; no real message sent.
-   `failed`: attempt failed.
-   `cancelled`: user cancelled the incident workflow.
-   `resolved`: user or authorized workflow marked the incident
    resolved.

Do not treat these states as interchangeable. Preserve provider-specific
status details where needed.

## 1.4 Direct emergency fallback

-   [ ] Provide a clearly visible direct-call action for India's 112
    emergency number.
-   [ ] Keep direct calling available even if the backend, GPS, SMS,
    WhatsApp, or push service fails.
-   [ ] Do not state that police have been contacted unless the app has
    a real authorized dispatch integration and confirmation.
-   [ ] If a native dialer is opened, make the UI clear that the user
    must complete the call where the platform requires it.

### Required tests

-   SOS with valid GPS and internet.
-   SOS when GPS permission is denied.
-   SOS when GPS is unavailable.
-   SOS when backend persistence fails.
-   SOS when notification provider fails.
-   Duplicate taps and duplicate request retries.
-   Cancelled SOS.
-   Direct-call action available without network.
-   Unauthorized user attempting to create or read another user's
    incident.
-   Incident remains in the database after delivery failure.

### Exit criteria

-   [ ] Incident persistence and messaging delivery are separate.
-   [ ] No duplicate incidents are created by retries.
-   [ ] All important states are displayed truthfully.
-   [ ] Provider failure leaves direct emergency calling available.
-   [ ] Critical automated tests pass.
-   [ ] Manual verification is documented on a real mobile device.

------------------------------------------------------------------------

# Phase 2 --- Make emergency messaging work: SMS and WhatsApp

**Goal:** Ensure trusted contacts can receive actual emergency
notifications through explicitly configured providers.

## 2.1 Fix existing SMS functionality first

-   [ ] Verify Twilio or the configured SMS provider end to end.
-   [ ] Verify sender configuration, recipient formatting, provider
    errors, timeouts, and delivery callbacks where available.
-   [ ] Keep the development mock provider separate from production
    configuration.
-   [ ] Ensure the UI clearly labels simulated notifications.
-   [ ] Implement safe retry handling and record provider response IDs.
-   [ ] Verify that test notifications cannot be mistaken for an actual
    SOS.

## 2.2 Implement WhatsApp through an approved integration

First determine whether a WhatsApp service already exists. Reuse it if
it is functional; otherwise implement a small provider adapter for the
approved WhatsApp Business Platform integration.

-   [ ] Select and document the supported provider, such as Meta
    WhatsApp Business Platform or an authorized provider such as Twilio
    WhatsApp.
-   [ ] Confirm account setup, sender/phone-number registration,
    credentials, recipient eligibility, template requirements, and
    regional policy constraints.
-   [ ] Add explicit environment configuration for WhatsApp credentials
    and sender identifiers. Document names in `.env.example` with
    placeholders only.
-   [ ] Implement a provider adapter rather than embedding
    provider-specific logic in the SOS route or UI.
-   [ ] Create and configure the required approved message template(s)
    for outbound business-initiated emergency notifications where
    applicable.
-   [ ] Include only necessary incident information: SafeHer identity,
    the alert type, event time, and an appropriately protected location
    or journey link when consent and provider rules permit.
-   [ ] Make the link time-limited, unguessable, revocable, and
    restricted to the intended purpose.
-   [ ] Process provider callbacks/webhooks where supported, validating
    their authenticity.
-   [ ] Store provider message IDs and delivery states.
-   [ ] Handle provider rate limits, timeouts, invalid recipients,
    template rejection, and unavailable service.
-   [ ] Never automate personal WhatsApp Web sessions or use unofficial
    scraping/browser automation to send emergency alerts.

**Important:** A WhatsApp API response that accepts a request is not
proof that the contact received or read the message. Use
provider-supported delivery events, and describe status accurately.

## 2.3 Contact preferences and channel fallback

-   [ ] Let users configure permitted channels for each trusted contact,
    such as SMS, WhatsApp, or push.
-   [ ] Validate and normalize phone numbers, including country code.
-   [ ] Provide a clearly labelled test workflow for each configured
    channel.
-   [ ] Show whether a channel is configured, verified, unavailable,
    simulated, or failing.
-   [ ] Define a safe fallback policy. For example, attempt the user's
    enabled primary channel and then an enabled alternative if the
    configured policy permits.
-   [ ] Avoid uncontrolled retries across channels that can spam
    contacts.
-   [ ] Do not delay direct emergency calling while waiting for message
    delivery.
-   [ ] Prevent test notifications from generating real emergency
    incident records unless explicitly intended and clearly labelled.

## 2.4 Notification message design

Keep messages concise, actionable, and privacy-aware. Example content,
to be adapted to the approved provider template and user consent:

> SafeHer emergency alert: An SOS was activated at \[time\]. The latest
> available location may be viewed using this time-limited link:
> \[protected link\]. If you can, contact the user and call emergency
> services if needed. This alert does not confirm police dispatch.

Do not include unnecessary personal data. Do not state that the user is
definitely in danger if the system only knows that SOS was activated.

### Required tests

-   Valid and invalid recipient numbers.
-   SMS provider success, rejection, timeout, and delivery callback.
-   WhatsApp provider success, template rejection, timeout, and delivery
    callback where supported.
-   Missing provider credentials.
-   Mock mode versus real mode.
-   One channel failing while another enabled channel works.
-   Duplicate webhook events.
-   Invalid webhook signatures.
-   Contact removed during an active journey.
-   Revoked share link included in a previously sent message.
-   Provider API accepted but no delivery confirmation received.

### Exit criteria

-   [ ] Real SMS works in an explicitly configured test environment.
-   [ ] Real WhatsApp works only when its approved business integration
    is configured.
-   [ ] Mock messages cannot be confused with real messages.
-   [ ] Provider states are persisted and displayed correctly.
-   [ ] Contact preferences and consent are enforced.
-   [ ] Direct emergency calling remains independent of both messaging
    providers.

------------------------------------------------------------------------

# Phase 3 --- Trusted contacts, journey sharing, and overdue alerts

**Goal:** Make journey protection useful without introducing
unauthorized tracking.

### Tasks

-   [ ] Verify add, edit, remove, and verify-contact flows.
-   [ ] Enforce server-side ownership and consent checks.
-   [ ] Fix journey creation, extension, completion, and cancellation.
-   [ ] Secure share tokens with high entropy, expiry, and immediate
    revocation.
-   [ ] Avoid exposing raw tokens in logs or analytics.
-   [ ] Verify Socket.IO room authorization before any location
    broadcast.
-   [ ] Show last location update time and accuracy.
-   [ ] Distinguish a stale location from a live location.
-   [ ] Implement overdue arrival checks using server-side scheduling or
    a reliable worker.
-   [ ] Make overdue thresholds configurable and allow users to extend a
    journey.
-   [ ] Use language such as "Arrival check-in overdue" rather than
    asserting that the user is in danger.
-   [ ] End sharing and revoke access immediately after completion or
    cancellation.
-   [ ] Define and enforce location retention and deletion rules.

### Required tests

-   Expired/revoked share link.
-   User attempting to access another user's journey.
-   Unauthorized Socket.IO room subscription.
-   Arrival deadline passed.
-   Journey extended before deadline.
-   Journey cancelled or completed.
-   No GPS update or intermittent network.
-   Contact removed during a journey.
-   Location data deleted after its retention period.

### Exit criteria

-   [ ] Only authorized viewers can access the journey.
-   [ ] Revocation works server-side immediately.
-   [ ] Stale location is clearly labelled.
-   [ ] Overdue workflows do not make unsupported danger claims.
-   [ ] Journey lifecycle and privacy tests pass.

------------------------------------------------------------------------

# Phase 4 --- Fix route planning and nearby facilities

**Goal:** Improve existing navigation and facility discovery rather than
adding a new map stack.

### Tasks

-   [ ] Verify OSRM route requests and alternative route rendering.
-   [ ] Handle invalid destinations, no-route responses, timeouts, and
    unavailable services.
-   [ ] Verify route distance, duration, geometry, and map bounds.
-   [ ] Improve destination search and location-permission failure
    handling.
-   [ ] Verify the source and accuracy of seeded Pune facility records.
-   [ ] Show facility type, address, phone where available, directions,
    and verification date/status.
-   [ ] Distinguish official/verified information from unverified
    contributions.
-   [ ] Add list-based results as an alternative to selecting map
    markers.
-   [ ] Ensure map controls are touch-friendly.
-   [ ] Do not invent a numerical safety score or claim that a route is
    safe because it is short or passes near a facility.
-   [ ] Make facility navigation work even if the route planner is
    unavailable, using an external maps link where available.

### Required tests

-   Valid and invalid destinations.
-   No GPS permission.
-   No route found.
-   OSRM timeout or unavailable service.
-   Facility lookup with no results.
-   Stale or unverified facility.
-   Mobile map/list interaction.

### Exit criteria

-   [ ] The journey planner fails gracefully.
-   [ ] Facility provenance and verification are visible.
-   [ ] Users can use facility details without depending exclusively on
    the map.
-   [ ] Existing routing behaviour remains covered by tests.

------------------------------------------------------------------------

# Phase 5 --- Community hazard reports and moderation

**Goal:** Make reports useful, current, and resistant to abuse.

### Tasks

-   [ ] Verify report creation, display, flagging, duplicate merging,
    and expiry.
-   [ ] Validate report categories and input lengths.
-   [ ] Enforce rate limits and abuse prevention server-side.
-   [ ] Keep reporter identity private from the public report feed.
-   [ ] Merge nearby duplicates without destroying distinct incident
    timestamps.
-   [ ] Show report age and moderation/verification status.
-   [ ] Implement the documented expiry policy and remove stale reports
    from active map views.
-   [ ] Provide a process for handling abusive, defamatory, or
    identifying content.
-   [ ] Avoid exposing precise reporter location unless strictly
    necessary and consented.
-   [ ] Add tests for duplicate submissions, malicious content, flags,
    expiry, and unauthorized access.

### Exit criteria

-   [ ] Report creation and moderation are tested.
-   [ ] Old reports are not presented as current facts.
-   [ ] Public views do not expose reporter identity or unsupported
    allegations.

------------------------------------------------------------------------

# Phase 6 --- Mobile-first UI and SafeHer design system

**Goal:** Improve the UI after critical emergency workflows work, using
`design.md` as the visual specification.

**Do not replace working backend logic or remove features merely to
achieve a visual redesign.**

### 6.1 Design foundation

-   [ ] Inspect current CSS, layout components, navigation, and repeated
    styles.
-   [ ] Create shared colour, typography, spacing, radius, shadow, and
    breakpoint tokens.
-   [ ] Apply the soft rose/pink brand theme, white surfaces, and deep
    plum typography described in `design.md`.
-   [ ] Reserve high-contrast danger red for SOS and critical states.
-   [ ] Create shared buttons, cards, inputs, badges, dialogs, bottom
    sheets, empty states, and loading/error states.
-   [ ] Use one consistent line-icon family.
-   [ ] Remove unnecessary gradients, glass effects, oversized
    decorative elements, and inconsistent shadows from functional
    screens.

### 6.2 Mobile navigation and home

-   [ ] Implement a consistent bottom navigation with four or five
    primary destinations.
-   [ ] Keep SOS easy to find on the home and journey screens.
-   [ ] Prioritize active journey state, emergency actions, and
    important delivery failures.
-   [ ] Use compact quick-action cards for secondary features.
-   [ ] Avoid excessive scrolling before the user reaches important
    controls.
-   [ ] Respect safe areas and device browser bars.

### 6.3 Responsive screens

-   [ ] Improve onboarding and authentication.
-   [ ] Improve journey planning and active journey screens.
-   [ ] Improve SOS status and incident history.
-   [ ] Improve facilities and report lists.
-   [ ] Improve trusted contacts, privacy, and notification settings.
-   [ ] Reorganize tablet and desktop layouts rather than simply
    stretching mobile components.
-   [ ] Add accessible map/list alternatives and robust loading/error
    states.

### 6.4 Accessibility and polish

-   [ ] Target WCAG 2.2 AA.
-   [ ] Check contrast, focus visibility, screen-reader labels, touch
    target size, and text scaling.
-   [ ] Respect reduced-motion preferences.
-   [ ] Ensure status is communicated by text/icon as well as colour.
-   [ ] Test the main flows at 320 px, 360 px, 390 px, 430 px, 768 px,
    1024 px, and 1440 px widths.
-   [ ] Verify that no functional control is merely decorative.

### Exit criteria

-   [ ] All key screens use the shared design system.
-   [ ] Critical workflows still work end to end.
-   [ ] No unintended horizontal scrolling or clipped critical actions.
-   [ ] Mobile and desktop navigation behave consistently.
-   [ ] Accessibility and regression tests pass.

------------------------------------------------------------------------

# Phase 7 --- Push notification reliability and settings

**Goal:** Complete channel reliability and give users clear control.

### Tasks

-   [ ] Verify service-worker registration and push subscription
    lifecycle.
-   [ ] Handle denied notification permission and expired subscriptions.
-   [ ] Secure subscription registration and ownership.
-   [ ] Provide clear test-notification results.
-   [ ] Ensure users can configure channel preferences and notification
    previews.
-   [ ] Avoid placing sensitive location details in lock-screen previews
    by default.
-   [ ] Test provider failures, duplicate events, subscription removal,
    and re-subscription.
-   [ ] Keep push optional; it must not be the only emergency fallback.

### Exit criteria

-   [ ] Push works in supported environments and fails visibly when
    unavailable.
-   [ ] The app does not promise delivery merely because a subscription
    exists.
-   [ ] Users can control notification preferences.

------------------------------------------------------------------------

# Phase 8 --- Optional movement anomaly detection

**Goal:** Add useful, explainable assistance prompts only after the core
safety flows are reliable.

### Tasks

-   [ ] Audit the existing FastAPI `ml-service` and `mlService.js`
    bridge.
-   [ ] Document current heuristics and any assumptions.
-   [ ] Start with deterministic rules and user-configurable thresholds.
-   [ ] Treat route deviation, prolonged stop, missed arrival, and
    missing updates as uncertain signals.
-   [ ] Ask for confirmation or follow a user-configured escalation
    rule.
-   [ ] Never label a user as assaulted or claim a crime has occurred
    based on location patterns.
-   [ ] Do not make SOS incident persistence or notification delivery
    depend on the ML service.
-   [ ] Make the feature opt-in and explain its data use.
-   [ ] Measure false positives and battery impact during controlled
    testing.

### Exit criteria

-   [ ] The feature can be disabled without breaking journeys.
-   [ ] Every prompt explains the observed condition.
-   [ ] The system does not automatically make unsupported claims of
    danger.
-   [ ] Core emergency workflows remain independent of ML availability.

------------------------------------------------------------------------

# Phase 9 --- Production readiness and release gate

**Goal:** Verify the entire product under realistic conditions.

### Security

-   [ ] Test authentication and authorization across all critical
    endpoints.
-   [ ] Test share-token entropy, expiry, revocation, and access
    controls.
-   [ ] Verify rate limiting and input validation.
-   [ ] Verify secret handling and safe logs.
-   [ ] Review personal-data retention, deletion, and consent.
-   [ ] Verify webhook authentication for supported notification
    providers.

### Reliability

-   [ ] Simulate backend, database, SMS, WhatsApp, push, routing, GPS,
    and network failures.
-   [ ] Verify that SOS persistence is separate from message delivery.
-   [ ] Verify retries and duplicate prevention.
-   [ ] Test expired/revoked links and stale locations.
-   [ ] Run all automated tests from a clean environment.

### Real-device validation

-   [ ] Test on actual Android devices, not only desktop browser
    emulation.
-   [ ] Test screen lock, app backgrounding, battery saver, denied
    permissions, poor connectivity, and app restart.
-   [ ] Verify whether background location and notifications work in
    each supported browser/device.
-   [ ] Document PWA limitations honestly; do not promise native-level
    background tracking if the app cannot provide it.
-   [ ] Conduct usability tests for SOS activation, accidental
    activation, contact comprehension, and emergency message clarity.

### Release gate

Do not describe the product as production-ready until:

-   Critical SOS and messaging tests pass.
-   Real-provider configuration has been verified in a controlled
    environment.
-   Mock mode is clearly separated from production.
-   Security and privacy checks pass.
-   Known device and delivery limitations are documented.
-   No UI indicates that an alert was delivered or help dispatched
    without evidence.

------------------------------------------------------------------------

## 4. Definition of done for every phase

Before marking any phase complete, the coding agent must provide:

1.  **Summary:** What behaviour changed and why.
2.  **Files changed:** List important frontend, backend, schema,
    configuration, and test files.
3.  **Verification:** Commands run and actual pass/fail results.
4.  **Manual test steps:** Exact steps to reproduce and validate the
    workflow.
5.  **Environment setup:** Required variables and provider setup, using
    placeholders only.
6.  **Known limitations:** What remains unimplemented or cannot be
    verified.
7.  **Regression notes:** Confirmation that earlier critical flows still
    work.

A phase is not complete merely because the code compiles or the UI looks
correct.

------------------------------------------------------------------------

## 5. Final instructions to the AI coding agent

Execute the phases in order.

**Start with Phase 0. Then fix Phase 1 SOS reliability and Phase 2 real
SMS/WhatsApp messaging before spending time on UI redesign or optional
AI.**

For each phase:

-   Inspect the current implementation first.
-   Reuse existing code and tests where possible.
-   Make a small, coherent set of changes.
-   Add or update automated tests.
-   Run the tests and inspect the resulting behaviour.
-   Fix regressions before proceeding.
-   Update documentation when actual behaviour or configuration changes.
-   Do not invent credentials, claim real delivery from a mock provider,
    or imply police dispatch.
-   Do not silently skip a phase. If a required provider account,
    credential, approval, or device capability is unavailable, implement
    the safe provider abstraction and configuration handling, document
    the blocker, and report what still requires external setup.

**First task:** Audit the repository and produce a feature-by-feature
status table for SOS, SMS, WhatsApp, direct 112 calling, trusted
contacts, journey sharing, and delivery tracking. Then implement only
the highest-priority broken SOS behaviour, with tests. Continue in order
once its exit criteria are met.
