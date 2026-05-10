# PayOrch — Settings Page Implementation Spec

> Use this file as your complete implementation guide for the **Settings** page of the PayOrch dashboard.
> The existing codebase uses a **dark theme** (`#0d1117` background), purple primary (`#6c47ff`), and the sidebar navigation pattern seen across all other pages.

---

## 🎯 Goal

Replace the current `"Settings page coming soon..."` placeholder with a fully functional, tabbed Settings page that is consistent with the existing PayOrch UI.

---

## 🖼️ Design Reference (Existing UI Patterns)

Match these visual rules from the rest of the app:

| Token | Value |
|---|---|
| Background | `#0d1117` |
| Card/Panel bg | `#161b22` |
| Border color | `#30363d` |
| Primary accent | `#6c47ff` |
| Text primary | `#e6edf3` |
| Text secondary | `#8b949e` |
| Success green | `#3fb950` |
| Error red | `#f85149` |
| Warning yellow | `#d29922` |
| Font | Same as existing app (match current) |

- All cards use `border-radius: 8px` and `border: 1px solid #30363d`
- Input fields: dark bg `#0d1117`, border `#30363d`, focus ring purple
- Buttons: filled purple for primary, outlined/ghost for secondary
- Section headers: uppercase, small, letter-spaced, muted color (like `GATEWAY`, `STATUS` in the table)

---

## 📐 Page Layout

```
┌──────────────────────────────────────────────────────┐
│  Settings                                             │
│  Configure your PayOrch workspace.                    │
├──────────────────────────────────────────────────────┤
│  [Gateways] [Routing Rules] [Webhooks] [Circuit       │
│   Breaker] [Alerts] [API Keys] [Team]                 │
├──────────────────────────────────────────────────────┤
│                                                       │
│   << Active Tab Content >>                            │
│                                                       │
└──────────────────────────────────────────────────────┘
```

Use a **horizontal tab bar** just below the page title. Tabs switch content panel. Active tab has purple underline + white text. Inactive tabs are muted.

---

## 📑 Tab 1 — Gateway Configuration

**Purpose:** Add, edit, enable/disable payment gateways and their credentials.

### UI Elements

- List of gateway cards (one per gateway: Razorpay, Stripe, PayU, UPI)
- Each card contains:
  - Gateway logo/name + colored status badge (`ENABLED` green / `DISABLED` muted)
  - Toggle switch (on/off) — disabling removes it from routing without deleting
  - Expandable section (click "Configure") with:
    - `API Key` — text input (masked, with show/hide toggle 👁)
    - `API Secret` — text input (masked)
    - `Webhook Secret` — text input (masked)
    - `Environment` — dropdown: `Sandbox` / `Production`
  - `Save Changes` button per card
- `+ Add New Gateway` button at bottom (opens a modal with gateway name, type dropdown, and credential fields)

### State Notes
- Show a warning banner if a gateway is `ENABLED` but has missing credentials
- Show `Last tested: X mins ago` beneath each configured gateway

---

## 📑 Tab 2 — Routing Rules

**Purpose:** Define how payments are routed to gateways based on conditions.

### UI Elements

- Section header: `ROUTING RULES` with `+ Add Rule` button (top right)
- List of rules, each displayed as a card row:
  ```
  IF  [currency ▼]  [equals ▼]  [INR      ]  →  Route to  [UPI      ▼]   [⋮ menu]
  IF  [amount  ▼]  [greater than ▼]  [10000]  →  Route to  [Razorpay ▼]   [⋮ menu]
  ```
  - Condition fields: `Condition Type` (currency, amount, gateway_available), `Operator` (equals, greater_than, less_than), `Value`
  - Action: `Route to` gateway dropdown
  - Row actions via `⋮` menu: Edit, Delete, Move Up/Down (priority order)
- Drag handle icon on left side of each row for reordering
- Rules are evaluated top-to-bottom (show rule priority number on left)
- `Default Gateway` fallback selector at the bottom (used when no rules match)

### Retry Configuration (sub-section below rules)

- `Max Retries` — number input (default: 3)
- `Retry on Failure Only` — toggle
- `Retry Delay (ms)` — number input

---

## 📑 Tab 3 — Webhook Settings

**Purpose:** Manage webhook endpoint URLs and delivery policies per gateway.

### UI Elements

- One card per gateway with:
  - `Endpoint URL` — text input (e.g. `https://yourapp.com/webhooks/razorpay`)
  - `Signing Secret` — masked input with copy button
  - `Regenerate Secret` link (with confirmation dialog)
  - `Active` toggle
- `Retry Policy` section (global):
  - `Max Retries` — number input
  - `Retry Backoff` — dropdown: `Linear` / `Exponential`
  - `Retry Interval (seconds)` — number input
- `Alert on Webhook Failure` — toggle (links to Alerts tab)
- `Test Endpoint` button per gateway — sends a test ping and shows response status inline

---

## 📑 Tab 4 — Circuit Breaker

**Purpose:** Configure thresholds that automatically open/close circuit breakers per gateway (visible on Gateway Health page).

### UI Elements

- Intro callout box: `"Circuit breakers automatically disable a gateway when error thresholds are exceeded, preventing cascading failures."`
- One config card per gateway (Razorpay, Stripe, PayU, UPI):
  - Gateway name + current circuit status badge (OPEN / CLOSED / HEALTHY) — read-only, reflects live state
  - `Failure Threshold` — number input with label `"Open circuit after X errors"`
  - `Error Rate Threshold (%)` — number input `"Open circuit if error rate exceeds X%"`
  - `Cooldown Period (seconds)` — number input `"Wait X seconds before attempting recovery"`
  - `Half-Open Max Requests` — number input `"Allow X test requests before fully closing"`
  - `Manual Override` — buttons: `[Force Open]` `[Force Close]` `[Reset]` (with confirmation dialogs)
- `Auto Refresh Interval` — number input with `seconds` label (controls the interval on the Gateway Health page)
- `Save All` button at the bottom

---

## 📑 Tab 5 — Alerts & Notifications

**Purpose:** Configure where and when PayOrch sends operational alerts.

### UI Elements

- `Notification Channels` section:
  - `Email Alerts` — toggle + email input field (supports multiple comma-separated)
  - `Slack Alerts` — toggle + Slack Webhook URL input + `Test` button
  - `SMS Alerts` — toggle + phone number input (mark as "coming soon" / disabled state)

- `Alert Triggers` section — checklist of conditions:
  - [ ] Gateway circuit opens
  - [ ] Gateway error rate exceeds `___` %
  - [ ] Webhook delivery fails after all retries
  - [ ] Transaction failure spike (> X failures in Y minutes)
  - [ ] Daily transaction summary (time picker: send at `08:00 AM`)

- Each trigger row has an `Enable` toggle + optional threshold input where applicable

---

## 📑 Tab 6 — API Keys

**Purpose:** Manage API keys used to authenticate external access to PayOrch.

### UI Elements

- Table with columns: `NAME`, `KEY PREFIX`, `CREATED`, `LAST USED`, `STATUS`, `ACTIONS`
- Each row:
  - Name (e.g. "Production Key", "Dev Key")
  - Key prefix (e.g. `po_live_sk_••••••••`)
  - Created date
  - Last used (relative: "2 hours ago")
  - Status badge: `ACTIVE` / `REVOKED`
  - Actions: `Copy`, `Revoke` (with confirmation)
- `+ Generate New Key` button (top right) — opens modal:
  - `Key Name` text input
  - `Permissions` multi-select: Read Transactions / Simulate Payments / Manage Webhooks / Admin
  - `Expiry` date picker (optional)
  - Shows full key **once** on creation with copy button + warning: "Store this key securely. It won't be shown again."
- `IP Allowlist` section below table:
  - Input to add allowed IPs/CIDR ranges
  - List of current allowed IPs with remove buttons
  - Toggle: `Enforce IP Allowlist`

---

## 📑 Tab 7 — Team

**Purpose:** Manage user access to the PayOrch workspace.

### UI Elements

- Table: `NAME`, `EMAIL`, `ROLE`, `JOINED`, `STATUS`, `ACTIONS`
- Role badges: `ADMIN` (purple), `DEVELOPER` (blue), `VIEWER` (muted)
- Row actions: `Change Role` dropdown, `Remove` button (with confirmation)
- `+ Invite Member` button (top right) — opens modal:
  - `Email` input
  - `Role` dropdown: Admin / Developer / Viewer
  - `Send Invite` button
- Pending invites section below table (shows email + `PENDING` badge + `Resend` / `Cancel` actions)
- `Your Account` card at very bottom:
  - Display name + email (editable inline)
  - `Change Password` button (opens modal with current/new/confirm fields)

---

## 🧱 Component Checklist

Build or reuse these components for the Settings page:

- [ ] `<SettingsTabs />` — horizontal tab nav
- [ ] `<GatewayCard />` — expandable gateway config card
- [ ] `<RuleRow />` — single routing rule with drag handle
- [ ] `<MaskedInput />` — text input with show/hide toggle
- [ ] `<ToggleSwitch />` — consistent on/off toggle (reuse if exists)
- [ ] `<ConfirmDialog />` — modal for destructive actions (revoke, force open, etc.)
- [ ] `<ApiKeyModal />` — key generation modal with one-time reveal
- [ ] `<StatusBadge />` — reuse from existing dashboard/gateway health

---

## ⚠️ Behavior & Validation Rules

1. **Unsaved changes indicator** — if a user edits a field and tries to switch tabs, show a confirmation: `"You have unsaved changes. Leave anyway?"`
2. **Credential masking** — API keys and secrets are always masked on load. User must explicitly click show.
3. **Destructive actions** — Force Open circuit, Revoke API key, Remove team member — all require a `<ConfirmDialog />`.
4. **Empty states** — If no routing rules, gateways, or API keys exist, show a helpful empty state with a CTA button.
5. **Form validation** — URL fields validate format, email fields validate format, number fields enforce min/max.
6. **Success/error toasts** — Show toast notifications on save success or failure (reuse existing toast pattern from app if available).

---

## 📁 Suggested File Structure

```
src/
├── pages/
│   └── Settings.jsx          ← Main settings page with tab routing
├── components/settings/
│   ├── GatewayConfig.jsx
│   ├── RoutingRules.jsx
│   ├── WebhookSettings.jsx
│   ├── CircuitBreaker.jsx
│   ├── AlertsNotifications.jsx
│   ├── ApiKeys.jsx
│   └── TeamManagement.jsx
└── components/ui/
    ├── MaskedInput.jsx        ← if not already present
    ├── ConfirmDialog.jsx      ← if not already present
    └── ToggleSwitch.jsx       ← if not already present
```

---

## ✅ Implementation Order (Recommended)

1. **Tab shell** — build the tab navigation and empty panels first
2. **Gateway Configuration** — highest impact, core feature
3. **Circuit Breaker** — directly powers the Gateway Health page
4. **Routing Rules** — powers Payment Simulator routing logic
5. **Webhook Settings** — extends Webhook Logs page
6. **Alerts & Notifications** — operational utility
7. **API Keys** — security
8. **Team** — last, often less urgent in early builds
