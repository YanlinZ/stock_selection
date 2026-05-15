# Frontend Redesign V1 Design Handoff

Date: 2026-05-15

This is a design handoff only. It is the source of truth for a later implementation pass. Do not implement frontend code from this document until the handoff is reviewed and approved.

## Context Summary Before Handoff

### Current Frontend Stack

- Framework: Next.js 16 App Router with React 19 and TypeScript.
- Styling: Tailwind CSS 3 with HSL CSS variables in `src/app/globals.css`.
- UI primitives: local `Button`, `Badge`, `Card`, `Input`, and `Label` components in `src/components/ui/`.
- Icons: `lucide-react`.
- Component composition: server-rendered protected pages, dynamic Dashboard and Settings routes, shared `AppShell`.
- Data flow: Dashboard pages call `createDashboardService().getDashboardSnapshot()` server-side and render a normalized `DashboardSnapshot`. Settings calls config and ingestion services plus server actions.
- Important constraint: Dashboard UI must continue to consume normalized internal data. It must not depend on provider raw payloads.

### Relevant Routes And Components

- `/` and `/dashboard`
  - Files: `src/app/(protected)/page.tsx`, `src/app/(protected)/dashboard/page.tsx`.
  - Both render `AppShell` plus `DashboardView`.
  - Both use fallback unavailable snapshots on service errors.
- `/settings`
  - File: `src/app/(protected)/settings/page.tsx`.
  - Simple configuration surface for data refresh, holdings, watchlist items, key price levels, and basic preferences.
- Shared shell
  - File: `src/components/app-shell.tsx`.
  - Header navigation includes Settings, Health, and logout.
- Dashboard UI
  - File: `src/components/dashboard/dashboard-view.tsx`.
  - Current sections: top phase/status header, summary, data status, macro status, panic rebound mode, opportunity scan, key price alerts, holdings, watchlist.
  - Current helper components: `OpportunitySection`, `MacroSection`, `KeyLevelAlertSection`, `TargetSection`, `TargetCard`, `ActionDetail`, `DataSourceGrid`, `EvidenceGrid`, `EvidenceList`, `ScoreBlock`, `StatusLine`, `EmptyBand`, and badge helpers.
- Settings UI
  - Current sections: `DataStatusSection`, `HoldingsSection`, `WatchlistSection`, `KeyPriceLevelsSection`, `PreferencesSection`.
  - Current actions and data contracts must remain unchanged in this redesign pass.

### Assumptions

- The first implementation pass will be presentation-only unless the user explicitly approves broader work.
- Route structure, auth behavior, server actions, service contracts, schema, provider logic, and recommendation rules stay unchanged.
- Existing Chinese utility copy can remain Chinese; copy changes should improve clarity, not add marketing voice.
- The black-gold redesign is a product UI system, not a landing page theme.
- The reference mock image is taste/reference only. This markdown remains the engineering source of truth.

## 1. Design Goal

Create a black-gold financial product UI that feels premium, calm, sharp, and tool-like. The redesign should borrow Robinhood web's restraint and clarity without copying brand details: direct hierarchy, clean rows, clear state, and low decorative load.

The Dashboard should be dense but readable. It should help the user scan market state, data freshness, opportunity quality, holdings, watchlist state, reasons, risks, and evidence without feeling like a casino, crypto terminal, or marketing dashboard.

Use utility-first product copy. Headings and labels should orient the user: `今日机会`, `数据状态`, `持仓`, `关注列表`, `来源与更新时间`, `风险`, `缺口`. Avoid aspirational or campaign-style lines.

## 2. Scope / Out Of Scope

### In Scope

- Dashboard main view.
- Simple settings and watchlist configuration visual direction.
- Opportunity scan presentation.
- Holdings and watchlist display.
- Trust evidence and data freshness presentation.
- Responsive desktop and mobile layout rules.
- Design tokens and component guidance for later implementation.

### Out Of Scope

- Business logic changes.
- Backend changes.
- Auth, routing, data fetching, schema, provider logic, or recommendation rule changes.
- Broker sync.
- Real trading.
- Push notifications.
- High-frequency data.
- Full-market recommendations.
- AI summaries.
- Any UI that implies automated execution, hidden model judgment, or expanded recommendation scope.

## 3. Visual Thesis

A matte black trading workspace with restrained gold instrumentation: quiet, precise, weighty, and focused on evidence rather than excitement.

## 4. UI Principles

- No hero section.
- No marketing copy.
- No ornamental card mosaics.
- Calm surface hierarchy: page, workspace, rail, row, badge.
- Strong typography and spacing before decoration.
- Few colors: black, charcoal, muted text, restrained gold, semantic green/red only when meaning requires it.
- Cards only where the card is the actual interaction or decision container.
- Prefer rows, tables, strips, rails, and grouped evidence over repeated floating cards.
- Prioritize scanning, decision support, freshness, trust, and rule explainability.
- No decorative gradient blobs, bokeh, ornamental icons, or casino-like neon.
- Do not hide risk, missing data, data quality, or basis date behind hover-only interactions.

## 5. Design Tokens

These values are implementation guidance, not a mandate to change every class in the first pass. The later implementation should centralize them through existing Tailwind CSS variables or a small token layer.

### Background Colors

- Page background: `#070706`.
- Primary workspace background: `#0B0A08`.
- Subtle background band: `#0F0E0B`.
- Avoid large gradients. If a gradient is used, it should be barely perceptible, black-to-charcoal only, and never become a decorative visual event.

### Surface Colors

- Primary surface: `#11100D`.
- Elevated surface: `#15130F`.
- Interactive row hover: `#19160F`.
- Selected or active surface: `#1E1A12`.
- Input surface: `#0F0E0C`.
- Do not use pure white surfaces inside Dashboard.

### Border Colors

- Default border: `#2A251A`.
- Subtle divider: `#1E1B14`.
- Focus border: `#D6B25E`.
- Stale/error border: use semantic color at low opacity, not thick warning frames.

### Gold Accent Usage

- Primary gold: `#D6B25E`.
- Muted gold: `#A9873A`.
- Bright highlight, rare: `#F1D488`.
- Gold is for primary action, selected state, opportunity emphasis, focus rings, and key numeric accents.
- Do not use gold as a full-page glow, chart flood, decorative gradient, or repeated badge color.

### Semantic Green / Red Usage

- Positive green: `#34C77B`.
- Positive surface: `#10261A`.
- Negative red: `#FF5C5C`.
- Negative surface: `#301516`.
- Use green/red only for signed change, risk, failure, or meaningful state.
- Do not make opportunity panels green by default. Opportunity is gold/evidence-led, not profit-promising.

### Muted Text

- Primary text: `#F4EFE3`.
- Secondary text: `#C6BFAF`.
- Muted text: `#8F8878`.
- Disabled text: `#625C50`.
- Metadata text may use mono but must stay readable at mobile sizes.

### Typography Scale

- Font family: keep the existing system stack unless a later approved implementation adds a product font. Recommended stack: `Inter`, `Geist`, `Arial`, `Helvetica`, `sans-serif`.
- Mono stack: keep `Menlo`, `Monaco`, `monospace` for dates, scores, prices, and basis metadata.
- Page title: 24-28px, 600 weight, line-height 1.15.
- Section title: 16-18px, 600 weight.
- Table/header label: 11-12px, 600 weight, uppercase optional only for English labels.
- Body and row text: 13-14px, line-height 1.45.
- Dense metadata: 12px minimum.
- Mobile body text: do not go below 12px for important metadata, basis date, risk, freshness, or evidence.
- Letter spacing: 0 by default.

### Spacing

- Base spacing steps: 4, 8, 12, 16, 20, 24, 32, 40.
- Desktop page gutter: 24-32px.
- Mobile page gutter: 16px.
- Section gap desktop: 24px.
- Section gap mobile: 16-20px.
- Row vertical padding desktop: 10-14px.
- Row vertical padding mobile: 12-16px.
- Evidence group padding: 12-16px.

### Radius

- Default radius: 6px.
- Large panel radius: 8px maximum.
- Badge radius: 4px or 999px only when pill semantics are clear.
- Button radius: 6px.
- Avoid overly soft, rounded SaaS cards.

### Shadows

- Default: no visible shadow.
- Elevated overlays or popovers may use `0 18px 50px rgba(0, 0, 0, 0.32)`.
- Do not rely on shadow to separate routine dashboard regions. Use border, contrast, and spacing.

### Table / List Density

- Desktop holdings/watchlist rows: 52-60px minimum height.
- Mobile rows: 64-76px when content wraps.
- Use sticky or repeated headers only if they do not crowd mobile.
- Use tabular numerals for prices, percentages, and scores.
- Prefer row groups and compact detail expansion over card grids.

### Badge Styles

- Default neutral badge: charcoal fill, muted border, secondary text.
- Opportunity badge: dark gold fill or border, gold text, no glow.
- Freshness ready: neutral or subtle green, not loud.
- Partial/stale: muted gold or amber with explicit text.
- Error/unavailable: muted red surface with readable red text.
- Badges must wrap with their parent instead of forcing horizontal overflow.

### Button Styles

- Primary button: gold background, black text, 40px height desktop, 40-44px mobile.
- Secondary button: transparent or charcoal background, border `#2A251A`, text `#F4EFE3`.
- Ghost button: no fill until hover, muted text, clear focus ring.
- Destructive action: no filled red primary style unless it is the main danger action in a confirmation flow.
- Icon buttons should use lucide icons and accessible labels.

### Logo Direction

- Use the refined logo mark at `docs/design/frontend-redesign-v1-logo.svg` as the reference direction for the top-left product mark. A PNG preview is available at `docs/design/frontend-redesign-v1-logo.png`.
- The mark should stay simple: a gold rounded square with a black signal path, subtle baseline, and small terminal point.
- Meaning: rule-based selection, evidence path, and disciplined opportunity detection.
- Avoid extra letters, complex monograms, candlestick clutter, arrows that feel like trading hype, or crypto/casino shine.
- At small sizes, preserve the gold field and black signal path. If detail must be reduced, remove the subtle top highlight first.
- Recommended header size: 32-36px with 6-8px radius.

## 6. Dashboard Information Architecture

### Overall Layout

Use a tool workspace layout, not a landing page. On desktop, prefer a two-zone layout:

- Main column: account/summary status, opportunity scan, holdings/watchlist workspace.
- Right rail or upper secondary column: data freshness, trust evidence summary, settings entry, and source status.

If the rail becomes too crowded, move trust evidence into the selected opportunity/target panel and keep the rail for freshness only.

### Top Status / Account Summary Area

- Keep the shared app header restrained: brand mark, Dashboard/current route, Settings, Health, logout.
- Under the header, use a compact `StatusStrip`, not a hero.
- The strip should show:
  - Dashboard status: ready / stale / unavailable.
  - Latest market date.
  - Latest macro date.
  - Last refresh time and status.
  - Settings entry.
- The main summary should remain plain-language and actionable: current overall action label, action kind, basis date, and key risk/freshness cue.

### Opportunity Scan Area

- Place `OpportunityPanel` directly after the summary/status strip.
- It must show exactly one of:
  - one available high-quality opportunity, or
  - a quiet state when none qualifies.
- Available opportunity presentation:
  - Symbol and name.
  - Role: holding / watchlist / both.
  - Action label.
  - Opportunity score and rank if present.
  - Confidence and data quality.
  - Latest price, signed day change, basis date.
  - Reasons, risks, missing evidence, and data sources.
- The panel should feel like a decision checkpoint, not a trade ticket. Do not add buy/sell buttons.

### Holdings / Watchlist Area

- Prefer dense `HoldingsTable` and `WatchlistTable` or a unified target list with role filters.
- Rows should show:
  - Symbol and name.
  - Role.
  - Latest price.
  - Change percent.
  - Action label.
  - Confidence/data quality.
  - Key level proximity.
  - Basis date or freshness badge.
- Keep row expansion or secondary detail for evidence, moving averages, recent range, and data source detail.
- Do not turn every holding into a large card by default.

### Trust Evidence Area

- Evidence groups must remain visible in the decision context:
  - Supporting.
  - Opposing.
  - Risks.
  - Missing.
- On desktop, evidence can sit in the opportunity panel lower region or a right-side evidence group.
- On mobile, evidence stacks below the relevant action and remains accessible without hover.
- Each evidence item must preserve label, detail when present, source, and basis date.

### Data Freshness / Stale Indicators

- Freshness appears globally in `StatusStrip` and locally through `FreshnessBadge` or `DataQualityBadge`.
- Stale and partial data must be visible near the affected decision, not only in a global banner.
- Use explicit text: `数据过期`, `部分缺失`, `数据不足`, `依据 2026-05-12`.
- Do not use color alone to communicate freshness.

### Quiet State When No Opportunity Qualifies

- Quiet state copy should be direct: `今日无高质量关注机会，保持观察。`
- Show evaluated target count.
- Show the leading disqualified reason or evidence group.
- Keep trust evidence and data sources visible.
- Do not show a list of near-misses or weaker candidates.

### Settings Entry

- Keep Settings accessible from the shell and from the data freshness area.
- Settings visual direction should match the dark product workspace but remain form-first:
  - compact form groups,
  - clear save/add/deactivate actions,
  - status and provider rows,
  - no promotional copy.

## 7. Component Inventory

- `AppShell`: shared black workspace frame, compact header navigation, route actions.
- `DashboardHeader`: page title, phase/status context, high-level action state.
- `StatusStrip`: market date, macro date, refresh status, dashboard status, settings shortcut.
- `OpportunityPanel`: primary decision container for available opportunity or quiet state.
- `QuietState`: no-opportunity state with evaluated count, reason, and trust evidence.
- `HoldingsTable`: dense holdings list with action, price, freshness, and expandable evidence.
- `WatchlistTable`: dense watchlist list with priority/theme, action, price, freshness, and key levels.
- `TargetRow`: reusable row pattern for holdings/watchlist/both targets.
- `MetricBlock`: compact numeric block for price, percent change, scores, and dates.
- `TrustEvidenceGroup`: four evidence columns/groups preserving source and basis date.
- `RiskBadge`: semantic risk/status badge with text label.
- `FreshnessBadge`: ready/partial/stale/unavailable state with basis date where useful.
- `ActionBadge`: action kind label such as `观察`, `不操作`, `关键价位`, `小仓观察`.
- `DataSourceList`: source/provider/date/update rows.
- `SettingsPanel`: form-first configuration panel for holdings, watchlist, key price levels, and preferences.
- `FormRow`: settings input row with label, help text, control, and save/deactivate action.

## 8. Required States

### Loading

- Use skeleton rows and muted placeholder strips that match final density.
- Do not show fake opportunity content.
- Loading copy, if needed, should be short: `读取 Dashboard 数据`.

### Empty

- If no holdings/watchlist targets exist, show a compact empty row or band with Settings entry.
- Empty state should not become a marketing panel.
- Preserve the reason: no active configured holdings or watchlist items.

### No High-Quality Opportunity / Quiet State

- Show quiet state in `OpportunityPanel`.
- Preserve action label, evaluated target count, confidence/data quality, data sources, and evidence.
- The visual tone should be calm and neutral, not celebratory.

### One Opportunity Available

- Make the opportunity visually primary with restrained gold.
- Show symbol, role, action, score/rank, price/change, basis date, confidence, data quality.
- Supporting evidence should be easy to scan, but risks and missing evidence must be equally visible.
- Do not add a trade execution CTA.

### Stale Data

- Global status strip marks Dashboard as needing refresh.
- Affected decisions show `数据过期` or stale source status near the action.
- Opportunity panel must not visually imply a strong current opportunity when stale.

### Partial Data

- Display `部分缺失` near the decision.
- Missing evidence group should be visible without expansion on mobile.
- Use muted gold/amber tone, not destructive red unless the state is unavailable/error.

### Error State

- Preserve the existing fallback semantics: service errors render unavailable Dashboard data.
- Show a compact error panel with the recovery action, usually Settings/data refresh or migration check.
- Avoid stack traces, raw provider payloads, or long logs.

### Mobile Layout

- Stack major regions in this order:
  1. Shell header.
  2. Status strip.
  3. Summary action.
  4. Opportunity panel or quiet state.
  5. Holdings list.
  6. Watchlist list.
  7. Trust/source detail if not already shown inline.
- Tables become row lists with two-line metadata. Do not require horizontal scrolling for primary information.

## 9. Recommendation / Opportunity Integrity

Any opportunity or recommendation UI must preserve:

- Reasons.
- Risks.
- Data date / basis date.
- Trust evidence.
- Supporting, opposing, risk, and missing evidence groups.
- Data quality and freshness cues.
- Data sources and source update metadata.
- Rule-based explainability.
- The Phase 4 rule that Dashboard surfaces at most one high-quality opportunity and otherwise stays quiet.

The redesign must not imply:

- AI-generated judgment.
- Full-market recommendations.
- More than one daily opportunity.
- Real trading or order execution.
- Confidence beyond the available normalized data.

## 10. Responsive Rules

### Desktop

- Target content max width can remain near the current `max-w-6xl`, but the layout should feel more workspace-like.
- Use a main column plus secondary rail only when there is enough width.
- Holdings/watchlist should use table/list density instead of two-column card grids.
- Evidence can use two or four columns if all text remains readable.

### 414px Width

- Page gutter: 16px.
- Header actions may collapse to icons with accessible labels.
- Opportunity badges wrap below title if needed.
- Evidence groups stack one per row.
- Target rows use symbol/name on the first line and price/action/freshness on following lines.

### 390px Width

- Avoid three-column metric grids.
- Use two compact metric blocks per row at most.
- Long symbols and names wrap; they must not truncate risk or freshness text.
- Buttons use icon plus text only when the text fits; otherwise icon with accessible label is acceptable for shell navigation.

### 360px Width

- No horizontal overflow.
- No fixed-width table columns that force scrolling for primary Dashboard content.
- Badges wrap and may move below the row title.
- Dates and source metadata must wrap instead of disappearing.
- Risk, missing evidence, and stale-data labels must remain visible.
- Minimum tap target for important actions: 40px height, preferably 44px.

## 11. Acceptance Criteria

The design handoff is acceptable only if:

- Another agent can implement from this markdown without guessing the product intent.
- Black-gold is used with restraint.
- Dashboard remains a working financial tool, not a landing page.
- Business semantics are preserved.
- Mobile states are described clearly.
- Implementation boundaries are explicit.
- Opportunity UI preserves reasons, risks, data date, trust evidence, data quality, freshness, and rule-based explainability.
- No out-of-scope product expansion is introduced.

## Reference Mock

The reference mock is taste/reference only and is not an implementation contract. The source of truth remains this markdown.

- Reference image: `docs/design/frontend-redesign-v1-reference.png`
- Editable/source reference: `docs/design/frontend-redesign-v1-reference.svg`
- Logo reference: `docs/design/frontend-redesign-v1-logo.svg`
- Logo preview: `docs/design/frontend-redesign-v1-logo.png`
- Mock intent: black-gold, restrained, dense Dashboard workspace with a compact status strip, a quiet/opportunity panel, target rows, and trust evidence.
- The implementation may adapt layout details to the existing component structure, but must preserve the product intent and boundaries in this handoff.
