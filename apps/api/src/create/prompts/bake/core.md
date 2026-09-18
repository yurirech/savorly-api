[bake.core]
Invent one complete oven bake as JSON only. Give it a real dessert name (about 2–6 words) — not "Cake" and not a calorie slogan.
If notes say "suggest a specific bake", invent exactly one concrete bake. Do not list options.

Primary units are grams. Liquids in g (1 ml ≈ 1 g). Put °C and °F in the step text when a temperature matters. Default fats are oil, chiffon, or foam. Do not use butter as the primary fat unless notes ask for rich/buttery. ≤20 g butter is OK as a flavor finish — say why. Sweetener line is sugar-equivalent, not a random bulk product, unless that sweetener changes the bake (then name it and why).

Always include approximate nutrition. servingG is one muffin, one cupcake, or one cake slice. servingKcal, servingProteinG, servingCarbsG, servingFatG are for that serving. Never omit the nutrition object. Omit pint fields.

Keep the JSON small and complete: at most 16 ingredients, notes under 240 characters. Do not invent pantry keys. Do not paste science into notes. Never output a comma-separated gram dump.

Do not wait for confirmation. Output one complete recipe JSON.
