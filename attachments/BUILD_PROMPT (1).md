# BUILD PROMPT — Offline Survival Decision-Tree Guide (phased, no stubs)

## Role & ground rules
You are building an offline-first survival guide driven by decision trees. Users answer short questions (situation, biome, inventory, injuries) and get step-by-step guidance. Build in PHASES. Each phase must pass its acceptance gates, **with evidence** (test output, sample traversals, lint/validator logs), before the next phase starts.
- **No stubs, placeholders, TODOs, or "content coming soon" nodes.** Every node in every shipped section has full, real text.
- **If a phase fails a gate:** stop. Don't start the next phase. Report what failed, the evidence, and every phase/section still unfinished.
- **Safety content is normative.** Any rule marked SAFETY must appear word-for-word in its node, and a test must assert it is there.
- After each phase, print a **Phase Status Report** (format at the end).

## Platform, stack & UI (applies to every phase)
### Stack
- An installable, offline-first **PWA**: Vite + React + TypeScript. A service worker (e.g. vite-plugin-pwa / Workbox) precaches **everything**: app shell, all tree JSON, all icons. All content ships bundled as JSON in the repo. **Zero runtime network calls**, and a test must enforce this. The stack can be swapped (another framework, or native) as long as every requirement and gate below still holds.
- Run/build/test:
  - `npm install`
  - `npm run dev` (local dev server)
  - `npm run build && npm run preview` (production build + service worker)
  - `npm test` (Vitest unit tests + coverage)
  - `npm run validate` (tree + pictogram validator)
  - `npm run e2e` (Playwright, including offline and kid-mode tests)
  - `npm run lighthouse` (PWA installability audit against the preview build)

### UI
- **Home screen:** three big pictogram tiles: **"I want"**, **"I need"**, **"First aid"**.
- **"I need"** opens a pictogram menu: Water, Food, Fire, Shelter, Signaling/Navigation.
- **Every choice is multiple choice**, with pictograms and minimal text. No free typing is required. The "I want" router offers intent chips; free text is optional.
- **Checklists:** "What I have" (inventory) and "What's around me" (environment/materials) are tappable pictogram items. They feed `Context.inventory` and the substitution resolver.
- **Pictograms:** one consistent, simple SVG icon set built in code (React components / inline SVG paths in the repo; no external downloads, icon fonts, or CDNs). Every node, option, item, step, and substitution references a `pictogram` id (add `pictogram` to the Node, Option, Step, Substitution, and Item schemas). **The validator fails on any missing or unknown pictogram id.**
- **Biome/environment:** picked once at first launch from a pictogram grid (the 8 biomes + season/weather), stored locally, and editable in Settings.
- **Kid mode** (toggle in Settings): bigger icons, fewer words (each node carries a `kid_text` short form), and a **"Get a grown-up"** gate before dangerous steps. Mark nodes with `danger: fire|blade|chemical|foraging|first_aid_advanced`. In kid mode those nodes show the gate and do not reveal the steps until an adult confirms (e.g. press-and-hold). First-aid basics (call for help, pressure on bleeding, stay warm, stay put) stay ungated.
- **Accessibility & low battery:** tap targets ≥ 48×48 px (bigger in kid mode); one-handed use (primary actions in the bottom thumb zone); high contrast (WCAG AA minimum, AAA for body text); dark/night mode (red-on-black option to keep night vision); no heavy animations (honor `prefers-reduced-motion`, no autoplay or video); screen-reader labels on every pictogram.

## Shared data model (Phase 1 builds it, every later phase uses it)
- `Tree { id, title, version, entry_node, nodes[] }`
- `Node { id, type: question|instruction|warning|terminal, text, steps[], options[] -> {label, next, conditions?}, substitutions[], safety[], sources? }`
- `Context { biome: temperate_forest|boreal/snow|desert|tropical/jungle|grassland|coastal|alpine|urban_ruin, season, weather: dry|wet|freezing|hot, inventory: set<item>, injuries: set, party_size, daylight }`
- `Substitution { need, preferred, alternatives[] -> {item, biome?, conditions?, how_to, caveats} }`. The resolver picks the first alternative that works for the current inventory and biome. If none works, it falls through to a "no-gear method" node, which must exist. It never dead-ends.
- **Engine requirements:** load and validate trees from JSON/YAML; walk them deterministically from a Context; resolve substitutions; surface the safety block **before** any steps it governs; save and resume a session; work fully offline; trace each traversal path (for evidence).
- **Validator (runs in CI):** no orphan or unreachable nodes; every option's `next` exists; every non-terminal node has ≥1 exit; no cycles except explicit "retry" edges; no empty text or empty steps on instruction nodes; banned-token scan (`TODO|TBD|lorem|stub|placeholder|coming soon`) → fail; each section has substitutions for at least 4 biomes; required SAFETY strings are present.

---

## PHASE 1 — Engine + full FIRE slice
### Fire content outline (decision tree)
1. Q: Why do you need fire: warmth/hypothermia, water purification, cooking, signaling, or morale/insects? (Priority goes to hypothermia.)
2. Q: Conditions: dry / wet / windy / snow / no wood (desert, above treeline).
3. **Site selection:** sheltered from wind, not under hanging snow or dead branches ("widowmakers"), off peat or root mats, 3 m clear radius, on bare mineral soil, a rock platform, or a green-log raft on snow.
4. **Material gathering**, in three grades: tinder → kindling (pencil-lead to pencil thickness) → fuel (wrist thickness and up). Gather 2× what you think you need before lighting.
5. **Ignition branch by inventory:** lighter → ferro rod → matches → magnifier/clear bottle/ice lens (sun) → battery + steel wool or foil gum wrapper → bow drill → hand drill (dry climates only) → fire plough.
6. **Fire lay:** teepee for a fast start, log cabin for cooking coals, lean-to for wind, Dakota hole for wind/stealth/low smoke, star fire to save fuel.
7. **Troubleshooting:** smoke but no flame → more oxygen and finer tinder; flame dies → kindling too thick; fire won't hold in the wet → split wood to its dry core and build a platform.
8. **Maintenance & banking overnight; extinguishing** (drown, stir, feel for heat).

### Substitutions (required, examples)
- **Tinder when wet:** fatwood (resinous pine stump/knot, temperate or boreal) → birch bark (oily, burns wet; boreal) → inner cedar or juniper bark shredded (temperate) → cattail fluff or punk wood (wetland) → dry grass or dung (grassland/desert) → coconut husk coir (tropical) → cotton balls + petroleum jelly, char cloth, hand sanitizer, chips/Doritos (inventory) → feather sticks carved from split dead standing wood (no-gear fallback).
- **Fuel with no wood:** dried dung (grassland/desert), sagebrush/creosote (desert), driftwood (coastal: dry above the high-tide line; saltwater-soaked wood spits), seal or animal fat (arctic).
- **Ignition with no gear:** bow drill woods by biome: yucca, cottonwood, willow, cedar, basswood. Hand drill: mullein or yucca stalk on a cedar or cottonwood hearth.

### SAFETY (must appear verbatim)
- "Never build a fire inside an enclosed shelter, tent, or snow cave without ventilation — carbon monoxide is odorless and lethal."
- "Do not use river rocks or wet stones in a fire ring; trapped water can make them explode."
- "Check local fire restrictions and wind; in dry grass or high wind, clear to bare soil and keep water or dirt ready."
- "Never use gasoline to start or revive a fire."
- "Fully extinguish: drown, stir, drown again, and touch-test for heat before leaving."

### Phase 1 acceptance gates (all required, with evidence)
- G1.1 Validator passes on the Fire tree with 0 errors. Attach the log.
- G1.2 Unit tests: ≥90% line coverage on engine and resolver. Attach the coverage report.
- G1.3 Golden traversal tests (attach path traces): (a) boreal + wet + {ferro rod} → birch bark/fatwood tinder → ferro → lean-to; (b) desert + {nothing} → dung/grass → hand drill; (c) coastal + {lighter} → driftwood above the tide line; (d) snow + {matches} → platform fire + CO warning shown before the steps; (e) empty inventory, any biome → reaches the no-gear method and never dead-ends.
- G1.4 Safety test: every SAFETY string is present and rendered before the steps it governs.
- G1.5 Offline test: the full traversal works with networking disabled.
- G1.6 Banned-token scan clean.
- G1.7 Save/resume test passes.
- G1.8 **Offline (network disabled):** a Playwright test loads the installed PWA, goes offline (context offline + all requests blocked), cold-reloads, and completes golden traversals (a)–(e). It asserts zero network requests after install. Attach the trace.
- G1.9 **PWA installable:** Lighthouse PWA/installability audit passes (manifest, service worker, icons, offline start URL). Attach the report.
- G1.10 **Pictogram coverage:** the validator reports 100% of nodes, options, items, steps, and substitutions with valid pictogram ids, plus 0 missing or unknown ids. Every id renders a built-in SVG. Attach the report.
- G1.11 **Kid mode:** with kid mode on, every Fire node marked `danger: fire` (and any blade steps) shows the "Get a grown-up" gate before its steps. Every node has `kid_text`. Icons and tap targets meet the kid-mode size minimums. Attach e2e output.
- G1.12 **UI shell:** the home tiles (I want / I need / First aid), the I need menu, the first-launch biome picker (editable in Settings), the have/around-me checklists, dark/night mode, and the reduced-motion and contrast checks (axe) all pass.

---

## PHASE 2 — WATER
**Outline:**
1. Triage: how long since you last drank? Do you have signs of dehydration (dark urine, headache, dizziness)? Water need is about 2–4 L/day, more in heat or exertion.
2. **Finding water by biome:** temperate (streams, springs, seeps at the base of slopes); desert (dry wash outer bends: dig, green vegetation, animal trails at dawn and dusk, rock tanks); tropical (rain, vines, bamboo, banana-trunk well); boreal/snow (melt snow, don't eat it); coastal (dig a beach well behind the first dune for brackish water, collect rain); urban (water heater tank, toilet tank — not the bowl, pipes).
3. **Collection:** rain tarp, dew wiping with cloth at dawn, transpiration bag on leafy non-toxic branches, solar still (low yield, last resort).
4. **Treatment decision tree:** boil → chemical (chlorine dioxide, iodine, bleach dosing table) → filter (pump/straw/gravity) → UV/SODIS (clear PET bottle, 6 h of full sun, 2 days if cloudy). Pre-filter cloudy water through cloth.
5. **Storage & rationing:** "ration sweat, not water".

**Substitutions:** no pot → boil in a plastic bottle filled to the top over coals, a hot-rock boil in a bark or rock container, or a green bamboo segment (tropical); no filter → cloth + sand + charcoal pre-filter (clarifies only; it does not disinfect); no container → condoms, plastic bags, bamboo, birch-bark vessel; snow with no stove → a black bag in the sun, or a bag of snow next to your body (not against bare skin when you're hypothermic).

**SAFETY (verbatim):**
- "Never drink seawater or urine."
- "Do not eat snow or ice to hydrate; melt it first — eating it accelerates hypothermia."
- "Boil at a rolling boil for 1 minute (3 minutes above 2,000 m / 6,500 ft)."
- "Improvised sand/charcoal filters clarify water but do not make it safe; disinfect afterward."
- "Bleach: use only plain unscented 5–9% sodium hypochlorite, 2 drops per liter, wait 30 minutes; double for cloudy or cold water."
- "If water is scarce, do not eat high-protein food; digestion uses water."

**Gates:** G2.1 validator 0 errors · G2.2 unit tests for the treatment selector and the dosing calculator (bleach/iodine by volume, altitude-adjusted boil time), all passing · G2.3 golden paths: desert/no gear → wash dig + SODIS; boreal/stove → melt + boil; coastal → beach well + boil, plus a never-seawater warning; urban → water heater tank · G2.4 safety strings asserted · G2.5 banned-token scan clean · G2.6 Phase 1 regression suite still green · G2.P pictogram coverage 100% for this section (validator) · G2.K kid-mode gates verified for this section's danger nodes (e2e) · offline e2e still passes.

---

## PHASE 3 — SHELTER
**Outline:**
1. Triage the threat: cold/wet/wind vs. heat/sun vs. insects/rain. Shelter usually comes before water in cold, wet conditions (rule of 3s).
2. **Site selection:** high, dry, flat; out of drainage paths and flash-flood washes; not under widowmakers; out of avalanche run-outs; away from insect-breeding water; close to materials and water.
3. **Insulate from the ground first** (most heat is lost by conduction): 15–30 cm of compressed debris or boughs.
4. **Type branch:** debris hut (temperate) · lean-to + reflector fire · tarp configs (A-frame, lean-to, diamond) · snow trench / quinzhee / tree-well (snow) · desert shade with a double layer 30 cm apart, dug 45 cm into cooler ground · raised jungle platform + palm thatch (tropical) · urban: a vehicle or building interior, insulated, away from glass.
5. Size it to your body (small = warm), seal the door, and set up a ventilation hole for snow shelters.

**Substitutions:** no tarp → trash bags, emergency blanket, poncho, bark slabs, thatch, or a vehicle; no cordage → inner bark (basswood/willow), yucca or dogbane fiber, roots, shoelaces, strips of clothing; no insulation → dry leaves, grass, boughs, cattails, crumpled paper, cardboard (urban), or a pack and rope beneath you.

**SAFETY (verbatim):**
- "Snow shelters must have a ventilation hole; keep it clear and never run a stove or fire inside without airflow."
- "Do not camp in dry washes, gullies, or riverbeds — flash floods can arrive from storms miles away."
- "Check overhead for dead limbs and leaning trees before building."
- "In cold, avoid sweating while building; remove layers and work slowly."

**Gates:** G3.1 validator · G3.2 unit tests for the site-hazard checker and the type selector · G3.3 golden paths: snow + no tools → snow trench + vent warning; desert midday → shade shelter and rest until dusk; tropical rain → raised platform; urban winter → vehicle/building · G3.4 safety asserts · G3.5 banned-token scan · G3.6 regression (Phases 1–2) green · G3.P pictogram coverage 100% for this section (validator) · G3.K kid-mode gates verified for this section's danger nodes (e2e) · offline e2e still passes.

---

## PHASE 4 — FOOD
**Outline:**
1. Priority check: you can live about 3 weeks without food. Water, shelter, and fire come first. Eat only if you have water.
2. **Plants:** a positive ID beats any "test". Region-specific safe-and-common lists: cattail, dandelion, clover, acorns (leach the tannins), pine inner bark and needle tea, plantain, wild onion (smells like onion), coconut, prickly pear (remove the glochids).
3. **Insects/invertebrates:** the most reliable calories. Cook them. Avoid bright-colored, hairy, or foul-smelling ones.
4. **Fishing:** improvised hooks (thorn, bone, gorge hook, safety pin), passive lines, fish traps/weirs.
5. **Trapping:** simple snares on game trails, deadfall (Paiute). Include a note that this is legal only in genuine emergencies.
6. **Prep & preservation:** cook thoroughly, smoke or dry strips.

**Substitutions:** no fishing kit → gorge hook carved from bone or wood, thread from clothing, a bent paperclip or earring, a bottle trap; no snare wire → cordage from Phase 3, a shoelace, guitar string, or electrical wire (urban); no pot → spit roast, rock griddle, a leaf/clay bake in coals.

**SAFETY (verbatim):**
- "Never eat a wild plant or mushroom you cannot positively identify. Do not eat wild mushrooms in a survival situation."
- "Avoid plants with milky sap, almond scent, umbrella-shaped flower clusters, or three-leaf patterns, and white or yellow berries."
- "Cook all insects, fish, and game thoroughly; avoid animals that appear sick."
- "Do not eat food if you have no water."
- "Rabbit starvation: lean meat alone is insufficient; seek fat."
- "Trapping and fishing regulations apply outside genuine life-threatening emergencies."

**Gates:** G4.1 validator · G4.2 unit tests: the "no water → no food" gate is enforced, and the plant ID node requires a positive-ID confirmation before showing edibility · G4.3 golden paths: wetland → cattail; desert → prickly pear + glochid warning; coastal → shellfish, plus a red-tide/PSP warning in the coastal node · G4.4 safety asserts (incl. mushroom rule) · G4.5 banned-token scan · G4.6 regression green · G4.P pictogram coverage 100% for this section (validator) · G4.K kid-mode gates verified for this section's danger nodes (e2e) · offline e2e still passes.

---

## PHASE 5 — SIGNALING & NAVIGATION
**Outline:**
1. Stay or go? Default to staying put when someone knows your plan, you're injured, or you're lost with no landmarks. Go only when staying is fatal or you have confirmed navigation.
2. **Signaling:** sets of 3 (fires, whistle blasts, flashes); signal mirror aiming (V-sight with your fingers); ground-to-air symbols (V = need assistance, X = need medical, arrow = direction traveled) at 3+ m with contrast; smoke (green boughs by day, bright flame by night); a phone (text uses less signal than calls; turn on airplane mode between attempts; emergency SOS/satellite); PLB/inReach.
3. **Navigation:** map + compass basics; no-compass methods (shadow stick, watch method, North Star / Southern Cross, moss is unreliable); handrails (rivers, ridges, trails); follow drainages downhill in most regions (not in canyons or jungle cliffs); leave trail markers.

**Substitutions:** no mirror → CD, phone screen, foil, a polished can lid; no whistle → banging metal, a grass-blade whistle; no compass → a magnetized needle floating on a leaf in water, shadow stick; no smoke materials → a tire or rubber (urban/vehicle) for black smoke over snow.

**SAFETY (verbatim):**
- "If someone knows your route and return time, staying put is usually safest."
- "Do not descend unknown cliffs or follow drainages into canyons or waterfalls."
- "Mark your direction of travel if you leave a location."
- "Conserve phone battery: lower brightness, airplane mode between check-ins."

**Gates:** G5.1 validator · G5.2 unit tests: the stay/go decision function, a shadow-stick direction calculation, sun/watch method for both hemispheres · G5.3 golden paths: injured + someone knows plan → stay + signal; snow field → high-contrast symbols + black smoke; no gear → shadow stick · G5.4 safety asserts · G5.5 banned-token scan · G5.6 regression green · G5.P pictogram coverage 100% for this section (validator) · G5.K kid-mode gates verified for this section's danger nodes (e2e) · offline e2e still passes.

---

## PHASE 6 — FIRST AID
**Outline:** (Every node carries the standing header "Call emergency services / activate SOS if any possible.")
1. **Scene safety → primary survey (MARCH/ABC):** Massive bleeding, Airway, Respiration, Circulation, Hypothermia/Head.
2. **Bleeding:** direct pressure → wound packing → tourniquet (5–8 cm above the wound, not on a joint, note the time).
3. **Hypothermia** (mild/moderate/severe: shivering, the "umbles"), with field rewarming. **Heat exhaustion vs. heat stroke.**
4. **Frostbite**, **burns**, **fractures/sprains** (splinting with improvised materials), **wound cleaning and closure** (irrigate; don't close dirty or bite wounds), **blisters**, **bites/stings** (snake, spider, scorpion, bee/anaphylaxis), **dehydration**, **shock**, **CPR basics**.

**Substitutions:** no tourniquet → a cravat or belt with a stick windlass (never wire or cord); no splint → trekking pole, stick, rolled sleeping pad, or magazine, plus padding; no bandage → clean clothing strips, a sanitary pad; no irrigation syringe → a pierced plastic bag or bottle cap using treated water; no sling → a shirt tail pinned up.

**SAFETY (verbatim):**
- "This guide is not a substitute for professional medical care; seek evacuation as soon as possible."
- "Tourniquet: place 5–8 cm above the wound, not on a joint; tighten until bleeding stops; record the time; do not loosen."
- "Snakebite: keep still, remove rings, immobilize at heart level. Do not cut, suck, ice, or apply a tourniquet."
- "Do not rub frostbite or rewarm it if it may refreeze."
- "Heat stroke (confusion, hot skin) is life-threatening: cool immediately and aggressively."
- "Handle severe hypothermia gently; rough movement can trigger cardiac arrest."
- "Do not close bite wounds or dirty wounds."

**Gates:** G6.1 validator · G6.2 unit tests: the triage ordering (massive bleeding is always first), the severity classifiers (hypothermia stages, heat exhaustion vs. stroke) · G6.3 golden paths: limb bleed + no gear → improvised tourniquet + time note; rattlesnake → do-not list shown first; heat + confusion → heat stroke path · G6.4 safety asserts plus the disclaimer header on every First Aid node · G6.5 banned-token scan · G6.6 full regression (Phases 1–5) green · G6.P pictogram coverage 100% for this section (validator) · G6.K kid-mode gates verified for this section's danger nodes (e2e) · offline e2e still passes.

---

## PHASE 7 — "I WANT" (OPEN-INTENT ROUTER)
> NOTE: Josh's spec text read "I want" with nothing after it. This was built as the default interpretation; confirm it with Josh.

**Outline:** a free-text or chip entry ("I want to get warm / find water / be found / treat a cut / eat / know where I am / get through the night"). It maps to the right section's entry node through a keyword/synonym table and the rule of 3s priority. A "What should I do first?" triage asks about injuries → exposure → water → signaling → food and routes to the most urgent item.

**Gates:** G7.1 every intent maps to an existing entry node (validator) · G7.2 unit tests for the synonym table, plus priority-ordering tests (injury + cold → First Aid first, then Fire/Shelter) · G7.3 an unknown-intent fallback goes to the triage, never a dead end · G7.4 banned-token scan · G7.5 full regression green · G7.P pictogram coverage 100% for this section (validator) · G7.K kid-mode gates verified for this section's danger nodes (e2e) · offline e2e still passes.

---

## Phase Status Report (print after every phase)
```
PHASE N — <name>: PASS | FAIL
Gates: G#.# PASS/FAIL — evidence: <file/log path or excerpt>
Tests: <passed>/<total>, coverage <x%>
Golden traversals: <list w/ trace paths>
Banned-token scan: clean | <hits>
Unfinished: <none | list of sections/phases not started or failing>
```
On a FAIL: stop expanding, print the report, and list every remaining phase as UNFINISHED.

---

## Source control and supervision (mandatory, applies to every phase)

This build is supervised by a reviewer who watches GitHub. Follow these rules exactly:

1. **Repository:** use the private GitHub repo `jmancodex/Fatwood`. If it does not exist yet, create it as **private** (e.g. `gh repo create jmancodex/Fatwood --private`). Default branch is `main`. Never make it public.
2. **Branch per phase:** do each phase on its own branch named `phase-N-<section>` (for example `phase-1-engine-fire`, `phase-2-water`). Never commit directly to `main`.
3. **Commit as you go:** meaningful, small commits with clear messages. Never commit secrets, API keys, `.env` files, or `node_modules`.
4. **One pull request per phase:** when a phase finishes (pass *or* fail), push the branch and open a PR into `main` titled `Phase N: <section> — PASS` or `Phase N: <section> — FAIL`. The PR description must contain the full per-phase status report: every gate with its evidence (paste test output, validator log, Lighthouse/axe summary, coverage numbers), sample walk-throughs, banned-word scan result, and an explicit list of what is unfinished or unverified. Attach or commit screenshots under `evidence/phase-N/`.
5. **Do not merge your own PRs.** Wait for the owner's approval before merging. If you are running unattended, stack the next phase's branch on top of the previous phase's branch and note that in the PR, but only start the next phase if the current one passed every gate.
6. **Honesty rule:** never claim a gate passed without evidence in the PR. If something could not be run (for example, Lighthouse unavailable), mark it NOT RUN with the reason; do not mark it PASS.
