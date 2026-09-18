# Recipe Adapt

Source file you can edit. Gemini does not receive this whole document on each Create tap — only distilled `prompts/bake/` slices. Symptom tables apply to muffins and cupcakes as well as cakes.

> **Reference document for Cake GEM.** Behavioral rules live in `bake-instructions.md`.

Diagnose, fix, and lighten **existing** recipes. Also supplies healthier rules for **new** cakes (via cake-creator). Grounded in **baking-science.md**.

## When_to_use

| Request | Use |
|---------|-----|
| Paste recipe + symptom (*dense*, *thick batter*) | This file — symptom diagnosis |
| Adapt existing recipe healthier / sweetener subs / applesauce | This file — preset + substitutes |
| **New** flavor + healthier | cake-creator.md + **Preset_make_it_healthier** below |
| New flavor only | cake-creator.md |

**Output:** Diagnosis (if problem reported) + full adapted recipe in grams + nutrition per 100g + adaptation rationale.

---

## Adapt_workflow

1. **Ingest** — family, mixing, sugar:flour ratio, fat, leavening, liquids, add-ins
2. **Classify** — symptom / healthier / named substitute
3. **Diagnose** — map to baking-science symptom table
4. **Prescribe** — every change: what, why, compensation
5. **Deliver** — full recipe + rationale

Fix **structure first** (rise, density), then lightening.

---

## Symptom_diagnosis

| User says | Likely cause | First fixes |
|-----------|--------------|-------------|
| **Batter too thick** | Over-flour; under-liquid; cold ingredients | +15–30 g liquid; room-temp ingredients |
| **Batter too thin** | Excess liquid/purée; broken emulsion | −liquid; +15–30 g flour |
| **Very dense** | Under-mixed; expired leavening; oven cool; set before expansion | Cream/whip longer; fresh powder; verify temp |
| **Tough / rubbery** | Over-mixed gluten; AP not cake flour | Mix just combined; cake flour |
| **Dry crumb** | Over-baked; too much flour; low fat/sugar | Shorter bake; +fat or purée |
| **Collapsed center** | Excess leavening/sugar; weak structure | −¼ tsp powder; +egg white or flour |
| **Sunken top** | Fruit sinking; underbaked | Flour-dust fruit; bake longer |
| **Curdled batter** | Cold eggs in butter | Room-temp eggs; slow liquids |
| **Too sweet** | High-ratio | Reduce sugar; boost acid/zest |
| **Greasy** | Too much oil; poor emulsion | Reduce oil; ensure creaming |

### Batter_feel_targets

| Type | Feel |
|------|------|
| Creamed layer | Thick pourable; mounds on spatula |
| Chiffon | Pourable yolk batter + stiff white peaks |
| Oil / wet blend | Smooth, heavy cream to thin yogurt |
| Pound | Very thick; slow drop |

---

## Preset_make_it_healthier

Default when user wants healthier (new or existing). **Not stevia-only** — use what the user names or their usual toolkit.

1. **Sugar −25–30%**; replace half of removed sugar with a **low-cal sweetener** (pick one or blend):
   - **Stevia** (per label) + **30–45 g applesauce** for bulk, OR
   - **Erythritol / allulose / monk fruit blend** 1:1 for bulk + sweetness (250 g ≈ 200 g sugar sweetness), OR
   - **Mix** — e.g. erythritol bulk + stevia to taste
2. **Fat −25%** → equal **unsweetened applesauce**
3. **−30 g** other liquid when adding applesauce
4. **+1 egg white** folded (creaming/oil batters; skip if chiffon)
5. Fresh **double-acting powder**; **−1 g** if sugar dropped >30%
6. Boost zest/extract/spice **10–20%**
7. Warn: slightly denser, paler crust if stevia-heavy; allulose browns faster — lower oven 10 °C; erythritol can feel dry — +15–30 g liquid

---

## Healthier_principles

1. One major variable per iteration when troubleshooting
2. Never strip sugar + fat + eggs together without compensation
3. Partial swaps over 100% replacement
4. High-intensity sweeteners (stevia, monk fruit extract) alone cannot replace sugar bulk or browning — pair with erythritol, allulose, or applesauce
5. Re-check leavening after acid/liquid changes

### Sugar_reduction

| Goal | Approach |
|------|----------|
| −10–25% | Direct reduction; +15–30 g liquid if thick; pinch salt |
| −25–40% | + bulk (stevia/applesauce); +1 egg white |
| −40%+ | Toward low-ratio; more egg whites; less browning |

Do not drop below ~70% sugar:flour in high-ratio layers without chiffon or egg-white foam.

### Fat_reduction

| Goal | Approach |
|------|----------|
| −15–25% | Equal applesauce/yogurt; −75% purée weight from other liquids |
| −25–50% | Half fat swap; +15 g flour or +1 egg white if dense |
| Minimal fat | Chiffon/foam architecture only |

Creaming cakes: >50% butter → applesauce without egg white = denser crumb.

---

## Substitute_master_table

| Instead of | Substitute | Ratio | Must adjust |
|------------|------------|-------|-------------|
| Sugar 200 g | Applesauce | Up to 50% sugar replaced | −60 g other liquid per 120 g sauce |
| Sugar | Stevia extract | ½–1 tsp ≈ 200 g sugar (label) | +80–100 g applesauce or 60–80 g erythritol bulk |
| Sugar | Stevia baking blend | Package 1:1 | Check label; reduce liquid slightly |
| Sugar | Erythritol / allulose | 250 g ≈ 200 g sweetness | +15–30 g liquid if dry; allulose: lower oven 10 °C |
| Butter / oil | Applesauce | 1:1 up to 50% fat; oil cake max 75% | −45 g liquid per 120 g sauce; +1 egg white optional |
| Butter | Greek yogurt | 50% butter + 50% yogurt | Cream butter first |
| Oil | Greek yogurt | 75% yogurt per oil (or half/half) | Splash milk if thick |
| Sour cream | Greek yogurt | 1:1 | Nearly seamless |
| Whole egg | 2 egg whites | 2 whites ≈ 1 egg | Keep 1 yolk or +15 g yogurt for emulsion |
| Milk | Almond milk | 1:1 | Thinner — less liquid overall |
| Buttermilk | 180 g milk + 60 g yogurt + 1 g lemon | per 240 g | Keep acid for soda |
| Frosting sugar | Stevia blend | 50–75% replacement | Easiest calorie cut |

**Stevia rule:** No volume, no browning. Always add bulk + structure (egg white or keep 25–50% real sugar).

---

## Substitute_stevia

| Sugar removed | Stevia (approx.) | Bulk | Structure |
|---------------|------------------|------|-----------|
| 100 g | Pinch–½ tsp extract | 80 g applesauce OR 60 g erythritol | Keep 25–50% sugar OR +1 egg white |
| 200 g | ½–1 tsp extract | Applesauce + optional erythritol | Chiffon or +2 egg whites |

Never stevia-only in high-ratio layer cake expecting full height.

---

## Substitute_applesauce

| Replace | With | Also adjust |
|---------|------|-------------|
| 60 g butter/oil | 60 g applesauce | −45 g milk/juice |
| 50% recipe fat | 50% sauce + 50% fat | −liquids; +1 egg white optional |
| 75% oil (oil cake max) | 75% sauce + 25% oil | Fresh powder; don't overmix |

Adds water/fiber, not fat aeration — can weaken cell walls if overused.

---

## Leavening_when_substituting

| Changed | Check |
|---------|-------|
| Added acid (yogurt, lemon, honey) | Soda + acid or less powder |
| Removed acid | Powder only |
| Cut sugar >30% | −1 g powder |
| Added applesauce | Fresh powder; don't overmix |
| Erythritol | May need slightly more lift |
| Allulose | Lower oven — browns fast |

---

## Substitution_by_bake_type

| Type | Safe sugar cut | Safe fat cut | Avoid |
|------|----------------|--------------|-------|
| Layer cake | 25–40% + bulk | 25–50% partial | Stevia-only; 100% applesauce in creamed butter |
| Chiffon | 20–30% | Already low | Remove egg whites |
| Muffins | 50% + applesauce | 50–100% oil→sauce | Stale leavening |
| Pound cake | 10–20% | Minimal | Aggressive stevia |

---

## Combination_stacks

**Stack A — Moderate:** sugar −25%; half → stevia blend; fat −25% → applesauce; −30 g liquid; +1 egg white.

**Stack B — User style (low-cal sweetener + applesauce):** 50% sugar → user's sweetener (stevia, erythritol, allulose, or blend) + 30–45 g applesauce per 200 g removed; 50% fat → applesauce; −30–60 g milk/juice; +15% zest/extract.

**Stack C — Max lightening:** 75% sugar → allulose/monk fruit blend; keep 25% real sugar; half fat → applesauce; chiffon-style white fold; lower oven if allulose.

**Stack D — Frosting-first:** crumb sugar −15% only; frosting 50–75% stevia blend; light cream cheese.

---

## Sweetener_output_line

- **Default:** show the neutral line `Sweetener — X g sugar equivalent` on the ingredient list — state the sugar-equivalent target, not a specific product at a specific raw weight (e.g. not "Erythritol — 25 g", not "Allulose — 45 g"). The user shouldn't be assumed to own whichever bulk sweetener a table happens to name.
- **Baking exception:** name a specific sweetener **only when its distinct property changes the bake** — e.g. allulose browns faster (lower oven ~10 °C), erythritol can feel dry (+15–30 g liquid), stevia lacks bulk/browning. In that case, name it, **state the reason in one line**, and still lead with the sugar-equivalent number.
- Specific products stay valid **science-text references** (substitute tables, leavening notes) — this rule only governs the final ingredient line.

## Output_format

```markdown
# [Recipe name] — Adapted

## Diagnosis (if problem reported)
- Reported issue / likely cause / evidence

## Servings / Times

## Ingredients (grams)
- Name — XXX g

## Method

## Estimated nutrition
*Per 100 g of finished cake.*

| | Per 100 g |
|---|-----------|
| **Calories** | XXX kcal |
| **Protein** | X.X g |
| **Carbs** | X.X g |
| **Fat** | X.X g |

## Notes

## Adaptation rationale
- Changes, science, trade-offs, compensations
```

---

## Quality_checklist

- [ ] Diagnosis matches user's words
- [ ] Every swap has compensation
- [ ] High-intensity sweetener (stevia/monk fruit) includes bulk + structure
- [ ] Applesauce includes liquid reduction
- [ ] Grams throughout; nutrition per 100 g
- [ ] Realistic trade-offs stated
