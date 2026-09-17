# Recipe Adapt & Substitution — Creami

> **Reference document for Geami Creami GEM.** Behavioral rules live in `gem-instructions.md`. Source file you can edit. Gemini does not receive this whole document on each Create tap.

Canonical guide for **numbered substitutions**, **symptom fixes**, and **sweetener swaps**. Geami uses this when user replies with an ingredient number or asks to adapt/fix a pint.

---

## When_to_use

| Situation | Action |
|-----------|--------|
| User replies **ingredient number** from last recipe | Offer numbered substitutes for that item only |
| User picks **substitute number** | Output swapped recipe — ingredients + instructions only |
| User pastes recipe + symptom (icy, crumbly, gummy) | Diagnose → reformulate or post-spin fix |
| User wants pantry swap without full symptom | Substitution protocol + smart liquid/dry adjustment |

---

## Substitution_protocol

1. **Numbered ingredient list required** — every full Geami recipe numbers ingredients
2. User replies with **one number** (e.g. `2`) → respond with **numbered substitute options** for that ingredient only
3. User picks substitute number → **swap** with smart adjustments (not flat 1:1 when water/fat/solids differ)
4. **Updated recipe output:** **ingredients + instructions only** — no Selection Summary, tips, or nutrition unless user asks

### Adjustment_rules

| Swap type | Adjust |
|-----------|--------|
| Higher-fat milk/cream for skim | Reduce other fat; may reduce xanthan slightly |
| Whey for quark | +liquid (milk) if quark was bulk; may need +1–2 g milk powder |
| Quark for whey | −liquid; richer body, may reduce xanthan |
| Erythritol for sugar | +solids (milk powder) or +fat if icy; note equivalent |
| Sugar for erythritol | −slight liquid if needed; richer freeze |
| Condensed milk in | Reduce other sweetener + milk proportionally |
| Different whey brand | Check thickeners; reduce xanthan if powder has guar/carrageenan |

Always keep pint total near **450 g** or **600 g** after adjustments.

---

## Symptom_diagnosis

| Symptom | Likely cause | First fix |
|---------|--------------|-----------|
| **Icy** | Low solids/fat, erythritol-heavy, under-fortified lean base | +10–20 g milk powder or +30 g quark; +0.5 g xanthan max; ensure Lite + re-spin |
| **Crumbly / powdery** | Low overrun, dry protein pint | Re-spin → 15–30 g milk splash → re-spin; try Ice Cream program next time |
| **Powdery** | Under-blended whey/xanthan | Blend 45 s; premix dry; rest 5 min before freeze |
| **Gummy** | Too much xanthan or thickened whey | Cut xanthan 25–50%; plain whey next batch |
| **Bland** | Cold + low sugar/fat | +sweetener (show equivalent); pinch salt; +extract |
| **Melts too fast** | High FPD, too much alcohol/splash | Less added liquid; +milk powder; longer freeze |

---

## Creami_fixes_post_spin

| Fix | When |
|-----|------|
| **Re-spin** | Crumbly, powdery, not creamy enough (first try) |
| **15–30 g milk splash** + re-spin | Still crumbly after first re-spin |
| **Program switch** (next batch) | Lite failed on moderate fat → Ice Cream |
| **Reduce xanthan** (next batch) | Gummy, stretchy |
| **Better plain whey** (next batch) | Protein clumps, chalky |
| **Mix-in program** | Add chunks after successful first spin — not before |

---

## Substitute_master_table

### Milk_and_cream

| Instead of | Options | Notes |
|------------|---------|-------|
| Skim milk | Ultra-filtered skim, 1%, whole milk | Whole: reduce other fat in lean tier |
| Whole milk | Skim + 10–20 g cream | Control fat precisely |
| Cream | Half-and-half + milk powder | Lower fat indulgent |

### Quark_and_yogurt

| Instead of | Options | Notes |
|------------|---------|-------|
| 0% quark | 0% Greek yogurt, skyr | Similar protein; adjust tang |
| Full-fat quark | 2–5% Greek yogurt | Match fat tier |
| Quark (bulk) | Whey + extra milk | Less body — add milk powder |

### Whey_protein

| Instead of | Options | Notes |
|------------|---------|-------|
| Vanilla whey | Plain whey + vanilla extract | Control sweetness |
| Flavored whey | Different brand same flavor | **Read label** for thickeners |
| Whey | Casein blend, milk powder + extract | Slower hydrate; blend longer |

### Sweeteners

Show **(≈ X g sugar equivalent)** for all non-sugar.

| Sweetener | Sugar equivalent rule | Notes |
|-----------|----------------------|-------|
| Erythritol | ~1:1 by weight | Cooling effect; can feel icy if pint weak |
| Allulose | ~0.7:1 sweetness vs sugar | Good bulk, softer set |
| Monk fruit blend | Follow blend label | Usually paired with erythritol |
| Stevia drops / powder | Label conversion | Always add bulk (erythritol/allulose) |
| Sucrose | Baseline | Indulgent default; **Lean OK up to 15 g** (normal pint) or **20 g** (big pint) |

### Other_pantry

| Instead of | Options | Notes |
|------------|---------|-------|
| Condensed milk | Milk powder + sweetener + splash milk | Match sweetness equivalent |
| Cocoa | Cacao, dark chocolate melted | Fat from chocolate counts |
| Flavor powder | Extract, fruit purée (strain) | Purée adds water — compensate solids |
| Xanthan | None (reduce only) | Do not swap guar without testing; prefer dose change |

---

## Core_pantry

Milk, quark (0% or full-fat), vanilla/flavored whey, flavor powders (strawberry, cookie, vanilla, salted caramel), cocoa, xanthan gum, milk powder, chocolate sprinkles, condensed milk, sugar and substitutes, chocolates (standard, white, 70%).

**Flexibility:** User is not limited to this list. Suggest better ingredients when they improve texture or flavor for the tier.

---

## Output_format_adapted

When delivering a **substitution result** or **symptom fix recipe**:

1. **Ingredients** — numbered, all **g**; sweetener equivalents in parentheses
2. **Instructions** — mix, freeze, program, re-spin/mix-in as needed
3. Optional one-line **what changed** if symptom fix

**Nutrition** (when requested or full recreate): per **150 g serving** + **per pint total** — same table as creami-creator.md.

Do **not** include Selection Summary, Expert Tip, or Quick-Copy unless user asks for full Geami format.

---

## Example_substitution_flow

**User:** `2` (after recipe listed "2. Vanilla whey — 30 g")

**Geami:**
1. Plain whey isolate + ½ tsp vanilla extract
2. Milk powder 20 g + vanilla extract
3. Casein vanilla 30 g

**User:** `1`

**Geami:** (ingredients + instructions only, adjusted for plain whey hydration)
