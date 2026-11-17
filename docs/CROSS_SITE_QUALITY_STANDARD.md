# Cross-Site Quality Standard (Non-Game Websites)

Version: 1.0
Updated: 2026-11-17

## Purpose and scope

This is the reusable baseline for the user's non-game websites. It consolidates the quality practices established while building and auditing Anime Quiz World (AQW). It is not a requirement to copy AQW's quiz-specific features or visual identity.

Included by default: information services, databases, tools, communities, content sites, dashboards and creator utilities.
Excluded from this baseline: websites whose primary purpose is a game or playful game experience. Those projects may adopt individual technical safeguards where relevant, but this standard does not impose the shared product/UI system on them.

Each repository should keep a copy or a link to this standard and maintain a project-specific checklist. ANIXIA adopts the complete baseline below.

## Priority order

1. Security incidents, privacy exposure, authentication failures and service outages.
2. Data integrity, destructive-operation prevention and critical feature failures.
3. Core user journeys, navigation, forms and error recovery.
4. Responsive usability, accessibility and performance.
5. External integrations, content rights, SEO and operational consistency.

## A. Security and privacy

- Keep secrets, service-role keys, private tokens and privileged logic out of browser code and public repositories.
- Enforce authorization on the server/database, not only by hiding UI controls.
- Use row-level security for user-owned data; test anonymous, authenticated, owner and non-owner access.
- Validate JWT/session state and authorization at privileged endpoints.
- Apply least privilege to database roles, API permissions and admin functions.
- Protect account, profile, message, upload and user-generated-content workflows against unauthorized access and abuse.
- Validate and normalize input; escape untrusted output; avoid unsafe HTML injection.
- Apply reasonable rate limits, spam controls and upload validation where applicable.
- Do not expose personal data in public views, logs, analytics, error messages or search results.
- Provide clear privacy and terms information; collect only data needed for stated functions.
- Review dependency, API and authentication risks when services or SDKs change.

## B. Functionality and reliability

- Maintain an inventory of pages, user journeys, controls, forms, links and external integrations.
- Verify every visible button, link, tab, filter, sort control, pagination control and form.
- Provide loading, empty, success, validation, permission-denied, offline and server-error states where relevant.
- Prevent duplicate submissions and unintended destructive actions.
- Preserve existing user data and working features during redesigns.
- Avoid duplicate implementations, conflicting event handlers and dead code.
- Handle API timeouts, rate limits, malformed data and partial failures without breaking the whole page.
- Prioritize fixes by severity, user impact and likelihood; critical failures take precedence over cosmetic work.

## C. Responsive UI and UX

- Design mobile-first and verify small phones, large phones, tablets and desktop layouts.
- Avoid horizontal page overflow, clipped dialogs, tiny controls and inaccessible navigation.
- Keep text readable, content hierarchy clear, spacing consistent and important actions discoverable.
- Use consistent design tokens for colors, typography, spacing, borders, radii and component states.
- Keep page-specific information architecture where needed; shared styling must not break specialized workflows.
- Use natural language and conventions appropriate to the intended audience and locale.
- Do not use generic AI-style slogans, excessive gradients, decorative cards or unnecessary animation as substitutes for clear information design.

## D. Accessibility

- Ensure keyboard navigation and visible focus indicators.
- Use semantic HTML, labels, headings, landmarks and accessible names.
- Provide meaningful alternative text for informative images; decorative images should not add noise.
- Maintain sufficient text/background contrast and do not communicate state by color alone.
- Support reduced-motion preferences.
- Ensure touch targets and form errors are understandable and operable.
- Test dialogs, menus, tabs and dynamic updates with assistive-technology-friendly patterns.

## E. Performance

- Minimize unnecessary JavaScript, duplicate libraries, oversized images and blocking resources.
- Lazy-load offscreen media and reserve layout space to reduce layout shifts.
- Use caching responsibly and version static assets when changing their content.
- Avoid excessive database round trips; paginate large datasets and request only needed fields.
- Monitor slow API calls, console errors, layout shifts and large payloads.
- Performance improvements must not compromise correctness, accessibility or security.

## F. External APIs and data integrity

- Document each data source, its terms, attribution requirements, quotas, freshness and failure behavior.
- Validate external responses and treat third-party data as untrusted input.
- Use stable identifiers and explicit deduplication rules; never merge records solely because display titles look similar.
- Separate source data, normalized data, user-generated data and derived statistics.
- Track import errors and avoid silent partial imports.
- Provide graceful fallback behavior when an external service is unavailable.
- Do not scrape, store, republish or transform content in ways that violate source terms or rights.

## G. SEO and discoverability

- Use accurate page titles, descriptions, canonical URLs and meaningful heading structure.
- Add structured data only when it accurately describes visible page content.
- Keep sitemap and robots directives consistent with the intended public/private status.
- Prevent account, admin, private and duplicate utility pages from being indexed where appropriate.
- Avoid keyword stuffing, fabricated ratings, fake reviews and misleading metadata.
- Ensure pages remain useful and navigable without relying entirely on client-side rendering where practical.

## H. Rights, terms and governance

- Review copyright, image licenses, source attribution, API terms and user-generated-content rules.
- Provide terms of service and privacy information appropriate to the actual service.
- Define moderation, reporting, account deletion and data-retention behavior where user content or accounts exist.
- Do not claim rights to third-party artwork, descriptions, logos or datasets without permission.

## I. Testing, CI and release management

- Make small, reviewable changes and verify the affected pages after each change.
- Run available linting, type checks, automated tests and GitHub Actions.
- Test critical flows manually on both desktop and mobile.
- Inspect browser console/network errors and verify links, routes and authentication redirects.
- Confirm deployment status before describing a change as live.
- Keep a record of known issues, unverified features and rollback considerations.
- Never report tests, accessibility audits, security reviews or deployments as successful unless results were actually observed.

## J. Cost and maintainability

- Prefer the existing free GitHub Pages and Supabase tiers when practical.
- Check free-tier quotas and limits before adding dependencies or external services.
- Do not introduce paid APIs, subscriptions or services without an explicit cost assessment.
- Keep common styles, navigation conventions, error patterns and security guidance reusable.
- Document setup, environment variables, data ownership, recovery and maintenance steps.
- Keep project-specific exceptions explicit rather than silently weakening the shared standard.

## ANIXIA adoption notes

ANIXIA applies this standard to the home page, anime catalogue, generated anime/genre pages, detail pages, rankings, seasonal catalogue, recommendations, quiz, account, profile, community, messaging, search, admin and legal pages.

The ANIXIA shared stylesheet is the common presentation layer. It standardizes typography, neutral surfaces, form controls, focus states, navigation, cards, responsive behavior and reduced-motion handling while preserving page-specific functions and layouts.

This standard does not decide ANIXIA's anime eligibility/catalogue policy. Catalogue inclusion, data sourcing and publication rules remain a separate product decision.
