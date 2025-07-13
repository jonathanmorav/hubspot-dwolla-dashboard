# Feature Improvement Visual Mockups

## Current State vs. Future State

### 1. Smart Cross-Platform Data Correlation

#### Current State (Disconnected Data)
```
┌─── HubSpot Panel ────────────────┐    ┌─── Dwolla Panel ─────────────────┐
│ Companies (1)                    │    │ Customers (1)                    │
│ ┌──────────────────────────────┐ │    │ ┌──────────────────────────────┐ │
│ │ Acme Corp                    │ │    │ │ Acme Corporation             │ │
│ │ Dwolla ID: abc-123-def       │ │    │ │ ID: abc-123-def              │ │
│ │ Status: Active               │ │    │ │ Type: business               │ │
│ └──────────────────────────────┘ │    │ │ Status: verified             │ │
│                                  │    │ └──────────────────────────────┘ │
│ Contacts (1)                     │    │                                  │
│ ┌──────────────────────────────┐ │    │ Recent Transfers (0)             │
│ │ John Doe                     │ │    │ Click customer to load transfers │
│ │ john@acme.com                │ │    │                                  │
│ └──────────────────────────────┘ │    │                                  │
└──────────────────────────────────┘    └──────────────────────────────────┘
```

#### Future State (Connected & Intelligent)
```
┌─── HubSpot Panel ────────────────┐ 🔗 ┌─── Dwolla Panel ─────────────────┐
│ Companies (1)                    │╲  ╱│ Customers (1)                    │
│ ┌──────────────────────────────┐ │ ╲╱ │ ┌──────────────────────────────┐ │
│ │ ✅ Acme Corp                 │◀━━━━▶│ │ ✅ Acme Corporation          │ │
│ │ Dwolla ID: abc-123-def   🔗 │ │    │ │ ID: abc-123-def              │ │
│ │ Status: Active               │ │    │ │ Type: business               │ │
│ │                              │ │    │ │ Status: verified ✓           │ │
│ │ ⚠️ Address mismatch          │ │    │ │                              │ │
│ └──────────────────────────────┘ │    │ └──────────────────────────────┘ │
│                                  │    │                                  │
│ Contacts (1)                     │    │ Recent Transfers (3) - Auto-loaded│
│ ┌──────────────────────────────┐ │    │ ┌──────────────────────────────┐ │
│ │ John Doe                     │ │    │ │ $1,250.00 ✓ Oct 15, 2024    │ │
│ │ john@acme.com            📧 │◀━━━━▶│ │ $2,500.00 ✓ Oct 10, 2024    │ │
│ └──────────────────────────────┘ │    │ │ $500.00   ✓ Oct 5, 2024     │ │
└──────────────────────────────────┘    └──────────────────────────────────┘

[ℹ️ Accounts linked via Dwolla ID with 100% confidence]
```

### Visual Indicators:
- 🔗 Link icon shows connected accounts
- ✅ Checkmark for verified/matched data
- ⚠️ Warning for data inconsistencies  
- 📧 Email match indicator
- Green connecting lines for linked data
- Auto-loaded transfers when accounts are linked

---

### 2. Search History & Smart Suggestions

#### Search Bar Enhancement
```
┌─────────────────────────────────────────────────────────┐
│ 🔍 Search by email, name, or business name...           │
├─────────────────────────────────────────────────────────┤
│ Recent Searches                              Shortcuts  │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 📧 john@acme.com           (2 min ago)      Cmd+1  ││
│ │ 🏢 Acme Corp               (15 min ago)     Cmd+2  ││
│ │ 📧 sarah@techco.com        (1 hour ago)     Cmd+3  ││
│ │ 👤 Robert Johnson          (Today)          Cmd+4  ││
│ │ 🏢 Global Industries       (Today)          Cmd+5  ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Frequently Searched This Week                           │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 🔥 john@acme.com (12 times)                        ││
│ │ 🔥 Acme Corp (8 times)                             ││
│ │ 🔥 sarah@techco.com (6 times)                      ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ [Clear History]                                         │
└─────────────────────────────────────────────────────────┘
```

#### Smart Suggestions While Typing
```
┌─────────────────────────────────────────────────────────┐
│ 🔍 acm│                                                 │
├─────────────────────────────────────────────────────────┤
│ Suggestions                                             │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 🏢 Acme Corp              ⚡ Quick search           ││
│ │ 🏢 Acme Industries        Last searched yesterday  ││
│ │ 📧 john@acme.com          Searched 12 times        ││
│ │                                                     ││
│ │ Similar customers you've searched:                  ││
│ │ 🏢 Apex Corporation                                ││
│ │ 🏢 Academy Sports                                  ││
│ └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

### 3. Contextual Quick Actions

#### Customer Card with Quick Actions
```
┌──────────────────────────────────────────────────────────┐
│ 🏢 Acme Corp                                             │
│ Type: Business • Status: Unverified ⚠️                   │
│ Email: billing@acme.com                                  │
│ Dwolla ID: abc-123-def                                   │
│                                                          │
│ Recent Activity:                                         │
│ • Last transfer: Failed - $5,000 (2 hours ago) ❌        │
│ • Account created: 3 days ago                            │
│                                                          │
│ ┌─ Quick Actions ──────────────────────────────────────┐ │
│ │ [🔍 Check Verification]  [❌ View Failure]           │ │
│ │ [📋 Copy Details]        [🔗 Open in Dwolla]        │ │
│ │ [📝 Create Ticket]       [📧 Email Template]        │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

#### Action Modal Example - Verification Requirements
```
┌─── Verification Requirements ────────────────────────────┐
│ Customer: Acme Corp                                      │
│ Current Status: Unverified                               │
│                                                          │
│ Required Documents:                                      │
│ ☐ Business Registration                                  │
│ ☐ EIN Documentation                                      │
│ ☑ Bank Account (Completed)                              │
│                                                          │
│ Missing Information:                                     │
│ • Controller Information                                 │
│ • Business Address Verification                          │
│                                                          │
│ [📧 Send Requirements Email] [📋 Copy List] [✕ Close]   │
└──────────────────────────────────────────────────────────┘
```

#### Copy Customer Details Format
```
┌─── Copied to Clipboard! ─────────────────────────────────┐
│ Customer: Acme Corp                                      │
│ Type: Business                                           │
│ Email: billing@acme.com                                  │
│ Status: Unverified (Dwolla)                             │
│ Dwolla ID: abc-123-def                                   │
│ HubSpot ID: 12345                                        │
│ Last Activity: Failed transfer - $5,000 (2 hours ago)    │
│                                                          │
│ ✅ Details copied! Paste into your support ticket.       │
└──────────────────────────────────────────────────────────┘
```

---

### 4. Complete Enhanced View

#### Full Extension Interface with All Improvements
```
┌─── Unified Customer Dashboard ───────────────────────────┐
│ 🏢 Your Company Logo    Customer Dashboard         🐛    │
├──────────────────────────────────────────────────────────┤
│ 🔍 Search: acme corp                          [Search]   │
│ ⚡ Tip: Press Cmd+K to search, Cmd+1-5 for recent       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ ┌─── HubSpot ─────────────┐ 🔗 ┌─── Dwolla ────────────┐│
│ │ ✅ Acme Corp            │╲  ╱│ ✅ Acme Corporation   ││
│ │ Status: Active          │ ╲╱ │ Status: Unverified ⚠️  ││
│ │ Dwolla: abc-123-def 🔗  │  ⚡ │ ID: abc-123-def       ││
│ │                         │    │                       ││
│ │ [📋 Copy] [🔗 Open]     │    │ [🔍 Verify] [🔗 Open] ││
│ └─────────────────────────┘    └───────────────────────┘│
│                                                          │
│ ┌─── Data Insights ──────────────────────────────────────┐│
│ │ ⚠️ Address mismatch between HubSpot and Dwolla        ││
│ │ ℹ️ This customer has been searched 12 times this week ││
│ │ 💡 Similar issue resolved yesterday for TechCo        ││
│ └────────────────────────────────────────────────────────┘│
│                                                          │
│ Recent Team Activity:                                    │
│ • Sarah viewed this customer 10 min ago                  │
│ • Mike resolved verification for similar case            │
└──────────────────────────────────────────────────────────┘
```

---

## Design Principles

### Visual Hierarchy
1. **Primary**: Customer name and status
2. **Secondary**: Quick actions and key identifiers  
3. **Tertiary**: Metadata and timestamps

### Color Coding
- 🟢 Green: Verified, successful, linked
- 🟡 Yellow: Warning, pending, needs attention
- 🔴 Red: Error, failed, urgent
- 🔵 Blue: Information, links, actions

### Icons for Quick Recognition
- 🏢 Business customer
- 👤 Personal customer
- 📧 Email-related
- 🔗 Linked/Connected
- ⚠️ Warning/Attention needed
- ✅ Verified/Complete
- ❌ Failed/Error
- 🔍 Search/Investigate
- 📋 Copy to clipboard
- ⚡ Quick action/Tip

### Interaction Patterns
- **Hover**: Show additional details
- **Click**: Primary action (select/expand)
- **Right-click**: Context menu with more options
- **Keyboard**: Full keyboard navigation support
- **Drag**: Reorder recent searches

---

## Implementation Notes

### Animation Guidelines
- Fade in new results (200ms)
- Slide down dropdowns (150ms)
- Pulse on successful actions
- Shake on errors
- Smooth transitions between states

### Responsive Behavior
- Minimum width: 800px (Chrome extension constraint)
- Stack panels vertically on narrow screens
- Collapse quick actions to icons on small panels
- Maintain readability at all sizes

### Accessibility
- High contrast mode support
- Screen reader announcements for state changes
- Keyboard navigation for all interactive elements
- Focus indicators on all clickable items
- ARIA labels for icons and status indicators