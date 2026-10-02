---
target: app/(tabs)/index.tsx
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 4
target_identity: "file:/Users/serdar/crm_myself/app/(tabs)/index.tsx"
target_fingerprint: "sha256:8aff75ca46572694fcedbc37abfcbd84652d7c7eb6db079eac752a5fc697908d"
target_path: /Users/serdar/crm_myself/app/(tabs)/index.tsx
timestamp: 2026-09-15T12-07-14Z
slug: app-tabs-index-tsx
closed: true
---
Method: dual-agent (A: design review · B: rendered evidence). Detector: `impeccable detect` not run — HTML/CSS rule engine, not applicable to React Native source (per routing guidance for `ios`). Substituted: WCAG contrast computation over both palettes, touch-target measurement, Dynamic Type scan, and simulator captures.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No loading state; `EMPTY` (index.tsx:17) renders as truth on cold mount, so a populated user briefly sees "Nobody here yet". `Loading` exists in ui.tsx:136, unused here. |
| 2 | Match System / Real World | 3 | "Keep the thread." / "A quiet day." are excellent. "Strong" (:78) is an undefined internal threshold; "Today" (:82) means less here than in app/today.tsx. |
| 3 | User Control and Freedom | 2 | Nothing is actionable, dismissible or expandable. `due.slice(0,3)` (:85) truncates with no escape; `viewAll` exists in both languages (i18n.ts:21,309) and is wired nowhere. |
| 4 | Consistency and Standards | 2 | Today card looks identical to followup.tsx:53 but lacks its snooze / mark-contacted actions. 7 raw hexes on the screen. No iOS large title. |
| 5 | Error Prevention | 2 | `load()` (:25-36) has no try/catch; `useFocusRefresh` fires `void load()`, so a DB failure renders as "you have no contacts". |
| 6 | Recognition Rather Than Recall | 3 | Avatars, names, role·company read well. `● 4` is unexplained; "Strong" requires remembering a threshold. |
| 7 | Flexibility and Efficiency | 1 | Goal is "get to a person fast"; Home exposes 7 people (3 follow-ups + 4 `created_at DESC`). No search, no favourites, no swipe, no long-press. |
| 8 | Aesthetic and Minimalist Design | 2 | The largest, most saturated element (:56-66) is the least actionable; 2 of 5 headline numbers are duplicates. |
| 9 | Error Recovery | 1 | No error surface at all. `ErrorNote` (ui.tsx:141) is unreachable from Home; failure is indistinguishable from emptiness. |
| 10 | Help and Documentation | 3 | Empty-network card and "A quiet day…" are real in-context help. Docked for "Strong" and `● 4`. |
| **Total** | | **21/40** | **Acceptable — significant improvements needed** |

## Design Specificity Verdict

**Authored in the bottom third, category-interchangeable in the top two-thirds — and the top is what a returning user sees.**

Measured on a 440×956 pt iPhone: wordmark and slogan to ~119 pt, decorative teal panel ~145–348 pt, stat tiles ~364–456 pt, "Today" heading ~487 pt. The first row representing a human being starts around 520 pt. Simulator capture confirms it: on the current build, Home opens with a logo, a tagline, a decorative panel with two outline circles, and three zeroes.

Two of five headline numbers are the same value printed twice: `strongConnections(data.strong)` (:60) and the "Strong" tile (:78); `data.due.length` (:77) and `followUpsCount(data.due.length)` (:83), 31 pt apart under different labels.

The teal panel breaks the system just written for it: DESIGN.md's Teal-Is-State rule says a teal surface that is not state or ownership must be sage or card. This one is decoration. The One Warm Voice rule allows one coral per screen region; the first viewport has three (:47, :51, :64), and a populated Home has 10+ once every row's strength dot lands.

`ContactRow` + `Avatar` are the opposite: specific, restrained, degrade gracefully. That authored work is buried under a brand panel.

## Deterministic Evidence

**Contrast (WCAG 2.1): 14 failures in light, 8 in dark.** Worst offenders, all on this screen:
- coral `#F0644F` on paper — "NETWORKOS" eyebrow, 12 pt/900: **2.96:1** (needs 4.5)
- coral on card — "Follow up · 47 days overdue", 12 pt/800: **3.16:1**
- white on coral — every primary button label, 16 pt/800: **3.16:1**
- coral on card — tab bar active label, 11 pt/700: **3.16:1**
- muted `#64777B` on paper — "A quiet day…", "n follow-ups": **4.41:1**
- DARK: teal `#12454C` on sage `#183239` — avatar initials on every row and every ghost button label: **1.27:1**. Effectively invisible.

**Touch targets: 0 failures.** Add button 66×66 with hitSlop, ContactRow 62 pt, Btn 52 pt, tab items ~88 pt.

**Dynamic Type: 0 opt-ins app-wide.** No `allowFontScaling`, `maxFontSizeMultiplier`, or `fontScale` anywhere in `app/` or `src/`. 17 hard-coded font sizes on this screen and its primitives, inside fixed heights (`minHeight:HIT+8`, tab bar `height:84`, `maxWidth:270`). PRODUCT.md claims Dynamic Type support; the code does not implement it.

**Raw hexes bypassing the theme: 34 lines**, 7 of them on Home (`#5D8988` ×2, `#C4DDDA`, `#fff` ×3 at :52,57,58,60,61,63 + ui.tsx:72).

## Simulator Evidence

Release build, iPhone 17 Pro Max, Turkish locale:
- Home renders as described: brand block, decorative panel, three zeroes, then work. "Recently added" heading draws with nothing beneath it.
- Dark mode works correctly on the current build (paper, cards, and unchanged coral all resolve). An earlier contradictory reading came from a stale build installed on the device; reinstalling the current build resolved it.
- `networkos:///(tabs)` deep-links straight past onboarding. No owner profile is created, and the network graph still draws a "You" node for a person who never introduced themselves.
- Network tab: the eyebrow reads **"NETWORK" in English** on a Turkish device (network.tsx:74, hard-coded). The start-point sheet covers the rewind control, and the date chips clip at the right edge.

## Priority Issues

**[P0] The section called "Today" is not today.** Home's Today contains follow-ups only (:33). Birthdays, promises and relationship pulse live in app/today.tsx, reachable as row 1 of a 20-row More list. Home already fetches `CommitmentRepository.dueCount()` (:31) and spends it on a notification (:35). A user who trusts the word "Today" misses every birthday — unrecoverable, against the product's core claim. *Fix:* render the promise count already in hand, add birthdays from `withBirthday()` + `nextAnniversary()`, or rename the section and link to `/today`. → `$impeccable shape`

**[P1] Empty state doubles as loading state; errors render as emptiness.** `EMPTY` (:17) means pre-data render says "Nobody here yet" to a user with 300 contacts, and `load()` has no try/catch, so a DB failure stays there permanently. Telling a private memory's owner that they have no one is the most damaging message this app can show. *Fix:* a `loaded` flag gating the empty card, `Loading` until it flips, try/catch → `ErrorNote` with retry. → `$impeccable harden`

**[P1] First viewport is brand, not work.** Move the Today block directly under the header, replace the decorative panel with a single line, collapse the stat trio below the fold, delete the duplicated follow-up tile. → `$impeccable layout`

**[P1] Follow-ups on Home cannot be acted on.** Same card shape as followup.tsx:53 without its snooze / mark-contacted buttons; clearing one costs 3+ taps versus 1 on the Follow up tab. Identical containers with different powers teach users that Home is inert. *Fix:* lift `action()` from followup.tsx:37-42 into ui.tsx and render both buttons per row. → `$impeccable shape`

**[P1] Coral fails contrast exactly where it carries meaning.** "47 days overdue" at 3.16:1 is the most important and least legible string on the screen; in dark mode avatar initials sit at 1.27:1. Coral is simultaneously inflated (5+ uses per screen), so the one warm voice no longer interrupts. *Fix:* `c.warn` for overdue text, coral reserved for the FAB, demote the row strength dot, and repair the dark sage/teal pair in theme.ts. → `$impeccable colorize`

**[P2] Untranslated "NETWORK" eyebrow on the Network tab** (network.tsx:74) — English text on a Turkish screen, breaking the bilingual-parity principle. → `$impeccable clarify`

**[P2] Stat tiles look tappable and are not** (:39-42, plain `View`s), and VoiceOver reads "248" and "Contacts" as two unrelated elements.

## Persona Red Flags

**Casey (one-handed, interrupted):** the only create action sits top-right, furthest from a right thumb. Three tiles look like buttons and swallow taps. Header says "7 follow-ups" and three rows render, with no "view all". A 47-day lapse and a routine ping render identically.

**Jordan (first-timer):** "Keep the thread." is the largest text and explains nothing. The most prominent CTA, "Open network", opens an empty graph. Two empty messages 16 pt apart in different voices. "Recently added" renders as an orphaned heading.

**Ayşe (Turkish freelancer, 300 imported contacts):** cold start shows "Henüz kimse yok" before SQLite answers. "Son eklenenler" is permanently useless to her — `created_at DESC` after a bulk import is arbitrary. Turkish body copy runs ~25% longer inside a hard-coded `maxWidth:270`, pushing the work further down.

## Minor Observations

- `viewAll` is defined in both languages and rendered nowhere.
- `ContactRepository.stats()` computes a `due` column Home ignores (dead SQL, latent divergence).
- The add button is a 50 pt squircle where DESIGN.md reserves circles for people and counts.
- `paddingTop:58` and tab bar `height:84` are hard-coded instead of safe-area insets; no `SafeAreaView` or `useSafeAreaInsets` exists anywhere in the project.
- The coral overdue line is a sibling of the ContactRow Pressable, so VoiceOver detaches the most important fact from the row it belongs to.
- `NotificationService.refreshDigest` fires as a side effect of the tab gaining focus — rendering Home writes notification state.

## Questions to Consider

1. If coral marks every contact row on every screen, what does it have left to say when someone is 47 days overdue — at 3.16:1?
2. Home already knows how many promises are due and hands the number to a notification. Why does the weekly digest know more about today than the screen titled "Today"?
3. If app/today.tsx is the real Today, why is it row 1 of 20 in More, and why does the landing tab get to borrow its name?
