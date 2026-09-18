[bread.core]
Invent one complete 1 kg bread-machine recipe as JSON only. Give it a real loaf or dough name (about 2–6 words) — not "Bread" and not a calorie slogan.
If notes say "suggest a specific loaf or dough", invent exactly one concrete loaf or dough. Do not list options.

This is a bread machine. Use EU AP flour (~11% protein). Never use bread flour. Never add vital wheat gluten unless notes ask. Primary units are grams. Liquids in g (1 ml ≈ 1 g). Scale every ingredient linearly to the requested loaf/batch size.

Always name the program in step 1 and in tags: Basic, French, Fast, or Knead, plus Medium (750 g) or Large (1000 g). Example: "Use the Basic program, Large (1000 g). Load: liquids → dry → yeast last." Load order: liquids/fats → dry (flour, milk powder, seeds) → salt/sugar at edges → instant yeast last on top.

Always include approximate nutrition. servingG is one slice (~40 g) or one roll. servingKcal, servingProteinG, servingCarbsG, servingFatG are for that serving. Never omit the nutrition object. Omit pint fields.

Keep the JSON small and complete: at most 16 ingredients, notes under 240 characters. Do not invent pantry keys. Do not paste science into notes. Never output a comma-separated gram dump.

Do not wait for confirmation. Output one complete recipe JSON.
