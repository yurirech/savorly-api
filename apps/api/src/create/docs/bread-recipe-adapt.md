# Recipe Adapt — Bread

Source file you can edit. Gemini does not receive this whole document on each Create tap — only distilled `prompts/bread/` slices.

> **Reference document for Bread Machine GEM.** Behavioral rules live in `bread-instructions.md`.

Diagnose, fix, and lighten **existing** bread machine recipes. Also supplies healthier rules for **new** loaves (via bread-creator). Grounded in **bread-science.md**.

---

## When_to_use

| Request | Use |
|---------|-----|
| Paste recipe + symptom (*dense*, *collapsed*, *won't rise*) | Symptom diagnosis below |
| Adapt existing recipe healthier | Preset_make_it_healthier |
| Wrong program for dough type | Program swap + yeast/hydration adjustment |
| **New** loaf + healthier | bread-creator.md + Preset_make_it_healthier |
| New loaf only | bread-creator.md |

**Output:** Diagnosis (if problem reported) + full adapted recipe in grams + machine steps + nutrition per 100 g + rationale.

---

## Adapt_workflow

1. **Ingest** — flour blend, hydration %, yeast, salt, sugar, fat, program, loaf size
2. **Classify** — symptom / healthier / program issue
3. **Diagnose** — map to symptom table or bread-science
4. **Prescribe** — every change: what, why, compensation
5. **Deliver** — full recipe + machine instructions + rationale

Fix **rise and structure first**, then lightening.

---

## Symptom_diagnosis

| User says | Likely cause | First fixes |
|-----------|--------------|-------------|
| **Dense / tight crumb** | Low hydration; dead yeast; heavy wholegrain on Fast | +15–25 g water; fresh yeast; switch to Basic |
| **Won't rise** | Expired yeast; water too hot; excess salt | New yeast; ~35 °C water; verify salt ~2% |
| **Collapsed / sunken** | Over-proofed; over-liquid; over-yeasted | −10–15% yeast; −20–30 g water |
| **Mushroom top** | Too much yeast or sugar | −10% yeast; −5–10 g sugar |
| **Gummy layer** | Under-baked; high sugar | Reduce sugar; ensure correct loaf size setting |
| **Too dry** | Over-baked; lean dough | +milk powder or small fat increase |
| **Thick / hard crust** | French program; no enrichment | Basic program; +small fat or milk powder |
| **Raw inside** | Too much water; size mismatch | −25–40 g water; match Medium/Large setting |
| **Salty / yeasty taste** | Salt or yeast too high | Reduce salt toward 1.8%; reduce yeast |
| **Holes / tunnels** | Over-yeasted; poor load order | Less yeast; yeast on top, salt in corner |

### EU_AP_note

User AP is **11 g protein / 100 g** — adequate strength. Dense loaf → try **+15–25 g water** before blaming flour or suggesting gluten.

---

## Machine_fixes

| Issue | Fix |
|-------|-----|
| Fast + wholegrain >30% | Switch to **Basic**; reduce wholegrain or add water |
| French + high fat/sugar | Reduce fat/sugar or switch to **Basic** |
| Fast without yeast boost | Increase yeast **25–50%** |
| Wrong loaf size selected | Match recipe scale to Medium (~750 g) or Large (~1000 g) |
| Ingredients wrong order | Re-state load order: liquids → dry → salt/sugar edges → yeast top |
| Expired yeast | Replace; do not compensate with more sugar |

---

## Preset_make_it_healthier

Default when user wants healthier (new or existing). **Not stevia-only** for sweet doughs.

1. Replace **25–40%** AP with **whole wheat**; add **+3–5% hydration** (water)
2. **Sugar −25–30%** in sweet/enriched doughs; partial swap with **erythritol/allulose** if user wants
3. **Fat −25%** (butter/oil)
4. Boost **seeds** or **milk powder** for flavor when reducing sugar/fat
5. Use **Basic** program — not Fast — for heavier wholegrain doughs
6. **One variable per iteration** when troubleshooting

**Warn:** Denser crumb, slower rise, less soft crust — expected trade-offs.

---

## Healthier_principles

1. Structure first (rise, hydration), then lightening
2. Never cut sugar + fat + yeast together without compensation
3. Partial whole wheat swap over 100% replacement in one step
4. Fast program unreliable for healthier wholegrain doughs

### Sweetener_output_line

- **In the final recipe output, show the neutral line `Sweetener — X g sugar equivalent`** — state the sugar-equivalent target, not a specific product at a specific raw weight (e.g. not "Erythritol — 25 g", not "Allulose — 45 g").
- The user shouldn't be assumed to own whichever bulk sweetener a table happens to name; the sugar-equivalent number lets them use whatever they have.
- Specific products (erythritol, allulose) remain valid **science-text references** — just not the default label on the ingredient line. Note: sweet/enriched doughs still need *some* real sugar to feed the yeast, so keep that portion as actual sugar.

---

## Substitute_table

| Instead of | Substitute | Notes |
|------------|------------|-------|
| AP flour (partial) | Whole wheat 25–40% | +3–5% water; Basic program |
| AP flour (partial) | Rye up to 15–20% | Sticky; reduce if gummy |
| Water | Milk (partial) | Softer crumb; count as liquid |
| Butter | Oil | 1:1 by weight |
| Sugar | Erythritol / allulose | Partial only in sweet doughs; yeast still needs some sugar |
| Sugar | Reduce only | OK in non-sweet loaves |
| Instant yeast (Basic) | Same (Fast) | ×1.25–1.5 for Fast program |
| Milk powder | Omit | Slightly less rich; OK in French |

---

## Output_format_adapted

1. **Diagnosis** (if symptom reported) — 2–4 sentences
2. **Ingredients** — grams; baker's % optional
3. **Machine instructions** — program, loaf size, load order
4. **Estimated nutrition** — per 100 g
5. **Adaptation rationale** — what changed and why

---

## Example_adapt_flow

**User:** `adapt — loaf dense and didn't rise much: [paste recipe with Fast program and 35% whole wheat]`

**Response:** Diagnose Fast + high wholegrain → switch Basic, +20 g water, verify yeast freshness → full updated recipe.
