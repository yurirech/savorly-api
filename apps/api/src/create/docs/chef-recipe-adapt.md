# Recipe Adapt — General

Source file you can edit. Gemini does not receive this whole document on each Create tap — only distilled `prompts/chef/` slices.

Diagnose, fix, lighten, and boost nutrition for **existing** general recipes. Also supplies presets for **new** dishes (via chef-creator).

---

## When_to_use

| Request | Use |
|---------|-----|
| Adapt note + issue (*too salty*, *greasy*, *dry*) | Symptom diagnosis |
| Style lighter | Preset_make_it_healthier |
| Style more nutritious | Preset_more_nutritious |
| Named substitute | Substitute_table |

**Output:** Diagnosis stays out of chat format — return a full adapted JSON recipe in grams + method + nutrition per 100 g.

---

## Adapt_workflow

1. **Ingest** — dish type, servings, fats, salt, sugar, protein, veg, method
2. **Classify** — symptom / healthier / more nutritious / substitute
3. **Diagnose** — map to symptom table
4. **Prescribe** — every change: what, why, compensation
5. **Deliver** — full recipe

Fix **technique and balance first**, then lightening or nutrition boosts.

---

## Symptom_diagnosis

| User says | Likely cause | First fixes |
|-----------|--------------|-------------|
| **Too salty** | Over-salted; reduced sauce | Dilute with unsalted liquid; acid + fat balance; no more salt |
| **Bland** | Under-seasoned; low acid/umami | Salt in layers; acid (lemon/vinegar); umami (parm, soy, miso) |
| **Dry** | Overcooked protein; low fat | Lower heat/shorter time; sauce; rest meat |
| **Greasy** | Too much oil; broken emulsion | Drain fat; less oil next time; stabilize sauce |
| **Soggy** | Overcrowded pan; too much liquid | Sear in batches; reduce sauce; roast hotter |
| **Curdled sauce** | Dairy boiled too hard; acid + hot cream | Temper dairy; lower heat; whisk off heat |
| **Won't thicken** | Insufficient starch/reduction | Slurry (flour/cornstarch + cold liquid); simmer reduce |
| **Too spicy** | Excess chili | Dairy or fat to mellow; acid; dilute |
| **Burnt outside, raw inside** | Heat too high | Lower heat; finish in oven; pound/thin cut |
| **Mushy vegetables** | Overcooked | Shorter cook; ice bath for green veg |

---

## Preset_make_it_healthier

Default when user wants **lighter** (new or existing). **Not stevia-only** for sweet dishes.

1. **Fat −25–30%** (oil, butter, cream) — prefer **olive oil** for finish; **Greek yogurt** for cream in sauces where sensible
2. **Sugar −25–30%** in sweet dishes; partial swap with **erythritol/allulose** — not stevia-only
3. **Fry → bake or air-fry** when reasonable (breaded items, some snacks)
4. **Reduce cheese** by 25% in heavy cheese dishes; boost herbs/spices for flavor
5. **One variable per iteration** when troubleshooting

**Warn:** Less rich mouthfeel, less crispy crust, paler bake — expected trade-offs.

---

## Preset_more_nutritious

Default when user wants **more nutritious** (new or existing). Nutritious ≠ double calories.

1. **+Protein** — legumes, chicken, fish, eggs, Greek yogurt, cottage cheese, tofu; aim meaningful portion not garnish
2. **+Vegetables** — increase volume 30–50%; fiber and micronutrients; not just parsley on top
3. **Partial whole grain** — whole wheat pasta, brown rice, whole grain flour where applicable (25–50% swap)
4. **Keep portions reasonable** — boost quality per 100 g, don't only enlarge servings
5. **Maintain flavor** — herbs, spices, acid, umami so "healthy" still tastes good
6. **One major change per iteration** when troubleshooting

**Warn:** More fiber can need extra liquid in grains; more veg can release water — adjust simmer time.

---

## Healthier_principles

1. Structure and seasoning first, then macro tweaks
2. Never strip fat + salt + umami together without compensation
3. Partial swaps over 100% replacement in one step
4. High-intensity sweeteners alone lack bulk — pair with erythritol or allulose

---

## Substitute_table

| Instead of | Substitute | Notes |
|------------|------------|-------|
| Heavy cream | Greek yogurt + splash milk | Lower heat; off heat |
| Butter (sauté) | Olive oil | Slightly different flavor |
| Sour cream | Greek yogurt | 1:1 in many dips/sauces |
| White rice | Brown rice or 50/50 | +liquid, +time |
| White pasta | Whole wheat or legume pasta | Check cook time |
| Ground beef (partial) | Lentils or mushrooms | 25–50% swap in sauces |
| Breadcrumbs | Oats or whole wheat crumbs | Binding may differ |
| Sugar (partial) | Erythritol / allulose | Sweet dishes only; not stevia-only |
| Fry | Bake / air-fry | Spray oil; flip mid-cook |
