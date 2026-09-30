# Riley Wheel Brawl: 500 proposed future improvements

Prepared 2026-09-30. Proposal only. None of these entries is claimed as implemented or approved for release.

## Executive overview

Exactly **500 distinct improvements**, organized into **ten proposed passes of 50**, extend the existing game without delaying the current 50-item 1.1 delivery. Start with access and practice, then optional combat and story depth. Build visual/audio polish and broader device support around those choices. Add resilience and reusable authoring tools before committing to two optional post-finale levels.

The smallest useful next selection is the P01 readability/control foundation plus the P02 practice courtyard. P03 is a separate remix experiment. P04 proposes at most one extra cinematic per original stage. P10 proposes Tar Valon River Docks and Mountains of Mist Trail, each with six encounters and independent balance evidence. No third new level is hidden elsewhere in this plan.

Pass names are planning buckets, not promised release versions or equal-duration sprints. Effort varies substantially: an L feature can outweigh several S items. Choose scope after feedback, move a dependency earlier when necessary, and keep each reviewed pass at its intended 50-item scope by recording any explicit scope revision.

## Boundaries and source check

This backlog was checked against [the current 1.1 plan](V11_PLAN.md), [the design brief](BRIEF.md), [engine notes](ENGINE.md), [current device work](V11_MENU_DEVICE.md), and the current source modules listed in the JSON artifact. It excludes the current 1.1 caching/pacing fixes, edge-stall repairs, pause/Back work, five-stage save compatibility, Normal/Hard tuning, existing boss tells, voice repair/normalization, victory/defeat art, stage shadows, first-enemy cards, seam work and basic device checks. New supporting tooling is a reusable capability beyond one-off 1.1 evidence.

The current game already has spear enemies, hounds, a homecoming/credits screen, standard remapping, reduced shake, colorblind health, synthesized audio fallbacks and a WebGL puppet-loss fallback. Proposed additions distinguish themselves: a vaulting pole guard rather than another spear jab; a new stone-sprite role rather than another hound; expanded credits/replay/exports; complete motion-off and separate low-flash options; advanced profiles; new sound banks; and main-2D-canvas restoration.

- The present 50-item 1.1 deliverable and its unresolved evidence gates take precedence; this roadmap does not delay it or claim its completion.
- All 500 entries are proposed future work, not built features, approved release scope or a promise to implement everything.
- Keep painted art, the no-build browser runtime, offline single-player play, Riley age 16 with blue glasses and sleeveless black coat, and TT age 8 with her blue dancer identity.
- No accounts, public leaderboards, tracking, monetization, paid services, voice cloning or routine external transmission. Proposed statistics and profiles remain local and user-controlled.
- New recorded assets remain optional, locally available, versioned and backed by existing procedural or synthesized fallbacks; real listening and art review remain necessary.
- Creative approvals and required licenses must be resolved before producing or distributing new material. New terms, downloads, permission grants or external sharing require their applicable approval.
- New assisted settings are labeled and excluded from standard Normal/Hard balance and strict real-time performance evidence. Never slow a clock to pass a standard gate.
- The original five-stage Normal and Hard matrix remains separate from remix and expansion matrices. New content must not silently change those five stage configurations.
- Exactly two optional new levels are proposed. Exactly one optional additional cinematic reel per original stage is proposed in F151–F155; galleries, captions, static postcards and environmental vignettes add no further reels.
- Preserve inherited tests and protected source art. Any genuine contract conflict needs an explicit review decision, not a quietly weakened threshold.
- Browser simulation and automated playthroughs do not certify physical hardware, actual listening or voluntary family playtests. Mark blocked or unrun gates honestly.
- Select and review each batch before implementation; publish only after fresh explicit GO for the exact reviewed candidate.

## Sequencing rationale

| Pass | Items | Purpose |
|---|---|---|
| P01 — Access and reading comfort | F001–F050 (50) | Make the game easier to read and operate before asking players to learn more systems. Assisted variants stay visibly separate from standard balance and performance results. |
| P02 — Practice and skill discovery | F051–F100 (50) | Provide a safe place to learn the current game, test access choices and understand mistakes before expanding combat complexity. |
| P03 — Optional combat remix | F101–F150 (50) | Put new enemies, techniques and encounter rules behind a separate remix route so the original five-stage experience retains its measured identity. |
| P04 — Family story and chapter replay | F151–F200 (50) | Deepen the existing rescue story through optional short scenes, readable context and spoiler-aware replay rather than extending the main rescue plot. |
| P05 — Painted presentation assets | F201–F250 (50) | Add authored painted objects, effects and selective character animation after gameplay needs are clear; keep approved source paintings intact. |
| P06 — Sound character and mix choice | F251–F300 (50) | Add original or suitably licensed offline sound detail and per-category control; preserve the existing theme and make all alternate music optional. |
| P07 — Broader device and control support | F301–F350 (50) | Extend beyond standard-controller and basic-touch support with explicit local profiles, calibration, hybrid input and browser-aware controls. |
| P08 — Offline ownership and resilience | F351–F400 (50) | Make longer-term play safer with verified offline packs, local backups, recovery paths and bounded resource lifetimes. |
| P09 — Authoring and review tools | F401–F450 (50) | Reduce the cost of safely maintaining a larger game through reusable local editors, deterministic evidence and content validation. |
| P10 — Two optional post-finale levels | F451–F500 (50) | Add River Docks and Mountains of Mist only after the core is stable; give each its own targets, evidence and release decision. |

P09 is listed as the tooling consolidation pass, but its schema, replay and content-check foundations can be pulled forward when they reduce risk in an earlier pass. The IDs remain stable; this does not mean earlier features must wait for every tool. P10 is gated on its own art, comprehension, resilience and balance evidence, not merely on reaching item 451.

## Separate balance matrices

- Original campaign: preserve the five-stage matrix in V11_PLAN.md. Normal stays within five percentage points of the fresh live baseline per stage; current late-Hard targets remain S3/S4/S5 = 50/35/25%. Report all five original stages.
- Remix: its own fixed-seed, per-stage report, never pooled with standard results. Assisted play and practice also stay separate.
- River Docks: proposed Normal clear-rate band 65–85%; Hard 35–55%.
- Mountains of Mist Trail: proposed Normal 55–75%; Hard 25–45%.
- Each optional level uses 40 fixed seeds, the same declared controller, three lives, no HP top-ups, and reported duration/damage/failures. These proposed bands are starting design targets, not achieved results or evidence of human enjoyment. They must be reviewed before implementation.
- Both optional levels happen after the established rescue ending. Neither changes stage numbering, Callandor acquisition, TT's reveal or the original finale.

## How to read each item

- ID: stable F001–F500 identifier.
- Proposed pass: the containing P01–P10 section; it is also explicit in every JSON record.
- Acceptance: a concrete observable outcome required before this item may be marked complete.
- Dependencies: required earlier future-item IDs; “none” means no dependency within this list, not exemption from existing release gates.
- Effort: S = contained subsystem or small asset set; M = coordinated change or substantial asset; L = new system, complex interaction, large set or cross-device work. These are relative sizes, not dates.
- Priority: P1 = foundation/safety/readability/compatibility/gate; P2 = high-value follow-on; P3 = optional polish/experiment.

## Full proposed backlog

### P01 — Access and reading comfort (F001–F050)

Make the game easier to read and operate before asking players to learn more systems. Assisted variants stay visibly separate from standard balance and performance results.

| ID | Improvement | Testable acceptance criterion | Dependencies | Effort | Priority |
|---|---|---|---|---|---|
| F001 | Offer a first-run access setup card | A skippable card previews text, motion and controls; skipping leaves the current defaults and can be reopened from Options. | none | M | P1 |
| F002 | Scale dialogue independently of the HUD | Three caption sizes keep the complete longest line readable without covering Riley's combat lane at 640x360. | none | M | P1 |
| F003 | Add a bundled easy-reading text face | Players can choose a locally bundled proportional face for prose while labels remain aligned and font loading works offline. | none | M | P1 |
| F004 | Allow manual-only story advancement | With manual advance enabled, every reel caption remains until deliberate confirm, including after audio ends. | none | S | P1 |
| F005 | Offer instant caption reveal | Turning typing off displays the complete caption on its first frame without advancing the story or interrupting its voice. | none | S | P2 |
| F006 | Adjust caption background opacity | At minimum and maximum opacity, caption text remains legible on the brightest Tear and darkest Shadar Logoth samples. | F002 | S | P2 |
| F007 | Add non-color speaker markers | Each speaker has a named, distinct geometric marker that is recognizable when portraits and color are unavailable. | none | M | P2 |
| F008 | Choose top or bottom dialogue placement | The two caption placements respect reserved HUD regions and remember the choice across story and combat dialogue. | F002 | M | P2 |
| F009 | Provide a session dialogue transcript | A read-only log contains the last 30 heard lines with speaker names; opening it pauses play and never reveals future lines. | none | M | P1 |
| F010 | Caption gameplay-critical sound events | Full meter, healing, incoming ranged attacks and Loial arrival receive distinct optional text cues when dialogue is absent. | none | M | P1 |
| F011 | Give directional sound captions | Offscreen threat captions include left or right based on world position, updating correctly as the camera moves. | F010 | M | P2 |
| F012 | Provide a silent-play access preset | The preset enables essential captions and visual readiness cues; a muted five-stage playthrough requires no sound-only decision. | F010, F011 | M | P1 |
| F013 | Offer mono output | Mono combines both channels without clipping; every left-only and right-only test cue is audible through either output channel. | none | S | P1 |
| F014 | Separate rumble enablement from sound | Rumble can be disabled without changing music or effects, and no actuator request occurs while that setting is off. | none | S | P1 |
| F015 | Add a complete camera-motion-off option | The new option removes shake, punch and cinematic pans while preserving hit timing, screen coverage and stage navigation. | none | M | P1 |
| F016 | Provide an independent low-flash profile | Super, damage and lightning visuals use a restrained alternate treatment while their warning and damage intervals remain unchanged. | none | L | P1 |
| F017 | Show taint with a static warning alternative | A patterned border and countdown convey grace, warning and damage phases without wobble or pulsation. | F015, F016 | M | P1 |
| F018 | Allow ambient background animation to stop | Snow, pennants and decorative movement can freeze while enemies, hazards and all gameplay cues continue normally. | none | M | P2 |
| F019 | Offer selectable fighter outline contrast | Light and dark outline styles preserve painted interior pixels and make Riley identifiable against five representative backgrounds. | none | M | P1 |
| F020 | Encode hazard types with patterns | Mashadar, fire and beam warnings use different pattern shapes that remain distinguishable in grayscale at the 640x360 gameplay size. | none | M | P1 |
| F021 | Add shape-coded pickup markers | Healing, angreal and saidin markers remain distinct at small size without relying on blue, orange or yellow differences. | none | M | P1 |
| F022 | Offer a numeric taint countdown | An optional countdown matches the remaining grace period within one simulation tick and pauses with gameplay. | F017 | S | P2 |
| F023 | Expose an on-demand status sentence | A keyboard or menu action reads the current HP, lives, saidin and Loial availability from a semantic text region. | none | M | P1 |
| F024 | Mirror menu choices into semantic controls | Title, Options, pause and outcomes expose named, operable buttons in an accessibility tree with no duplicate activation. | none | L | P1 |
| F025 | Show a consistent semantic focus indicator | Keyboard focus is visible on every mirrored control and stays on the invoked row when returning from a subpanel. | F024 | M | P1 |
| F026 | Announce scene changes to assistive readers | Entering title, a stage, pause or an outcome produces one concise announcement; regular frames produce none. | F024 | M | P1 |
| F027 | Throttle repeated status announcements | Repeated identical low-health and meter notices produce at most one announcement per state change while manual status remains available. | F023, F026 | S | P1 |
| F028 | Describe story paintings in text | Every existing story plate has a brief selectable description that conveys the scene without spoiling later captions. | F024 | M | P2 |
| F029 | Support large-text menu reflow | At 200% text size, semantic menus reflow without horizontal scrolling and every action remains reachable at a 320px CSS width. | F024 | L | P1 |
| F030 | Offer a high-contrast menu palette | Selected, disabled and ordinary rows remain distinguishable by border or shape in both high-contrast palette variants. | F024 | M | P2 |
| F031 | Offer mixed-case reading text | Dialogue and explanations can use sentence case while names, button bindings and saved content retain their correct meaning. | none | M | P2 |
| F032 | Provide distinct color-vision palettes | Three previewable palettes alter cue colors only; grayscale and representative color-vision simulations retain each cue's shape distinction. | F020, F021 | M | P2 |
| F033 | Allow the status HUD to move to either upper corner | HP and meter panels can swap corners without overlapping captions, boss bars or the pause control. | none | M | P2 |
| F034 | Add a temporary Find Riley marker | A freely bound locator displays above Riley for one second, follows jump height, and costs no gameplay resource. | none | S | P2 |
| F035 | Outline Riley through decorative occluders | Only foreground scenery in front of Riley becomes locally translucent; enemy visibility and collision remain unchanged. | F019 | M | P2 |
| F036 | Add single-switch menu scanning | An optional timed scan highlights one semantic menu action at a time; one switch selects it, a dedicated escape target is always reachable, and gameplay never auto-activates. | F024 | S | P2 |
| F037 | Offer hold-to-repeat basic kicks as an assist | Holding kick issues ordinary legal kick presses only; assisted runs are labeled and excluded from unchanged Normal/Hard comparison data. | none | M | P2 |
| F038 | Offer assisted automatic attack facing | With this optional aid on, an attack press faces the nearest eligible target in reach only when no direction is held; hitboxes stay unchanged and the run is labeled assisted. | none | M | P3 |
| F039 | Offer bounded fireball lane assistance | Opt-in targeting adjusts only within a documented small lane angle, never selects behind Riley, and labels the run assisted. | none | M | P3 |
| F040 | Add an explicitly assisted slow-play mode | A 75% or 90% simulation-speed choice also slows tells and hazards; records show the speed and never count toward standard pacing or balance gates. | none | L | P2 |
| F041 | Offer an assisted taint-grace extension | Only assisted runs may double the grace interval; save/resume preserves the selected multiplier and Standard remains byte-for-byte configured as before. | none | M | P2 |
| F042 | Bind spin to a separate optional action | A dedicated remappable spin action performs the same move as down-plus-kick and does not consume another action on the same edge. | none | M | P1 |
| F043 | Offer toggle movement for motor access | An opt-in direction latch stops on opposing direction, pause or explicit stop; returning from a menu never resumes latched motion. | none | M | P3 |
| F044 | Mirror touch controls for left-handed play | A single previewed switch exchanges stick and action clusters while preserving labels and safe-area margins. | none | M | P1 |
| F045 | Adjust touch-button scale | Three touch sizes maintain nonoverlapping active regions or clearly explain the layout limit before applying. | none | M | P1 |
| F046 | Provide a drag-to-position touch editor | Players can place each control inside a safe preview area, undo changes and restore defaults without spending a combat action. | F045 | L | P2 |
| F047 | Adjust virtual-stick activation radius | The setting visibly previews the activation area, clamps to the safe region and remains independent of movement speed. | none | M | P2 |
| F048 | Add optional dwell selection for menus | A visible dwell timer activates one focused menu row, cancels when focus moves and never applies to gameplay or destructive actions. | F024 | L | P3 |
| F049 | Explain access options in plain language | Each option has one short purpose statement and names any assisted-run effect; reading the guide changes no settings. | F001 | M | P1 |
| F050 | Preview and revert access presets | Applying a preset stores the previous settings until confirmed; cancellation restores all changed values together. | F001 | M | P1 |

### P02 — Practice and skill discovery (F051–F100)

Provide a safe place to learn the current game, test access choices and understand mistakes before expanding combat complexity.

| ID | Improvement | Testable acceptance criterion | Dependencies | Effort | Priority |
|---|---|---|---|---|---|
| F051 | Build an offline practice courtyard | The title opens a separate no-score training scene whose exit returns to title without overwriting campaign Continue. | none | L | P1 |
| F052 | Add a configurable training dummy | A dummy can stand, guard or move in a chosen lane; changing its behavior resets only its local exercise state. | F051 | M | P1 |
| F053 | Provide one-action practice reset | Reset restores Riley, target, pickups, camera and exercise counters to the selected drill's start in under one second. | F051 | M | P1 |
| F054 | Allow practice freeze and single-step | A paused drill advances exactly one simulation tick per step and shows that frame stepping is unavailable in campaign. | F051 | M | P2 |
| F055 | Display recent practice inputs | An optional ten-entry history distinguishes press, hold and release and uses the player's current binding labels. | F051 | M | P1 |
| F056 | Show a move-phase training timeline | Startup, active and recovery bands match the selected move's actual state on every stepped frame. | F054 | M | P2 |
| F057 | Offer training-only collision visualization | Hit, hurt and lane-depth volumes are separately labeled and disappear completely on leaving practice without changing collision outcomes. | F051 | M | P2 |
| F058 | Explain practice damage and meter gains | Each hit reports base damage, modifiers and saidin gained; displayed sums match the target's state delta. | F051 | M | P2 |
| F059 | Replay the last practice attempt | A local ten-second attempt replay reproduces inputs and outcomes from its starting snapshot without changing campaign randomness. | F051 | L | P2 |
| F060 | Teach the three-kick rhythm | A drill passes only after front, roundhouse and back kick connect in order and points out the first mistimed link. | F051, F056 | M | P1 |
| F061 | Teach jump-kick reach | Three marked approach distances distinguish too far, correct reach and overshoot using the actual airborne collision result. | F051 | M | P1 |
| F062 | Teach lane-depth alignment | A target in a neighboring lane cannot pass the exercise until Riley aligns and lands a valid hit. | F051, F057 | M | P1 |
| F063 | Teach launcher and juggle timing | The exercise records a launch followed by an airborne hit and explains when a second hit arrives after landing. | F051 | M | P2 |
| F064 | Teach grab, knee and throw choices | A practice target supports each existing grab branch; the checklist completes only after three distinct legal outcomes. | F051 | M | P1 |
| F065 | Teach fireball cooldown and range | The player lands three spaced shots; an early press is identified as cooldown rather than a missed target. | F051 | M | P1 |
| F066 | Teach anti-air fireball aiming | A hovering target must be struck at two heights; the exercise shows the release-time aim direction before retry. | F051 | M | P1 |
| F067 | Teach angreal spread placement | A three-target arrangement can be hit by one empowered spread and reports which projectile hit each target. | F051 | M | P2 |
| F068 | Teach saidin spending before taint | A refillable drill reaches full meter, shows the grace period and succeeds when super is spent before the first taint tick. | F051 | M | P1 |
| F069 | Teach Loial's charge lane | Two formations demonstrate aligned and misaligned calls; reset restores training Loial without altering campaign availability. | F051 | M | P1 |
| F070 | Explain super damage against bosses | A practice boss survives a super and displays exact HP removed, demonstrating that screen-clear behavior differs for ordinary enemies. | F051, F058 | M | P1 |
| F071 | Compare Callandor super strength | A side-by-side training readout uses identical targets with and without Callandor and reports the measured damage difference. | F070 | M | P2 |
| F072 | Teach safe knockdown recovery choices | A drill distinguishes protected recovery from the first vulnerable frame and rewards moving to a clear lane afterward. | F051, F056 | M | P2 |
| F073 | Add a Chieftain response drill | The player avoids axe crash, horn charge and ground stomp separately; each failed attempt names the attack and safe response. | F051 | M | P1 |
| F074 | Add a Fade response drill | Players practice each existing Fade attack from a neutral reset and complete the set without relying on super. | F051 | M | P1 |
| F075 | Add a Draghkar response drill | The drill demonstrates why grounded kicks miss, then requires one jump kick and one fireball hit against the flying target. | F051 | M | P1 |
| F076 | Add a Be'lal response drill | Each Be'lal pattern can be isolated; success requires surviving its active phase and hitting during its recovery. | F051 | M | P1 |
| F077 | Add a Taim beam-avoidance drill | Three beam attacks offer valid escape lanes and report whether failure came from late movement or remaining in the beam lane. | F051 | M | P1 |
| F078 | Teach the joint-finish sequence safely | A finale sandbox demonstrates shield break, TT readiness and the joint hit without revealing the sequence before the player unlocks it. | F051 | M | P1 |
| F079 | Teach Mashadar lane changes | The hazard drill alternates two lane warnings and passes after three safe crossings without rewarding standing outside the floor. | F051 | M | P1 |
| F080 | Teach healing timing without waste | A drill compares healing at full and reduced HP and displays recovered versus unused healing amount. | F051 | M | P2 |
| F081 | Practice recovery-window punishment | A configurable enemy exposes a known recovery window; the drill scores only hits landing after its active attack ends. | F051, F056 | M | P2 |
| F082 | Practice reacting to entry direction | Alternating visible left/right entrances require turning and defending the correct side before a harmless training strike connects. | F051 | M | P2 |
| F083 | Practice separating two simultaneous threats | A melee and ranged target form a bounded exercise with two documented successful solutions and no unavoidable opening damage. | F051 | L | P2 |
| F084 | Add a boss-tell recognition quiz | Short existing tell clips ask for the safe response; every answer explains the actual attack lane and remains skippable. | F051 | M | P2 |
| F085 | Show personal reaction timing in drills | A local-only readout measures input delay from a tell onset in simulation time and clearly excludes render/input latency claims. | F054 | M | P3 |
| F086 | Show a translucent training demonstration | A read-only demonstration performs the selected lesson with labeled inputs, then hands control back from a fresh reset. | F051 | L | P2 |
| F087 | Offer beginner, standard and fast drill variants | Variants change only practice warning/recovery parameters, label their timing multipliers and leave every original campaign configuration value untouched. | F051 | M | P2 |
| F088 | Let players choose an untimed practice goal | Players may select three successful attempts instead of a timer; waiting or pausing never fails the exercise. | F051 | S | P1 |
| F089 | Undo the last practice configuration change | Undo returns target setup and rule choices to the previous configuration without undoing unrelated accessibility settings. | F052 | M | P3 |
| F090 | Keep optional local skill stamps | A stamp records completion of a named lesson without scores, streaks or online identity, and can be cleared from practice. | F051 | M | P2 |
| F091 | Suggest a drill from the current session's misses | With hints enabled, two repeated alignment misses suggest the lane drill once; leaving practice discards the suggestion history. | F062 | M | P2 |
| F092 | Provide a practice-record clear action | Clearing practice records requires a clear scope prompt and preserves campaign saves and access settings. | F090 | S | P2 |
| F093 | Add a no-pressure control sandbox | All actions light labeled indicators without damaging a target or spending resources, allowing a new layout to be tried safely. | F051 | M | P1 |
| F094 | Preview assisted controls in practice | Slow-play, repeat-kick and aim-assist choices can be tested on a dummy and show their assisted label before a campaign begins. | F037, F039, F040, F051 | M | P2 |
| F095 | Provide deterministic offline challenge cards | Five selectable seed cards define fixed practice setups; choosing the same card and settings reproduces target placement. | F051 | M | P3 |
| F096 | Build a player-configured practice gauntlet | Players choose up to five already-unlocked drills, restart a single drill, and exit without losing their campaign checkpoint. | F051 | L | P3 |
| F097 | Pause demonstrations while instructions are open | Opening an instruction card freezes its demonstration and resumes the exact move phase when dismissed. | F086 | S | P1 |
| F098 | Create a searchable move glossary | Searching by move name, input or purpose returns the correct existing technique with its current binding and practice shortcut. | F051 | M | P2 |
| F099 | Link a defeat explanation to a relevant drill | A defeat screen can open the matching unlocked practice exercise and return to the same retry checkpoint afterward. | F051 | M | P2 |
| F100 | Compare enemy spacing in a training arena | Players can observe melee-only, ranged-only and mixed spacing presets side by side through selectable setups with no hidden stat changes. | F052 | M | P3 |

### P03 — Optional combat remix (F101–F150)

Put new enemies, techniques and encounter rules behind a separate remix route so the original five-stage experience retains its measured identity.

| ID | Improvement | Testable acceptance criterion | Dependencies | Effort | Priority |
|---|---|---|---|---|---|
| F101 | Add an opt-in encounter-remix route | Remix is a separate selection with its own records and clearly identified enemy changes; standard five-stage spawns remain unchanged. | none | L | P1 |
| F102 | Introduce a vaulting pole-guard enemy | Unlike the existing spear enemy, this remix guard marks a landing spot, vaults across one lane and exposes its back during a fixed landing recovery. | F101 | L | P2 |
| F103 | Introduce a shield-bearer enemy | A front-facing shield blocks ordinary frontal kicks but leaves rear and recovery openings; a reference drill proves both counters. | F101 | L | P2 |
| F104 | Introduce a rally-drummer enemy | A drummer temporarily speeds nearby allies' decision intervals within a capped radius; defeating it removes the boost on the next tick. | F101 | L | P2 |
| F105 | Introduce a retreating courier enemy | A courier attempts a visible exit after one warning; interception prevents its single reinforcement without affecting stage completion logic. | F101 | L | P3 |
| F106 | Introduce a stone-slinger enemy | An arcing projectile has a visible landing marker and can be avoided by lane movement without requiring a jump. | F101 | L | P2 |
| F107 | Introduce a sidestepping duelist enemy | The duelist evades one predictable frontal approach, has a cooldown on evasion and remains punishable from two documented angles. | F101 | L | P2 |
| F108 | Introduce a slow heavy-mauler enemy | The mauler commits to a marked swing lane, breaks light cover and gives a longer punish window rather than merely inflated HP. | F101 | L | P2 |
| F109 | Introduce a feinting channeler enemy | A distinct harmless feint can precede one real shot; color-independent body cues distinguish them before the commitment deadline. | F101 | L | P3 |
| F110 | Introduce a ward-support enemy | A support ward protects one visible ally link at a time; breaking the link or displacing the support exposes that ally. | F101 | L | P2 |
| F111 | Introduce a crescent-thrower enemy | A visible curved projectile travels out and returns once along a shown arc; defeating its thrower cancels the return and every route has a reachable safe lane. | F101 | L | P2 |
| F112 | Introduce a burrowing stone-sprite enemy | A new small Shadow construct marks its emergence mound for 0.8 seconds, stays underground at most two seconds and cannot emerge beneath an unavoidable hit. | F101 | L | P3 |
| F113 | Introduce a formation-captain enemy | The captain orders one visible formation change at a time; interrupting the order leaves followers using their ordinary AI. | F101 | L | P2 |
| F114 | Introduce a stationary channeling conduit | A destructible conduit emits a rotating warning lane and deactivates immediately when broken, including any pending projectile. | F101 | L | P2 |
| F115 | Introduce a counterstance Asha'man enemy | Its marked counterstance punishes one repeated approach but expires on a timer and can be baited without unavoidable damage. | F101 | L | P3 |
| F116 | Define a shared cue vocabulary for new enemy roles | All new ranged, support and armored enemies use distinct silhouette symbols shown in their optional practice previews. | F102, F103, F104 | M | P1 |
| F117 | Add directional guard resolution for remix | Front, flank and rear attacks resolve according to a documented angle rule and remain invariant under camera motion. | F103 | M | P1 |
| F118 | Add a visible guard-break resource | Shielded remix enemies lose a finite guard reserve from designated moves and show the exact break/recovery state without adding base HP. | F103, F117 | M | P2 |
| F119 | Add a timed projectile-deflection kick | A new optional technique reflects eligible small projectiles only during a narrow active window; boss beams and hazards remain ineligible. | F101 | L | P3 |
| F120 | Add a breakable reinforcement banner | Destroying a marked banner cancels only its unspawned reinforcement and never deletes enemies already active in the arena. | F105 | M | P2 |
| F121 | Add a short shoulder-shove technique | A separate remappable move displaces a nearby ordinary enemy with low damage and cannot push a boss outside the arena. | F101 | L | P3 |
| F122 | Add a committed evasive sidestep | An opt-in move shifts one lane with a cooldown and recovery cost; it cannot be chained into permanent invulnerability. | F101 | L | P3 |
| F123 | Add a descending heel-kick option | A distinct airborne input trades forward reach for downward impact and respects existing juggle and landing limits. | F101 | L | P3 |
| F124 | Add a charged-fireball option | Holding the optional charge action has a visible cap and interrupt cost; quick taps retain a documented weaker shot rather than firing twice. | F101 | L | P3 |
| F125 | Add a limited recovery-cancel technique | One specified kick may cancel into lane movement by spending meter; the cancel cannot reset attack cooldown or duplicate hit damage. | F101 | L | P3 |
| F126 | Add a harmless enemy-lure call | A short Riley call draws eligible idle enemies toward his last position with a cooldown and never forces bosses or hazards to retarget. | F101 | M | P3 |
| F127 | Let remix players choose Loial's entry side | A clear two-choice preview sets the charge direction before use; cancellation spends nothing and the once-per-stage limit remains. | F101 | M | P2 |
| F128 | Add a selectable angreal burst pattern | Remix offers the existing spread or a short piercing shot, labels the tradeoff and allows only one active pattern per pickup. | F101 | L | P3 |
| F129 | Add a single-hit ward pickup | A rare clearly shaped token blocks one eligible ordinary hit, expires at stage end and never suppresses taint or the finale rules. | F101 | L | P3 |
| F130 | Add destructible waist-high cover | Cover blocks eligible projectiles until broken, has no invisible remaining collision and cannot trap Riley in a lane. | F101 | L | P2 |
| F131 | Add kickable rolling barrels | A barrel follows one predictable lane, hits each target at most once and stops safely at arena boundaries. | F101 | L | P2 |
| F132 | Add a one-use hanging bell interaction | A marked bell produces a brief nearby stagger when struck, cannot repeat after activation and never interrupts a cinematic. | F101 | M | P3 |
| F133 | Add a telegraphed slick-floor patch | A bounded optional patch changes deceleration only after a visible warning; leaving it restores normal traction immediately. | F101 | L | P3 |
| F134 | Add a marked falling-rubble hazard | A remix ceiling marker gives a visible countdown before a small stone falls; a safe adjacent lane stays reachable and debris never leaves hidden collision. | F101 | L | P3 |
| F135 | Add a dust-burst crate distraction | Breaking a special crate briefly reduces eligible enemy targeting range while preserving all player-visible attack warnings. | F101 | M | P3 |
| F136 | Add a non-damaging lane-gate puzzle | Between remix fights, two clearly marked floor switches open a gate without timers, consumables or a softlock on retry. | F101 | L | P3 |
| F137 | Add a split-entry formation encounter | A curated wave introduces both sides in staggered groups with a documented safe opening and a bounded concurrent attacker count. | F101, F111 | M | P2 |
| F138 | Add a ranged-screen formation encounter | Melee guards protect a slinger while at least one visible route reaches the ranged threat without taking a mandatory hit. | F102, F106 | M | P2 |
| F139 | Add an interrupt-the-rally encounter | A drummer and supporters demonstrate the benefit of target priority, and clearing either target order always permits progression. | F104 | M | P2 |
| F140 | Add an escort-the-banner encounter | Riley moves a friendly signal marker across one remix arena while enemy hits delay rather than permanently fail the objective. | F101 | L | P3 |
| F141 | Add a Chieftain branching-charge variant | In remix only, a marked fork predicts one of two charge endpoints and both endpoints leave a reachable counterattack window. | F101 | L | P2 |
| F142 | Add a Fade shadow-decoy variant | One non-damaging decoy is visually distinguishable by motion and silhouette, and only the real Fade can deal or receive damage. | F101 | L | P3 |
| F143 | Add a Draghkar perch-and-dive variant | A visible perch phase creates an anti-air opportunity before a warned dive; the boss remains reachable without rare pickups. | F101 | L | P2 |
| F144 | Add a Be'lal alternating-ward variant | Two visibly different ward phases require alternating safe approaches; neither phase makes all ordinary attacks ineffective indefinitely. | F101 | L | P3 |
| F145 | Add a Taim cross-lane volley variant | A remix volley marks successive lanes and always leaves a reachable gap; the original joint-finish requirement remains intact. | F101 | L | P2 |
| F146 | Budget support effects separately in the director | Only one rally, one ward and one reinforcement order may be active together; queued support cannot starve ordinary enemy turns. | F104, F110, F113 | M | P1 |
| F147 | Prevent new attack patterns from eliminating every escape | A geometry check on curated remix patterns finds a reachable safe corridor before each damage onset using standard Riley speed. | F101 | L | P1 |
| F148 | Add an optional remix objective selector | Players choose survive, interrupt or break-cover objectives with rewards limited to local records and no campaign stat upgrades. | F101 | M | P3 |
| F149 | Keep remix tuning in independent configuration | Changing remix damage, waves or new moves leaves serialized standard five-stage tuning hashes and stage-specific pressure coefficients unchanged. | F101 | M | P1 |
| F150 | Deliver a bounded remix balance report | Forty fixed-seed runs per mode report each existing stage separately, new-role exposure and unavoidable-damage failures; no results replace standard gates. | F149 | M | P1 |

### P04 — Family story and chapter replay (F151–F200)

Deepen the existing rescue story through optional short scenes, readable context and spoiler-aware replay rather than extending the main rescue plot.

| ID | Improvement | Testable acceptance criterion | Dependencies | Effort | Priority |
|---|---|---|---|---|---|
| F151 | Add one optional Emond's Field cutscene | One new skippable 20–35 second scene shows Riley protecting neighbors and a blue dance ribbon clue; skipping preserves all checkpoint rewards. | none | L | P2 |
| F152 | Add one optional Caemlyn cutscene | One new skippable 20–35 second scene uses a street map and Loial's clue to clarify the chase without requiring franchise knowledge. | none | L | P2 |
| F153 | Add one optional Shadar Logoth cutscene | One new skippable 20–35 second scene lets Moiraine explain the fog's safe-lane rule through calm action, with no horror close-ups. | none | L | P2 |
| F154 | Add one optional Stone of Tear cutscene | One new skippable 20–35 second scene shows TT practicing a brave dance-count rhythm before her existing lightning reveal without changing its payoff. | none | L | P2 |
| F155 | Add one optional Black Tower cutscene | One new skippable 20–35 second scene shows the siblings agreeing on a signal before Taim; the existing live joint finish remains playable. | none | L | P2 |
| F156 | Create a spoiler-aware chapter map | Five named locations unlock in order, explain the current objective in one sentence and hide future story details. | none | M | P1 |
| F157 | Offer a completed-chapter replay selector | Only cleared chapters are selectable, replays use a separate run slot and the original Continue checkpoint is untouched. | F156 | L | P2 |
| F158 | Build an unlocked-story gallery | Players can replay only already-seen reels from a named list and return to the same gallery selection afterward. | none | M | P2 |
| F159 | Remember separately which story scenes were viewed | Skipping, watching and gallery replay record distinct local states without pretending a skipped scene was fully watched. | F158 | M | P2 |
| F160 | Add a concise returning-player recap | Continue can show a skippable two-sentence summary based on the saved stage, Callandor and TT state without revealing the next event. | none | M | P1 |
| F161 | Create a plain-language character notebook | Riley, TT, Moiraine, Loial and each encountered antagonist receive a short role description gated by first appearance. | none | M | P2 |
| F162 | Create a place notebook with earned entries | Each reached location gets one illustrated description and its current relevance; unopened locations remain unnamed placeholders. | F156 | M | P3 |
| F163 | Explain setting terms in context | Selecting saidin, angreal, Asha'man or Callandor in help opens a short explanation and returns to the exact prior reading position. | none | M | P1 |
| F164 | Add a current-objective strip between fights | A one-line inter-wave objective reflects the next arena and disappears before combat cues need the space. | none | S | P2 |
| F165 | Show explicit reasons for chapter locks | A locked chapter says which prior stage to clear, never suggests payment and cannot consume a selection input intended for Back. | F156 | S | P2 |
| F166 | Add a spoiler-safe post-stage summary | After each clear, a short card states the achieved goal and next destination while respecting the actual TT and Callandor timeline. | none | M | P2 |
| F167 | Give Loial optional between-wave observations | One short non-blocking remark per existing stage adds warmth; it never interrupts an essential warning or delays the next fight. | none | M | P3 |
| F168 | Give Moiraine a post-retry encouragement pool | Three brief encouraging text lines rotate without blaming the player and appear only on deliberate retry, not every lost life. | none | S | P2 |
| F169 | Show TT's dancer identity through an optional keepsake trail | Five cosmetic blue-ribbon markers, one per existing stage, unlock a single notebook fact each without stats, random drops or required detours. | F161 | L | P3 |
| F170 | Add an Emond's Field rescue vignette in scenery | A background family safely reaches shelter after a cleared wave; the silent event cannot be attacked or mistaken for an enemy. | none | M | P2 |
| F171 | Add Caemlyn signpost storytelling | Three painted signs point to gates, streets and palace consistently with camera progression and remain optional to read. | none | M | P2 |
| F172 | Add Shadar Logoth's abandoned-camp clue | A quiet safe-area prop group explains why Riley changes lanes without introducing a second new cinematic. | none | M | P3 |
| F173 | Add Tear's sword-and-dragon motif trail | Architectural motifs foreshadow Callandor, remain historically consistent within the stage and do not look like collectible pickups. | none | M | P3 |
| F174 | Add Black Tower loyalist signals | Subtle blue cloth signals show a safe route through the grounds and yard without falsely marking hazard lanes as safe. | none | M | P2 |
| F175 | Give every encounter zone a specific purpose line | Each of the thirty original zones gets a short optional label explaining what Riley is accomplishing there, with no reused filler label. | F164 | M | P3 |
| F176 | Add a nonjudgmental stage-completion card | The card celebrates finishing and names one skill used, without letter grades, negative labels or comparisons to other players. | none | M | P2 |
| F177 | Offer a personal best-details page | Players can inspect their own stage time and resource use with mode and assistance labels; no online comparison or identity is created. | F176 | M | P3 |
| F178 | Let players hide scores during the story campaign | A setting removes score display and results totals while leaving progression, lives and underlying balance unchanged. | none | S | P2 |
| F179 | Add a story-only viewing route after completion | Completing the campaign unlocks a sequence of seen reels with no combat and no new story scene assets. | F158 | M | P3 |
| F180 | Include a gentle end-of-session stopping point | At a stage clear, an optional Save and Rest action returns to title with a precise next-stage resume message. | none | M | P2 |
| F181 | Add a family-readable controls reference sheet | An offline help page explains one action per line, distinguishes scarce powers and prints legibly on one page. | none | M | P2 |
| F182 | Offer age-appropriate story intensity notes | An optional pre-play page briefly identifies fantasy fights, fog and capture themes without making medical or age-rating claims. | none | S | P2 |
| F183 | Explain non-gory enemy defeat conventions | A short art-and-story guide specifies retreat, dazed or dissipating outcomes and is applied to every proposed new enemy concept. | none | S | P1 |
| F184 | Add a local credits gallery | Credits identify existing contributor roles, asset origins and licenses from an offline file without linking to a child's identity. | none | M | P1 |
| F185 | Create a chapter-by-chapter story continuity sheet | Every existing and proposed beat lists Riley's goal, TT's location and Callandor ownership; contradictory states are flagged before scripting. | F151, F152, F153, F154, F155 | M | P1 |
| F186 | Add a spoiler boundary to help and galleries | Before the Tear reveal, help, thumbnails and descriptions cannot reveal TT's lightning or Callandor upgrade details. | F158, F161 | M | P1 |
| F187 | Let a player mark a seen reel as a favorite | Favorites store only reel IDs locally, sort predictably and can be removed without altering seen-state or campaign progress. | F158 | S | P3 |
| F188 | Export a personal completion keepsake | After the ending, players can preview and locally download a reunion postcard with chosen earned chapter emblems and mode label, with no upload or extra cinematic. | F176 | L | P3 |
| F189 | Offer ending credits at the player's pace | After the existing finale, credits can scroll automatically or page manually, with an always-visible return to title. | F184 | M | P2 |
| F190 | Add inspectable non-interactive scene hotspots | In the story gallery only, up to three labeled details per existing painting explain composition or setting without changing the reel. | F158 | M | P3 |
| F191 | Add a clear New Run checkpoint warning | Starting a fresh campaign names the existing saved stage and offers Continue or Replace before overwriting the only active run. | none | S | P1 |
| F192 | Add a post-clear return route to the chapter map | After a replayed stage, Return to Chapters restores the map scroll/focus position and does not auto-launch the next story stage. | F157 | M | P2 |
| F193 | Provide a bookmark for a story-only viewing session | The story route resumes at its last finished caption independently of the gameplay save and can be reset alone. | F179 | M | P3 |
| F194 | Add choice-free humor to friendly prop descriptions | Ten optional prop descriptions use kind situational humor, contain no insults about ability and reveal no private family facts. | F190 | M | P3 |
| F195 | Make progression rewards explicit at acquisition | Story cards state that Callandor strengthens the super and that chapter access is unlocked, with each reward acknowledged once. | none | M | P1 |
| F196 | Offer an optional recap before a boss rematch | A two-line text recap names the boss's role and Riley's current goal without replaying an entire chapter intro. | F157 | S | P2 |
| F197 | Explain the relationship between TT and Kenzie once | The first notebook entry clearly says Kenzie is Riley's sister and is called Twinkle Toes; later labels remain consistent. | F161 | S | P1 |
| F198 | Add a local collectible checklist with no streaks | The five optional ribbons appear as location silhouettes, never expire and have no daily timer or random rarity. | F169 | M | P3 |
| F199 | Create a post-campaign free-reading mode | A read-only notebook view removes unlock masks after campaign completion, keeps action buttons hidden and works entirely offline. | F161, F162, F163 | M | P3 |
| F200 | Make added story content individually skippable in settings | Each of the five optional new scenes can be disabled without suppressing original story beats, rewards or the finale. | F151, F152, F153, F154, F155 | M | P1 |

### P05 — Painted presentation assets (F201–F250)

Add authored painted objects, effects and selective character animation after gameplay needs are clear; keep approved source paintings intact.

| ID | Improvement | Testable acceptance criterion | Dependencies | Effort | Priority |
|---|---|---|---|---|---|
| F201 | Painted HUD frame kit | Deliver alpha-painted corner, edge, and panel assets that fit the existing HUD rectangles; gameplay screenshots show every current label and value unobscured. | none | M | P2 |
| F202 | Painted Moiraine healing token | Replace the procedural token artwork with a six-frame blue-white painted token animation; its existing collection radius, lifetime, and healing amount remain identical. | none | M | P1 |
| F203 | Painted saidin shard pickup | Deliver a six-frame faceted shard animation that reads distinctly from healing and angreal pickups at their existing gameplay sizes; collection behavior is unchanged. | none | M | P1 |
| F204 | Painted angreal pickup | Deliver a recognizable miniature angreal with a six-frame turn; the silhouette remains identifiable at the current pickup size without increasing its collection radius. | none | M | P1 |
| F205 | Loial call medallion artwork | Add painted ready and spent Loial medallions beside the existing status text; each uses a different physical design and follows the current availability state. | none | S | P2 |
| F206 | Callandor ownership emblem | Show a small painted crystal-sword emblem after the existing acquisition event; screenshots before acquisition, after acquisition, and after Continue show the correct state. | F201 | S | P2 |
| F207 | Painted saidin reservoir | Add a painted reservoir border and transparent interior texture around the existing meter; empty, half-full, and full captures retain the exact current fill widths. | F201 | M | P2 |
| F208 | Boss health-bar crests | Deliver five boss-specific painted crests for the existing health-bar panel; each appears only for its corresponding boss without changing bar length or displayed health. | F201 | M | P2 |
| F209 | Painted wave-progress beads | Add six painted beads beside the existing wave counter; exactly the completed beads change artwork, and the numeric wave label remains present. | F201 | S | P2 |
| F210 | Speaker portrait frame set | Provide painted frame treatments for heroes, allies, and villains around existing portrait images; no portrait pixels or existing dialogue layout dimensions are changed. | none | M | P2 |
| F211 | Painted fireball animation | Deliver an eight-frame flame-core and tail sheet for ordinary fireballs; its visible leading edge stays within the existing projectile's collision extent in both directions. | none | M | P1 |
| F212 | Angreal fireball crown artwork | Give empowered projectiles a separate painted flame crown with three identifiable lobes; ordinary and empowered fireballs remain distinguishable in side-by-side gameplay captures. | F211 | M | P2 |
| F213 | Painted fire-impact flare | Add a six-frame painted flame bloom for projectile contact, separate from melee sparks; it starts at the existing collision point and ends within 300 milliseconds. | F211 | M | P2 |
| F214 | Painted balefire beam layers | Deliver beam core, edge, and terminal-cap artwork for the current super; the beam's origin, collision span, and active duration remain unchanged. | none | L | P1 |
| F215 | Empowered balefire filigree | Add a separate painted internal filament pattern used only after Callandor acquisition; comparison captures distinguish the upgrade without expanding the beam's gameplay footprint. | F214 | M | P2 |
| F216 | Painted lightning branch atlas | Provide at least eight irregular lightning-branch silhouettes for existing lightning effects; repeated strikes visibly vary while retaining their current endpoints and timing. | none | M | P2 |
| F217 | Painted Twinkle Toes lightning ribbons | Create a blue ribbon-like lightning treatment used only by Twinkle Toes during her existing casting events; no additional story beat or attack is introduced. | F216 | M | P2 |
| F218 | Callandor crystal aura layer | Add an independently painted crystal-edge aura around the existing sword rendering; frame comparisons confirm the approved sword grip and Riley source images remain untouched. | none | M | P2 |
| F219 | Painted healing bloom | Deliver a painted blue-white petal bloom for the current heal-collection event; the bloom leaves Riley's face and the current health readout unobscured throughout its lifetime. | F202 | M | P2 |
| F220 | Angreal activation orbit | Play one short painted orbital flourish when the existing angreal timer activates or refreshes; it does not imply additional pickups, damage, or remaining duration. | F204 | M | P2 |
| F221 | Painted Mashadar surface sheets | Add layered painted fog lobes inside the current hazard presentation; inactive and active hazard boundaries remain at their existing positions and warning times. | none | L | P2 |
| F222 | Painted landing dust atlas | Deliver snow, street-dust, and stone-dust landing sprites selected by the existing stage; each begins at foot contact and clears within 400 milliseconds. | none | M | P2 |
| F223 | Painted throw-motion arcs | Add a restrained painted arc behind an already-thrown enemy; it follows the existing trajectory without changing velocity, collision, or the visible landing point. | none | M | P3 |
| F224 | Loial charge wake artwork | Deliver a painted ground wake for Loial's existing charge; it stays behind his feet and never obscures an enemy attack or extends the apparent damage area. | none | M | P2 |
| F225 | Painted hostile projectile family | Create distinct painted projectile silhouettes for the existing hostile projectile types; each remains centered on its current hurtful area with unchanged trajectories and speeds. | none | L | P1 |
| F226 | Hostile projectile dissolution art | Play a brief painted disintegration on existing projectile expiration or cancellation events; collision-triggered removal and harmless expiration use different terminal shapes. | F225 | M | P2 |
| F227 | Painted snowflake atlas | Replace uniform snow dots with at least six painted flake silhouettes within the existing snow system; particle count, movement, and combat-layer placement remain unchanged. | none | S | P3 |
| F228 | Painted ambient flame loops | Deliver small looping flame sheets for selected existing environmental fire sources; placement matches those sources and introduces no additional full-screen light flashes. | none | M | P3 |
| F229 | Emond's Field chimney wisps | Add two painted smoke-loop variants above selected background chimneys; wisps stay outside the combat floor and do not require editing the approved panorama files. | none | M | P3 |
| F230 | Caemlyn pennant animation | Add painted fluttering pennants attached to existing background architecture; all pennants remain above the playable lane and match their anchors during camera movement. | none | M | P3 |
| F231 | Shadar Logoth ironwork accents | Deliver three ruined gate or railing overlays placed behind combatants; they add location-specific detail without altering existing panorama assets or covering lane warnings. | none | M | P3 |
| F232 | Stone of Tear tapestry accents | Create two painted hanging tapestries for background wall placements; they preserve the existing camera composition, floor visibility, and approved stage-brightness requirements. | none | M | P3 |
| F233 | Black Tower architectural ornaments | Add painted lintel and iron-bracket overlays to selected interior background anchors; every overlay remains behind actors and leaves the source panorama files unchanged. | none | M | P3 |
| F234 | Roof wind-torn cloth loops | Add two painted cloth-loop variants to existing rooftop edge anchors; motion remains decorative and does not cover Taim, Riley, or the playable roof surface. | none | M | P3 |
| F235 | Caemlyn drifting leaf artwork | Introduce a sparse decorative leaf layer using at least four painted silhouettes; leaves have no collision and remain distinguishable from all collectible shapes. | none | S | P3 |
| F236 | Painted background prop collection | Deliver six decorative baskets, crates, and barrels for background-only placement; none enters the interaction list or changes the current direct-pickup reward routing. | none | M | P3 |
| F237 | Painted menu plaque kit | Add reusable painted plaques behind current menu rows; existing row positions, labels, selection states, and pointer hit regions remain identical. | none | M | P2 |
| F238 | Painted menu selection marker | Deliver a small painted selection emblem that follows the currently selected row; its anchor never overlaps the row text in title, pause, or options menus. | F237 | S | P2 |
| F239 | Pause-panel corner paintings | Add four small object-only painted corner ornaments to the pause panel; no new character pose is required and every current control remains fully visible. | F237 | S | P3 |
| F240 | Stage-banner emblem collection | Deliver five place-specific painted emblems beside the existing stage-name banners; the correct emblem is shown for all five stages without adding a transition scene. | none | M | P2 |
| F241 | Family-credits ribbon frame | Add a painted blue-ribbon frame to the future credits gallery introduced by F184; every gallery credit and control remains readable, and the homecoming painting remains unchanged. | F184 | M | P3 |
| F242 | Game-over equipment still | Provide one object-only painting of Riley's familiar gear for the existing game-over screen; it contains no injury imagery and does not add a cutscene or countdown delay. | none | M | P2 |
| F243 | Common-enemy painted busts | Deliver dedicated busts for the current non-boss enemy families and use them in their existing encounter cards; no new encounter, dialogue, or card timing is added. | none | L | P2 |
| F244 | Loial painted charge cycle | Deliver at least eight painted charge frames for Loial's existing assist; frame registration keeps the original foot anchor, movement speed, and axe-contact timing. | none | L | P2 |
| F245 | Twinkle Toes casting follow-through | Deliver painted anticipation, release, and recovery frames for her existing lightning moments, using her approved eight-year-old reference and existing event durations. | none | L | P2 |
| F246 | Fade cloak animation layers | Add painted cloak-fold overlays for the Fade's existing idle and movement states; the head, weapon silhouette, collision geometry, and attack timings remain unchanged. | none | L | P3 |
| F247 | Draghkar painted wing cycle | Provide at least six distinct wing drawings for the existing flight animation; the body anchor and existing flight path remain identical throughout the cycle. | none | L | P2 |
| F248 | Trolloc weapon cutout set | Deliver separate painted axe and spear cutouts matched to the current Trolloc variants; weapon placement follows the existing rig without changing reach or active attack frames. | none | M | P2 |
| F249 | Common-enemy hurt-pose paintings | Add one non-gory painted recoil pose per current common-enemy family; each is displayed only during the existing hurt state with unchanged stun duration. | none | L | P2 |
| F250 | Taim casting follow-through layers | Deliver painted sleeve and hand overlays for Taim's existing casting recovery; the overlays add movement without altering his source body, warning, projectile, or recovery timing. | none | L | P3 |

### P06 — Sound character and mix choice (F251–F300)

Add original or suitably licensed offline sound detail and per-category control; preserve the existing theme and make all alternate music optional.

| ID | Improvement | Testable acceptance criterion | Dependencies | Effort | Priority |
|---|---|---|---|---|---|
| F251 | Continuous music level control | Allow music volume from 0 to 100 percent with a displayed numeric value; changing it leaves dialogue, effects, and ambience levels unchanged. | none | M | P2 |
| F252 | Independent effects level control | Add an effects-only 0-to-100-percent level; a controlled playback sequence confirms that only combat and interface effects change gain. | none | M | P1 |
| F253 | Independent dialogue level control | Add a dialogue-only 0-to-100-percent level; adjusting it changes recorded speech gain without modifying the approved voice files or other audio categories. | none | M | P1 |
| F254 | Independent ambience level control | Add an ambience-only 0-to-100-percent level; setting it to zero silences environmental beds while music, speech, and combat effects retain their selected levels. | none | M | P2 |
| F255 | Optional night dynamic-range mix | Provide an opt-in mix whose measured 95th-to-20th-percentile level spread is at least 4 dB narrower on the same representative sequence, without clipped output samples. | F252, F253, F254 | L | P2 |
| F256 | Emond's Field winter ambience | Deliver a looping bed of restrained winter wind and distant timber creaks, with at least 30 seconds before exact repetition and no spoken words or attack-like transients. | F254 | M | P2 |
| F257 | Caemlyn street ambience | Deliver a looping city bed combining distant cart texture and indistinct activity, without intelligible speech; a 60-second audition contains no abrupt loop boundary. | F254 | M | P2 |
| F258 | Shadar Logoth ruin ambience | Deliver a restrained wind-and-stone resonance bed with no screams, whispers, or jump-scare peaks; a listener approves its adventurous rather than frightening tone. | F254 | M | P2 |
| F259 | Stone of Tear hall ambience | Deliver a spacious stone-hall bed with subtle air movement and distant water texture; the bed contains no discrete event that can be mistaken for an enemy attack. | F254 | M | P2 |
| F260 | Black Tower ambience zones | Deliver related interior and rooftop beds; the existing roof transition crossfades between them over one second without restarting or replacing the main theme. | F254 | M | P2 |
| F261 | Surface-specific footstep banks | Provide at least four footfall variants each for snow, street stone, dusty ruins, polished stone, and rooftop stone, selected at actual existing foot-plant moments. | none | L | P2 |
| F262 | Riley coat movement foley | Add at least four dry cloth movements tied to Riley's existing turns and grounded attacks; no vocal sound or change to animation timing is introduced. | none | M | P3 |
| F263 | Loial charge footfall sequence | Add a heavy but non-threatening gait texture synchronized to Loial's existing charge; playback begins and ends with the assist and never creates a second horn or spoken call. | F261 | M | P2 |
| F264 | Enemy equipment movement foley | Provide distinct low-level leather, chain, and cloth movement sets for current enemy families; cues occur only on existing movements and contain no additional warning information. | none | L | P3 |
| F265 | Airborne attack cloth swishes | Layer dry cloth swishes onto existing jump attacks with at least three variants; a missed airborne attack produces no contact sound. | none | M | P2 |
| F266 | Surface-specific landing sounds | Provide landing variations for the five existing floor materials; each starts within one rendered frame of the current landing event and remains distinct from a damaging hit. | F261 | M | P2 |
| F267 | Kid-friendly knockdown contacts | Deliver padded body-to-ground sounds for existing knockdowns, with no bone-crack or distress content; ordinary landings and knockdowns use different recordings or synthesis recipes. | F266 | M | P2 |
| F268 | Weapon pass-by foley bank | Add separate axe, spear, and claw air-movement textures to existing swings; each bank contains at least three variations and plays independently of whether contact occurs. | none | M | P2 |
| F269 | Unarmored contact sound bank | Add at least six restrained cloth-and-pad contact variations for actual hits on unarmored targets; no sound implies blood, fracture, or a larger damage value. | none | M | P2 |
| F270 | Armored contact sound bank | Add at least six short metal-and-padding contact variations for existing armored targets; matched-level auditions distinguish them from unarmored contacts. | F269 | M | P2 |
| F271 | Taim shield contact signature | Give an existing shielded hit a resonant contact and the existing shield-break event a separate release sound; neither cue changes shield rules or phase timing. | none | M | P1 |
| F272 | Fireball ignition foley layer | Add a brief original flame-ignition texture beneath the current fireball launch cue; it starts once per launch and does not change the approved spoken fire line. | none | M | P2 |
| F273 | Fireball flight hiss | Add a quiet continuous hiss while a friendly fireball remains visible; the sound follows its screen position and ends when that projectile is removed. | F272 | M | P2 |
| F274 | Missed fireball extinguish tail | Play a short fading flame texture when a fireball expires without contact; a hit and a harmless expiration produce audibly different endings. | F273 | S | P2 |
| F275 | Angreal spread sound signature | Give the current three-fireball launch a coordinated three-part texture; it is distinguishable from a normal launch without tripling the perceived loudness. | F272 | M | P2 |
| F276 | Healing pickup instrumental motif | Replace the shared pickup effect for healing with a short blue-white-themed instrumental chime; Moiraine's existing speech and the amount healed remain unchanged. | none | S | P2 |
| F277 | Saidin pickup instrumental motif | Give saidin pickups their own rising two-note sound; matched-level review distinguishes it from healing and angreal collection without relying on speech. | F276 | S | P2 |
| F278 | Angreal pickup instrumental motif | Give angreal collection a short three-part resonant motif distinct from the other pickup types; refresh pickups retain the existing timer behavior. | F276, F277 | S | P2 |
| F279 | Full-saidin completion chord | Play one restrained completion chord on the existing transition from below-full to full meter; remaining full does not retrigger it. | F277 | S | P2 |
| F280 | Taint tension texture | Add a quiet non-vocal texture whose intensity follows the existing taint amount after its grace period; spending the meter removes the texture immediately. | none | M | P2 |
| F281 | Angreal expiration sound | Play one short descending counterpart to the pickup motif when the existing angreal timer expires; refreshing the timer does not falsely play expiration. | F278 | S | P2 |
| F282 | Loial axe-rush texture | Add a broad wooden-and-metal air texture to Loial's current axe sweep; it is synchronized with the existing sweep and introduces no extra voice or assist activation. | none | M | P2 |
| F283 | Callandor acquisition resonance | Add one original crystalline instrumental resonance at the existing acquisition event; it plays once for that event without extending the scene or changing spoken lines. | none | M | P2 |
| F284 | Callandor beam overtone | Add an extra crystalline layer only to supers after Callandor acquisition; normal and upgraded supers are distinguishable in a matched-level audio comparison. | none | M | P2 |
| F285 | Sustained balefire body sound | Add a loopable beam-body texture between the existing super's onset and end; it follows the actual beam duration instead of ending with the launch transient. | none | L | P1 |
| F286 | Balefire release tail | Add a separate beam-release texture after the existing active beam ends; it lasts at most 600 milliseconds and never implies another damaging pulse. | F285 | M | P2 |
| F287 | Twinkle Toes lightning sound motif | Create a bright, original lightning-crackle motif used only during her existing casts; it remains distinct from Riley's super and contains no new speech. | none | M | P2 |
| F288 | Mashadar movement texture | Add a non-vocal sliding-air texture during existing active fog movement; it stops with the hazard and contains no frightening voices or new warning timing. | none | M | P2 |
| F289 | Location-specific effects acoustics | Provide short outdoor, ruined-space, and stone-hall acoustic treatments for selected effects; dry speech remains unchanged and matched event captures show the expected stage treatment. | none | L | P3 |
| F290 | Screen-position effects panning | Pan eligible combat effects according to their visible horizontal position with a bounded stereo range; centered UI sounds, dialogue, and the main theme retain their current placement. | none | M | P2 |
| F291 | Menu back-action earcon | Give successful Back actions a short descending non-vocal cue distinct from confirmation; exactly one cue plays for each completed back navigation. | none | S | P2 |
| F292 | Painted-menu companion sound kit | Deliver coordinated paper, wood, and light-metal sounds for existing selection movement and confirmation; movement and confirmation remain audibly different at equal playback level. | none | M | P3 |
| F293 | Pause and resume earcon pair | Add complementary short tones for successful pause and resume state changes; holding a control or opening another pause-panel page does not repeat either cue. | none | S | P2 |
| F294 | Continue countdown sound pattern | Add restrained ticks to the existing final three countdown seconds; no tick plays after Continue is selected, the screen changes, or audio is muted. | none | S | P2 |
| F295 | Location-specific clear stingers | Compose five short instrumental endings for existing stage clears, each using different instrumentation; none replaces the main theme, changes dialogue, or lengthens the clear sequence. | none | L | P3 |
| F296 | Boss arrival musical signatures | Compose five brief non-vocal motifs for existing boss arrivals; each fits within its current entrance window and leaves the boss's spoken introduction unchanged. | none | L | P3 |
| F297 | Optional theme percussion layer | Provide an opt-in locally authored percussion accompaniment aligned to the verified theme tempo and loop; turning it off leaves the current Suno playback byte-for-byte unchanged. | F251 | L | P3 |
| F298 | Optional instrumental title variation | Deliver an optional locally produced title-menu arrangement with an explicit selector; the existing Suno theme remains the default and resumes under its existing gameplay routing. | F251 | L | P3 |
| F299 | Optional finale musical coda | Compose an original short instrumental coda for the existing ending screen; it is opt-in, adds no dialogue or scene, and never delays the return-to-title control. | F251 | L | P3 |
| F300 | Non-repeating effects variation | For sound banks containing three or more alternatives, select variants so the same variant cannot occur twice consecutively; a 100-event trace confirms the rule for every enabled bank. | F261, F268, F269, F270 | M | P2 |

### P07 — Broader device and control support (F301–F350)

Extend beyond standard-controller and basic-touch support with explicit local profiles, calibration, hybrid input and browser-aware controls.

| ID | Improvement | Testable acceptance criterion | Dependencies | Effort | Priority |
|---|---|---|---|---|---|
| F301 | Explicit active-controller chooser | With two connected controllers, selecting either routes gameplay exclusively from that controller; the other cannot move Riley or spend powers. | none | M | P1 |
| F302 | Explicit local controller-profile association | A player explicitly associates profiles using only coarse controller model and reported button/axis capabilities; profiles persist locally, and serial numbers, unique device IDs, fingerprints and device metadata exports or transmissions are excluded. | F301 | M | P2 |
| F303 | Named controller profile slots | A player can create, rename and switch among three local mapping profiles for one controller without changing another profile. | F302 | M | P2 |
| F304 | Live controller calibration panel | A paused calibration panel displays every browser-reported axis and button value while suppressing all gameplay actions. | F301 | M | P1 |
| F305 | Stick-center calibration | A measured resting offset of 0.12 produces zero movement after calibration, while full deflection remains reachable. | F304 | M | P1 |
| F306 | Per-controller radial deadzones | Each controller profile can select a radial deadzone from 0.05 through 0.40, with continuous normalized movement outside the selected boundary. | F302, F304 | M | P1 |
| F307 | Stick outer-range calibration | A controller reaching only 0.82 at its physical edge can be calibrated to produce full movement without increasing maximum character speed. | F304 | M | P2 |
| F308 | Square-gate stick correction | An optional profile correction keeps diagonal movement magnitude at or below one for a square-gate controller while preserving cardinal full travel. | F304, F307 | M | P2 |
| F309 | Independent controller-axis inversion | Either movement axis can be inverted independently, persists per controller profile, and leaves button mappings unchanged. | F302 | S | P2 |
| F310 | Movement-stick selector | Selecting the right stick makes it the movement source while left-stick movement is ignored; switching back restores the previous calibration. | F302, F304 | M | P2 |
| F311 | Custom movement-axis pairing | A nonstandard controller can assign any two distinct reported axes to movement and preview both directions before saving. | F304 | M | P2 |
| F312 | Axis-based directional-pad support | A controller exposing its directional pad as a hat axis can map all four directions and diagonals without treating its neutral value as movement. | F304, F311 | L | P2 |
| F313 | Analog-axis trigger bindings | A trigger reported as an axis can bind one action using either a zero-to-one or negative-one-to-one travel range. | F304 | M | P2 |
| F314 | Trigger activation hysteresis | A trigger fluctuating around its activation threshold produces one press until it falls below a separately configured release threshold. | F313 | M | P1 |
| F315 | Pressure-button threshold calibration | An analog button with a weak pressed flag can use a calibrated value threshold, and pressure noise below that threshold never fires its action. | F304 | M | P2 |
| F316 | Extended controller-button support | Every button reported by a controller can appear in remapping, including indices above 19, while reserved navigation controls remain protected. | F304 | M | P2 |
| F317 | Editable secondary controller bindings | A player can add or remove a second button for an action without replacing its primary button; either button independently activates the same action. | F302 | M | P2 |
| F318 | Transactional controller remapping | Mapping edits run in a preview copy until Apply; Cancel restores every prior binding and reload never exposes an unfinished edit. | F303 | M | P1 |
| F319 | Section-specific controller reset | Resetting calibration preserves bindings, and resetting bindings preserves calibration and other saved controller profiles, including after a browser reload. | F302, F318 | S | P2 |
| F320 | Neutral arming after profile changes | Switching profiles while a stick or trigger is held produces no newly mapped action until the affected control returns to neutral. | F318 | M | P1 |
| F321 | Cardinal controller-menu arbitration | A diagonal stick deflection selects one menu direction using a stable dominant-axis rule rather than moving through two rows or columns. | F306 | S | P2 |
| F322 | Held-direction menu traversal | Holding a directional pad moves once immediately, then repeats after a documented delay; releasing stops repetition before the next update. | F321 | M | P2 |
| F323 | Capability-aware haptic adapters | Dual-rumble and pulse-only controllers use their supported actuator API, while unsupported or rejected actuator calls leave input responsive. | F301 | M | P2 |
| F324 | Bounded haptic event arbitration | Twenty impact events in one second produce a bounded haptic schedule, and leaving gameplay cancels pending pulses without a delayed vibration burst. | F323 | M | P2 |
| F325 | Controller haptic strength tester | A player can explicitly preview three strength levels on the selected controller; each preview lasts at most one second and the chosen strength persists locally. | F302, F323 | S | P3 |
| F326 | Controller-profile mismatch warning | A saved profile referencing absent buttons or axes is flagged before activation, with usable default controls available and the original profile retained. | F302, F304 | M | P1 |
| F327 | Physical-position keyboard bindings | Players can choose physical-key-code or character-based bindings; changing operating-system keyboard layout affects only the character-based mode. | none | M | P1 |
| F328 | Additional keyboard-layout presets | AZERTY, QWERTZ and Dvorak presets provide distinct documented primary movement and action keys without removing fixed emergency navigation keys. | F327 | M | P2 |
| F329 | Distinct numeric-keypad bindings | A keypad digit or Enter can be bound independently from its main-keyboard counterpart in physical-position mode. | F327 | S | P2 |
| F330 | Editable keyboard alias lists | Players can add and remove secondary keyboard bindings without changing an action's primary key or silently retaining deleted aliases. | F327 | M | P2 |
| F331 | Explicit two-key chord bindings | A supported modifier-plus-key chord can map to one action; pressing the unmodified key never triggers that chord and reserved browser shortcuts remain unavailable. | F327 | L | P3 |
| F332 | Browser-shortcut input shielding | Browser-owned Control or Command shortcuts do not also trigger gameplay actions mapped to their letter keys, including mute and music shortcuts. | none | S | P1 |
| F333 | Composition-safe keyboard handling | Keys received during an input-method composition session neither trigger gameplay nor become stored bindings, and ordinary input resumes after composition ends. | F327 | S | P2 |
| F334 | Editable-field gameplay isolation | Typing into an in-game profile-name or backup-name field never moves Riley, changes audio settings or activates fullscreen. | none | S | P1 |
| F335 | Keyboard rollover checker | A local controls utility shows which keys the browser actually receives during a chosen movement-plus-two-action chord and identifies missing events without claiming to repair hardware. | none | M | P2 |
| F336 | Binding-conflict impact preview | Before accepting a keyboard binding, the interface lists every primary or secondary binding that would change and supports canceling without mutations. | F330 | M | P1 |
| F337 | Named keyboard profile slots | Three local keyboard profiles retain their mode, aliases and chords independently, and switching profiles updates visible binding labels immediately. | F327, F330 | M | P2 |
| F338 | Explicit mouse-button action mapping | Supported mouse buttons, including exposed side buttons, can map to gameplay actions; browser defaults are suppressed only for buttons the player explicitly binds. | none | M | P2 |
| F339 | Drag-safe menu click activation | A menu row activates only when pointer press and release occur on that row; dragging away or releasing outside cancels the selection. | none | M | P2 |
| F340 | Trackpad wheel menu navigation | Wheel and trackpad deltas navigate supported menu lists in bounded steps, with momentum unable to activate a row or scroll the game page. | none | M | P2 |
| F341 | Pen-hover target preview | A hovering pen highlights the current clickable target without activating it, and the preview clears when the pen leaves the canvas. | none | S | P3 |
| F342 | Pen-session palm filtering | In an explicitly selected pen-input mode, simultaneous incidental touch contacts do not activate controls while the pen tip is engaged; normal touch mode remains available. | F341 | M | P3 |
| F343 | Compatibility-event action deduplication | A physical interaction that emits pointer, touch and compatibility mouse events generates only one action edge across supported event paths. | none | M | P1 |
| F344 | Last-used hardware prompt selection | A connected idle controller no longer overrides keyboard prompts; a genuine controller action switches prompts, while stick drift and pointer movement alone do not. | F305 | M | P1 |
| F345 | Hybrid movement-source arbitration | Concurrent keyboard, stick and touch movement follows one documented ownership rule, never adds beyond maximum speed, and transfers cleanly after the active source releases. | none | M | P1 |
| F346 | Per-source held-action accounting | When keyboard and controller both hold an action, releasing either source leaves the action held until the other releases, with only one initial press edge. | none | M | P1 |
| F347 | Hybrid touch-overlay activation modes | Auto, Always and Hardware-only modes control whether combat touch inputs are enabled; a laptop touchscreen does not permanently force touch mode after one tap. | F344 | M | P2 |
| F348 | Mixed-device action hints | When keyboard movement and controller attacks are used together, relevant prompts can show both active binding families without changing either mapping. | F344, F345 | M | P3 |
| F349 | Unsupported-fullscreen immersive fallback | If native fullscreen is unavailable or rejected, a reversible page-filling mode works without a false fullscreen indicator or repeated failed requests. | none | M | P2 |
| F350 | Visual-viewport coordinate adaptation | Browser zoom and mobile browser-chrome changes update the visible canvas rectangle and pointer transform; taps at visible control centers remain aligned without changing world coordinates. | none | M | P1 |

### P08 — Offline ownership and resilience (F351–F400)

Make longer-term play safer with verified offline packs, local backups, recovery paths and bounded resource lifetimes.

| ID | Improvement | Testable acceptance criterion | Dependencies | Effort | Priority |
|---|---|---|---|---|---|
| F351 | Versioned offline resource inventory | A runtime-readable inventory names every resource required for all five stages, fonts and optional recorded audio, with byte sizes and one release identifier. | none | M | P1 |
| F352 | Opt-in complete offline download | After a player requests and completes an offline download, a supported browser can reload and complete all five stages with network access disabled. | F351 | L | P1 |
| F353 | Offline download size preview | Before downloading, the interface shows remaining download bytes and available-storage estimates when supported, and clearly labels unknown estimates. | F351 | M | P2 |
| F354 | Resumable offline-pack downloads | Interrupting a pack download halfway and restarting it reuses verified completed resources instead of downloading the entire pack again. | F352 | L | P2 |
| F355 | Offline-readiness verification | The game displays Ready Offline only after every required resource is present and verified; removing one cached required resource clears that status. | F351, F352 | M | P1 |
| F356 | Atomic offline-release activation | A new release uses a staging cache and becomes active only when complete; an interrupted update continues serving the previous complete release. | F352, F355 | L | P1 |
| F357 | Player-controlled offline updates | A prepared update can be deferred until returning to the title screen; receiving an update never reloads an active fight or replaces its resources. | F356 | M | P1 |
| F358 | Previous offline-release recovery | The last complete release remains available for explicit recovery after a failed update, with incompatible newer save formats protected from overwrite. | F356 | L | P2 |
| F359 | Subpath-aware offline navigation shell | Reloading the installed game's existing URLs beneath its deployment subpath works offline, while unrelated same-origin pages remain outside its cache handler. | F352 | M | P1 |
| F360 | Portable self-contained offline edition | A downloadable self-contained HTML edition includes its code, fonts and assets and completes all five stages from a supported file URL without network requests. | F351 | L | P2 |
| F361 | Local save-and-settings export | An explicit export downloads a versioned backup containing the player's selected progress and settings, with no network transmission or unrelated browser data. | none | M | P1 |
| F362 | Backup import preview | Selecting a backup displays its game version, checkpoint summary and included settings before any saved state changes, and invalid files produce actionable errors. | F361 | M | P1 |
| F363 | Transactional backup restoration | An approved restore preserves a recovery copy, writes the replacement atomically, and leaves the original usable if any validation or storage step fails. | F362 | L | P1 |
| F364 | Local checkpoint recovery history | The three most recent valid checkpoint generations remain locally selectable with stage and wave summaries, and selecting one requires an explicit restore action. | none | M | P2 |
| F365 | Checksummed save envelopes | Changing one payload byte in a saved envelope causes integrity validation to reject it before gameplay reads its contents, without deleting the damaged copy. | none | M | P1 |
| F366 | Monotonic checkpoint sequencing | Checkpoint ordering uses an incrementing generation rather than wall-clock time, so moving the system clock backward cannot make an older checkpoint replace a newer one. | F365 | S | P1 |
| F367 | Dual-slot checkpoint commit journal | Interrupting storage at each write step yields either the previous complete checkpoint or the new complete checkpoint on reload, never a partially committed state. | F365, F366 | L | P1 |
| F368 | Future-save migration pipeline | Future schema upgrades run ordered, versioned migrations on a copy and commit only after full validation, retaining the original envelope when a migration fails. | F365, F367 | L | P1 |
| F369 | Newer-save format protection | An older game build encountering a newer save schema shows an explanation and export option without resetting, migrating or overwriting that save. | F361, F365 | M | P1 |
| F370 | Semantic save-boundary validation | Non-finite numbers, oversized collections and impossible field combinations are rejected at the storage boundary before they can initialize a scene. | F365 | M | P1 |
| F371 | Corrupt-save recovery chooser | When the newest save is invalid, the interface offers valid recovery generations and export of the damaged data instead of silently pretending no progress exists. | F361, F364, F365 | M | P1 |
| F372 | Visible temporary-session save mode | If browser storage is unavailable, the game continues with in-memory settings and clearly reports that progress will not survive closing, with local export still usable. | F361 | M | P1 |
| F373 | Storage-full recovery guidance | A quota failure distinguishes unsaved progress from a successful save and offers export plus an explicit optional-cache cleanup action without automatically deleting saves. | F361, F372 | M | P1 |
| F374 | Coalesced settings persistence | Ten settings changes inside 200 milliseconds produce one committed settings write, while the final selection survives a subsequent safe scene exit. | none | M | P2 |
| F375 | Verified save completion indicator | The saved indicator appears only after the committed generation can be read back and validated; a failed write instead leaves a visible unsaved state. | F365, F367 | M | P1 |
| F376 | Cross-tab checkpoint ownership | Two tabs sharing storage cannot silently overwrite one another's progress; the non-owner can continue temporarily or explicitly take over after a clear warning. | F366, F367 | L | P1 |
| F377 | External settings-change reconciliation | A settings write from another tab is detected and applied only at a safe boundary or explicitly declined, without changing live bindings halfway through a held action. | F374, F376 | M | P2 |
| F378 | Back-forward cache rehydration | Returning through browser Back to a cached page restores one active game loop and the existing scene, without duplicate listeners or duplicated audio sources. | none | M | P1 |
| F379 | Page-freeze checkpoint flush | On supported page-freeze or pagehide events, an already prepared safe checkpoint is committed once without advancing combat or constructing a partial in-fight snapshot. | F367 | M | P1 |
| F380 | Interrupted-session recovery notice | After an abnormal close, the next launch identifies the last verified checkpoint and explains what can be recovered, without claiming unsaved combat was preserved. | F375, F379 | M | P2 |
| F381 | Clock-change-safe session metadata | Session duration uses a monotonic timer; a system clock jump leaves duration nonnegative and marks unreliable calendar timestamps instead of reordering saved progress. | F366 | S | P2 |
| F382 | Main 2D canvas-context recovery | Loss of the main 2D canvas context suspends presentation safely; restoration rebuilds its paint caches and drawing state and resumes unchanged gameplay, independently of the existing puppets.js WebGL mesh-loss fallback. | none | L | P1 |
| F383 | Asset-load and decode watchdogs | A fetch or image decode that never settles reaches a bounded timeout and a documented fallback, with no indefinitely blocked loading or scene transition. | none | M | P1 |
| F384 | Abortable obsolete resource requests | Leaving a scene cancels its unneeded pending fetches where supported, and cancelled results cannot install resources into the replacement scene. | F383 | M | P2 |
| F385 | Bootstrap failure recovery screen | A critical script or initialization failure presents a small independent recovery screen with reload and saved-data export paths instead of a permanently blank canvas. | F361 | L | P1 |
| F386 | Runtime asset-shape validation | An atlas with out-of-bounds frames or a zero-dimension image is quarantined before drawing and replaced with the existing fallback without crashing the scene. | none | M | P1 |
| F387 | Resource-byte integrity verification | Where the platform supports verification, mismatched resource bytes are rejected before decode and cannot be marked ready in an offline pack. | F351, F355 | L | P1 |
| F388 | Degraded-resource recovery panel | A local status panel identifies currently missing or quarantined assets and lets the player retry only those resources without restarting the campaign. | F383, F386 | M | P2 |
| F389 | Targeted cached-resource repair | An explicit repair replaces one failed cached resource after verification, retains unaffected cached files, and leaves saves and settings untouched. | F387, F388 | M | P2 |
| F390 | Unified in-flight resource ledger | Concurrent requests for the same versioned image, JSON or audio resource share one underlying fetch and release references without duplicate downloads. | none | L | P2 |
| F391 | Scene-owned resource disposal | Each scene disposes its registered timers, event listeners and temporary object URLs on exit; repeated entry and exit does not accumulate live resources. | none | L | P1 |
| F392 | Scene-generation async guards | An asynchronous callback from an exited scene cannot change the current scene, save progress or start audio, even when it resolves after several later transitions. | F391 | M | P1 |
| F393 | Decoded-audio memory budgeting | Decoded optional audio obeys a declared memory budget with reference-aware eviction; active speech and music are never evicted while playing. | F390, F391 | L | P2 |
| F394 | Priority-aware maintenance scheduling | Background verification, save preparation and cache maintenance run through cancellable budgeted jobs, with interactive work taking precedence and no job retaining an exited scene. | F391, F392 | L | P2 |
| F395 | Spatial broad-phase collision queries | A spatial index reduces candidate collision checks in crowded encounters while producing the same ordered collision outcomes as the exhaustive reference path. | none | L | P2 |
| F396 | Reusable simulation scratch buffers | Movement and collision-query scratch arrays are reused across ticks, remain bounded during a long session, and cannot retain actors after their scene exits. | F391 | M | P2 |
| F397 | Idle-screen render suspension | A visually static title or settings screen stops continuous drawing after settling and redraws promptly on input, animation, asset arrival or viewport change. | none | M | P2 |
| F398 | Low-allocation runtime counters | Always-on performance bookkeeping uses fixed-capacity numeric buffers without constructing per-frame scene strings or job arrays when detailed inspection is closed. | none | M | P2 |
| F399 | Optional-subsystem circuit breakers | A repeatedly failing optional visual or haptic subsystem disables itself for the session with a clear status, while critical simulation errors remain visible and trigger safe recovery. | F385 | M | P1 |
| F400 | Transactional scene initialization | If an incoming scene fails during initialization, its partial resources are disposed and the game returns to a recoverable previous or title state without committing new progress. | F391, F392 | L | P1 |

### P09 — Authoring and review tools (F401–F450)

Reduce the cost of safely maintaining a larger game through reusable local editors, deterministic evidence and content validation.

| ID | Improvement | Testable acceptance criterion | Dependencies | Effort | Priority |
|---|---|---|---|---|---|
| F401 | Build a standalone wave-composition editor | A local HTML tool imports a stage definition, edits enemy counts and exports validated JSON without editing runtime files automatically. | none | L | P1 |
| F402 | Preview enemy spawn geometry in the editor | The tool overlays visible bounds, lanes and spawn points and flags overlaps or off-arena placements before export. | F401 | M | P1 |
| F403 | Build an attack-timeline editor | Authors adjust startup, active and recovery markers against an animated preview and export the exact numeric move definition. | none | L | P2 |
| F404 | Build a lane-hazard authoring preview | The tool scrubs warning, active and recovery phases and displays the available safe lane for each time sample. | none | L | P2 |
| F405 | Build a cinematic camera-path previewer | Authors scrub an existing reel's pan/zoom curve with safe caption bounds and a motion-off preview using the same source painting. | none | M | P2 |
| F406 | Validate linear story-script continuity | A script checker rejects missing next beats, unreachable endings and duplicate reward events and names the offending caption IDs. | none | M | P1 |
| F407 | Generate complete caption-layout proof sheets | One command lays out every caption at supported text sizes and marks overflow, clipped speaker names and portrait collisions. | none | M | P1 |
| F408 | Generate scale-accurate painted asset contact sheets | A tool arranges new assets at their actual gameplay size beside the stage palette and exports labeled review images. | none | M | P2 |
| F409 | Build a hand-and-foot anchor authoring tool | Authors place named anchors on source paintings and export normalized coordinates with source-image dimensions and hashes. | none | L | P2 |
| F410 | Lint transparent image borders automatically | The checker identifies nonzero edge pixels, unexpected opaque rectangles and isolated alpha specks, reporting locations without altering artwork. | none | M | P2 |
| F411 | Report foreground/background value separation | A preview samples fighter and background luminance in representative combat regions and links low-separation cases to review crops. | F408 | M | P2 |
| F412 | Create an asset provenance and license ledger | Every newly added asset has origin, creator/tool, permission, source hash and allowed use; missing fields fail its import checklist. | none | M | P1 |
| F413 | Validate content cross-references from schemas | Enemy, move, stage, pickup and story definitions reject unknown IDs and invalid numeric ranges before any browser is launched. | none | M | P1 |
| F414 | Lint newly authored voice cues against scripts | New cue IDs must reference one caption and a declared trigger; the tool detects orphaned clips and duplicate trigger ownership. | F413 | M | P2 |
| F415 | Build a non-destructive sound-cue arranger | A local tool layers selected effects on a timeline, previews the result and exports only cue timing/configuration until explicitly saved. | none | L | P3 |
| F416 | Record reproducible controller action scripts | A developer-only recorder exports normalized action edges and simulation ticks without device identifiers or external transmission. | none | L | P2 |
| F417 | Define a versioned replay-fixture format | Fixtures declare schema version, seed, starting snapshot and action sequence; unsupported versions fail with a migration explanation. | F416 | M | P1 |
| F418 | Minimize failing gameplay replays automatically | Given a deterministic failing fixture, a reducer removes irrelevant action spans while preserving the failure predicate and original fixture. | F417 | L | P2 |
| F419 | Compare simulation state across two builds | A tool runs an identical fixture in baseline and candidate and reports the first divergent tick with differing gameplay fields. | F417 | L | P1 |
| F420 | Capture named state snapshots for scene debugging | A developer command records actor states, encounter phase and camera state without raw browser storage or unrelated settings. | none | M | P2 |
| F421 | Check gameplay and presentation randomness separation | Static and runtime probes flag presentation code consuming the gameplay PRNG and show the callsite for a seeded reproduction. | none | M | P1 |
| F422 | Generate save-migration fixtures from schemas | A tool produces minimal, maximal and missing-optional-field saves for every supported version without touching the player's browser storage. | none | M | P1 |
| F423 | Fuzz serialized save values within bounded cases | Finite test inputs cover nulls, extreme numbers, unexpected types and truncated JSON and report crashes or unintended defaults by field. | F422 | M | P1 |
| F424 | Map the full scene-transition graph | A development report lists reachable scenes and labeled edges and highlights scenes with no safe exit path. | none | M | P1 |
| F425 | Model-check interruptible scene transitions | Generated sequences combine pause, hide, resume and scene exit; each terminal trace must have exactly one active scene and no held action leak. | F424 | L | P2 |
| F426 | Generate the offline asset request manifest | A static dependency walk enumerates relative resources and compares it with observed requests, identifying undeclared runtime dependencies. | none | M | P1 |
| F427 | Identify unused bundled assets for review | The tool distinguishes unreachable assets from dynamic references and outputs candidates only, never deleting source files automatically. | F426 | M | P2 |
| F428 | Report the likely test impact of content changes | Changing a move, stage or cue yields the linked fixtures and review scenes from explicit dependency metadata. | F413, F417 | M | P2 |
| F429 | Export a phase-labeled performance trace | Developer export separates asset decode, preparation, simulation, draw and presentation spans without hiding warm-up costs or changing the clock. | none | M | P2 |
| F430 | Tag long-lived runtime allocations by owner | An opt-in debug registry attributes canvases, audio nodes and listeners to scenes and reports surviving owners after scene disposal. | none | M | P2 |
| F431 | Add reviewable visual-diff baselines for new content | Each new-content snapshot records viewport, source hash and permitted masks; baseline replacement requires an explicit human review note. | none | M | P1 |
| F432 | Track approved source-painting fingerprints | A manifest records each protected source painting hash and distinguishes derived caches from sources, flagging accidental source replacement. | none | M | P1 |
| F433 | Check sprite optical pivots across poses | A tool overlays frame bounds, pelvis anchors and visible centers and reports unexpected size or pivot jumps for reviewer inspection. | F409 | M | P2 |
| F434 | Benchmark input-to-simulation response paths | A synthetic edge trace reports ticks from action arrival to move start for idle, hit-stop and buffered states, without claiming device latency. | F416 | M | P2 |
| F435 | Generate accessibility review cases from UI metadata | Every setting and menu action yields a named keyboard, semantic-control and large-text inspection case with an owner and expected result. | none | M | P2 |
| F436 | Add a pseudo-localized text stress mode | Developer-only doubled-length accented strings reveal layout overflow without shipping a new language or changing canonical story text. | none | M | P2 |
| F437 | Extract visible strings into a checked resource catalog | A tool identifies user-visible literals, records stable IDs and flags missing bindings without changing gameplay identifiers. | none | L | P2 |
| F438 | Write an offline guide for adding a level | A worked miniature fixture documents required data, art fallbacks, cues, checkpoint semantics and the separate expansion balance report. | F413 | M | P1 |
| F439 | Add a deliberate defensive playtest controller | A deterministic bot prioritizes lane avoidance and recovery openings, and reports its policy separately from the inherited masher controller. | none | L | P2 |
| F440 | Compare multiple controller policies without averaging them away | A report shows per-stage results for masher, defensive and resource-saving policies separately with seeds and assistance flags. | F439 | M | P2 |
| F441 | Add an exploratory state-coverage viewer | Coverage shows which actor states and move transitions occurred in a fixture and highlights missing transitions without declaring unobserved states safe. | F417 | M | P2 |
| F442 | Build a new-enemy contract test template | Each new archetype supplies spawn, tell, damage, defeat and cleanup fixtures; the template rejects missing required scenarios. | F413 | M | P1 |
| F443 | Provide a no-network review package generator | A local command assembles source, asset manifest, selected evidence and a static index with resolvable relative links. | F426 | M | P2 |
| F444 | Generate an artifact integrity manifest | Review bundles include SHA-256 hashes for files and a verifier that detects altered or missing bytes without external services. | F443 | S | P1 |
| F445 | Produce readable release-note drafts from approved item IDs | The tool maps selected roadmap IDs to user-facing summaries and marks uncertain status as pending rather than claiming completion. | none | M | P2 |
| F446 | Add a maintainable dependency graph for script load order | A checker detects cycles and use-before-definition risks in declared module dependencies while preserving the no-build runtime. | none | M | P1 |
| F447 | Detect accidental external network dependencies in review | A clean review run permits only listed game-origin assets and reports unexpected requests without collecting player browsing data. | F426 | M | P1 |
| F448 | Create a repository vocabulary consistency checker | A local linter checks approved names, action labels and setting terminology across new source, help and captions, with explicit intentional exceptions. | F437 | M | P2 |
| F449 | Generate review coverage for each future pass | A report maps its 50 IDs to code, artifacts, test results and unresolved exceptions, leaving unsupported claims visibly unverified. | none | M | P1 |
| F450 | Validate roadmap integrity as future passes evolve | A checker enforces unique stable IDs, 50-item pass membership, existing acyclic dependencies and immutable historical acceptance text unless a revision is recorded. | F449 | M | P2 |

### P10 — Two optional post-finale levels (F451–F500)

Add River Docks and Mountains of Mist only after the core is stable; give each its own targets, evidence and release decision.

| ID | Improvement | Testable acceptance criterion | Dependencies | Effort | Priority |
|---|---|---|---|---|---|
| F451 | Define expansion campaigns as separate content packs | Two optional post-finale packs have independent IDs, saves and records; the original campaign still contains exactly five numbered stages. | none | L | P1 |
| F452 | Add a post-finale expansion selection screen | Only a completed original run unlocks the two optional packs; selecting either names its setting and never replaces original Continue. | F451 | M | P1 |
| F453 | Design Tar Valon River Docks as the first optional level | A reviewed six-encounter plan protects a supply route after the reunion, contains no new capture plot and states a distinct objective for each encounter. | F451 | M | P2 |
| F454 | Paint the River Docks skyline and far bank | A new layered painted plate shows Tar Valon's skyline with clear combat-space values and a source-consistent reduced-motion presentation. | F453 | L | P2 |
| F455 | Paint the River Docks quay and floor set | Quay paving, mooring posts and ramps form a continuous six-arena route with readable walkable edges and no reused original-stage panorama. | F453 | L | P2 |
| F456 | Implement a tide-gate timing hazard | Water gates warn for at least 1.2 seconds before a brief lane closure, leave a reachable dry lane and never cause drowning or instant death. | F453 | L | P2 |
| F457 | Add a dock-crane obstacle interaction | A visible rope switch moves one suspended crate to open a route; pausing, retrying or leaving the arena cannot strand the gate state. | F453 | L | P3 |
| F458 | Build Docks encounter one as a safe arrival | A small melee group teaches the new floor layout without tide gates; first contact starts only after the player enters the marked arena. | F453 | M | P2 |
| F459 | Build Docks encounter two around the first tide gate | One low-pressure enemy group accompanies a single demonstrated closure, with a guaranteed safe lane before any combined hazard pattern. | F456 | M | P2 |
| F460 | Build Docks encounter three around crane cover | A ranged enemy and movable crate create two viable approaches, and either route completes without spending Loial or super. | F457 | M | P2 |
| F461 | Build Docks encounter four as a pier-side defense | Two staggered groups attack from visible entries while the narrow-looking pier retains the documented full safe movement band. | F453 | M | P2 |
| F462 | Build Docks encounter five as a mixed-route test | Alternating tide gates and support enemies reuse previously taught rules without introducing another hazard immediately before the boss. | F456, F459 | M | P2 |
| F463 | Create the Docks boss Harbor Warden | An original armored Shadow opponent has a clear painted silhouette, non-gory defeat and three attacks based on anchors, lane pressure and recovery. | F453 | L | P2 |
| F464 | Implement the Warden's anchor-sweep attack | A floor arc telegraphs a broad close sweep, jumping or retreating avoids it and the anchor recovery exposes the boss for a measured interval. | F463 | L | P2 |
| F465 | Implement the Warden's marked mooring pull | The boss marks one lane before pulling a loose rope barrier across it; the barrier cannot pin Riley against the arena edge. | F463 | L | P2 |
| F466 | Implement the Warden's staggered pier slam | Two sequential impact lanes leave a traversable gap at standard movement speed, and the boss cannot overlay a third simultaneous damage lane. | F463 | L | P2 |
| F467 | Add Docks-specific ambience and impact textures | Optional local water, rope and timber cues match visible events, have non-file fallbacks and remain intelligible under the existing main theme. | F453 | M | P3 |
| F468 | Add Docks gameplay text and notebook entry | A short start objective, three contextual hints and a completion note tell the self-contained story without adding a cinematic reel. | F453 | M | P2 |
| F469 | Add Docks checkpoint and retry fixtures | Each of its six encounters resumes with consistent gate, crane and resource state in a pack-specific save while original saves remain untouched. | F451, F457 | M | P1 |
| F470 | Give Docks a separate Normal balance target | Forty fixed seeds target a 65–85% independent clear rate with three lives and no top-ups; report failures, median damage and duration outside the original five-stage matrix. | F458, F459, F460, F461, F462, F463, F464, F465, F466 | M | P1 |
| F471 | Give Docks a separate Hard balance target | The same forty seeds and controller target a 35–55% independent clear rate on Hard; its result cannot substitute for any original stage's target. | F470 | M | P1 |
| F472 | Set a Docks first-play comprehension gate | A family playtest plan checks tide warning, crane switch and boss counters; mark unrun until actual voluntary players complete it with qualitative notes. | F456, F457, F463 | M | P1 |
| F473 | Set a Docks resource-economy gate | Fixed-seed runs confirm every arena is finishable without a required pickup, Loial or super and resource supply has no deterministic drought across the level. | F469 | M | P1 |
| F474 | Set a Docks performance and asset gate | Cold and warm entries, six encounters and boss effects meet the applicable unchanged engine budgets or remain blocked, with pack-loading cost reported separately. | F454, F455, F456, F457, F463, F464, F465, F466 | M | P1 |
| F475 | Add a Docks completion reward without power creep | Clearing the pack unlocks one local painted postcard and rematch access, with no stat changes carried into the original five stages. | F470, F471 | M | P3 |
| F476 | Design Mountains of Mist Trail as the second optional level | A reviewed six-encounter post-finale route clears a safe mountain pass, avoids another rescue plot and introduces only wind and shelter as new traversal rules. | F451 | M | P2 |
| F477 | Paint the mountain ridge and cloud layers | Original painted ridgelines establish depth without concealing attack silhouettes; static and animated-cloud presentations share the same visible landmarks. | F476 | L | P2 |
| F478 | Paint the trail, bridge and sheltered camp | A continuous six-arena floor depicts apparent cliffs while retaining safe collision boundaries and no lethal falling mechanic. | F476 | L | P2 |
| F479 | Implement marked mountain wind intervals | Wind direction and onset are visible for at least 1.2 seconds, gusts cannot force edge damage and a sheltered lane remains reachable. | F476 | L | P2 |
| F480 | Implement shelter stones as a positional tool | Standing in a visibly marked lee zone removes gust displacement only while inside it; enemies and Riley follow the same rule. | F479 | L | P2 |
| F481 | Build Trail encounter one at the lower camp | A modest melee encounter establishes shelter markings before wind activates, and clearing it opens the upward route without a timed demand. | F476 | M | P2 |
| F482 | Build Trail encounter two as a gust introduction | One gentle gust cycle teaches the safe shelter route with low enemy pressure and no projectile overlapping the first warning. | F479, F480 | M | P2 |
| F483 | Build Trail encounter three at the rope bridge | The bridge is visually narrow but collision-safe; alternating ranged threats leave a reachable lane and never turn knockback into an instant loss. | F478 | M | P2 |
| F484 | Build Trail encounter four around shelter choice | Two shelter areas let Riley choose a safer ranged approach or a faster close route, and both solutions work at standard speed. | F480 | M | P2 |
| F485 | Build Trail encounter five as a ridge crossing | A bounded wind-and-melee sequence combines already-taught rules and provides a quiet recovery interval before the summit boss. | F479, F482 | M | P2 |
| F486 | Create the Trail boss Ridge Sentinel | An original stone-armored Shadow opponent has three wind-and-footwork attacks, a readable painted silhouette and a harmless crumbling defeat. | F476 | L | P2 |
| F487 | Implement the Sentinel's crosswind march | A marked gust accompanies a slow committed advance; the player can reach shelter or circle behind before damage activates. | F480, F486 | L | P2 |
| F488 | Implement the Sentinel's rolling-stone lanes | Three visibly sequenced stones roll through separate lanes, disappear safely at bounds and leave a route avoidable without jumping. | F486 | L | P2 |
| F489 | Implement the Sentinel's summit recoil opening | After a warned two-part stomp, the boss braces visibly for a fixed recovery window and cannot restart an attack before that window expires. | F486 | L | P2 |
| F490 | Add Trail-specific environmental audio | Optional local ridge wind, rope creak and sheltered hush cues follow the actual gust state without masking essential warnings or requiring network playback. | F479 | M | P3 |
| F491 | Add Trail gameplay text and notebook entry | A start objective, three shelter hints and a completion note explain the new route with no added cinematic or changes to the existing ending. | F476 | M | P2 |
| F492 | Add Trail checkpoint and retry fixtures | Every encounter restores wind phase, shelter layout and resources from its own expansion save; reloading cannot duplicate pickups or boss rewards. | F451, F479, F480 | M | P1 |
| F493 | Give Trail a separate Normal balance target | Forty fixed seeds target a 55–75% independent clear rate with three lives and no top-ups, reported separately from Docks and the original campaign. | F481, F482, F483, F484, F485, F486, F487, F488, F489 | M | P1 |
| F494 | Give Trail a separate Hard balance target | The same forty seeds and controller target a 25–45% independent clear rate on Hard; data stays outside the original five-stage acceptance matrix. | F493 | M | P1 |
| F495 | Set a Trail navigation-comprehension gate | Voluntary playtests must show that shelter markings, safe cliff boundaries and gust direction are understood; no automated run is labeled human evidence. | F479, F480 | M | P1 |
| F496 | Set a Trail unavoidable-displacement gate | At minimum HP, maximum gust and edge positions, a reachable legal response avoids every forced-hit chain without rare resources or assisted speed. | F479, F487, F488, F489 | M | P1 |
| F497 | Set a Trail performance and asset gate | All six encounters, cloud layers and three boss patterns meet existing engine limits or are marked unresolved; cold pack-loading costs remain visible. | F477, F478, F479, F480, F486, F487, F488, F489 | M | P1 |
| F498 | Add a Trail completion reward without power creep | Clearing the route unlocks one local summit postcard and rematch access without stronger Riley stats, new accounts or competitive ranking. | F493, F494 | M | P3 |
| F499 | Verify expansion isolation from the five-stage campaign | With either pack enabled or disabled, original seeds, rewards, save migration and Normal/Hard tuning remain unchanged and all five original stages are reported separately. | F451, F469, F492 | L | P1 |
| F500 | Prepare separate expansion review decisions | Each pack has its own evidence, art review, exact candidate and unresolved gates; neither pack ships or modifies the original release without a fresh explicit GO. | F472, F473, F474, F475, F495, F496, F497, F498, F499 | M | P1 |

## Validation and review notes

The companion [machine-readable roadmap](future-500.json) is the authoritative structured list. A generation-time script verified exactly 500 entries, contiguous unique IDs, ten passes with exactly 50 items each, required fields, valid effort/priority values, existing backward-only dependencies, no dependency duplicates, and no normalized duplicate titles or acceptance criteria. Every criterion has at least 15 words rather than an empty pass/fail placeholder.

Editorial review also compared similarly named entries by outcome: painted versus audio lightning signatures, a pickup versus its collection effect, runtime validation versus an authoring checker, and a boss specification versus distinct implemented attack patterns. Those are separate deliverables. Existing spear, hound, homecoming, reduced-shake and WebGL-loss features were explicitly checked to avoid re-listing them.

For a quick independent structural recheck from the repository root:

```python
import json, re
from collections import Counter
from pathlib import Path
data = json.loads(Path("docs/future-500.json").read_text())
items = data["items"]
assert len(items) == 500
assert [x["id"] for x in items] == [f"F{n:03d}" for n in range(1, 501)]
assert Counter(x["proposed_pass"] for x in items) == {f"P{n:02d}": 50 for n in range(1, 11)}
norm = lambda s: re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()
assert len({norm(x["improvement"]) for x in items}) == 500
assert len({norm(x["acceptance"]) for x in items}) == 500
known = {x["id"] for x in items}
for item in items:
    assert item["status"] == "proposed"
    assert item["effort"] in {"S", "M", "L"}
    assert item["priority"] in {"P1", "P2", "P3"}
    assert len(item["acceptance"].split()) >= 15
    assert len(item["dependencies"]) == len(set(item["dependencies"]))
    assert all(dep in known and dep < item["id"] for dep in item["dependencies"])
assert len(data["proposed_new_levels"]) == 2
assert len(data["optional_new_cinematic_items"]) == 5
print("500 proposed items; 10 passes of 50; IDs, fields, dependencies and uniqueness valid")
```

Only FUTURE_500.md and future-500.json belong to this roadmap change. No runtime feature, release approval, commit, push or deployment is part of this planning deliverable.
