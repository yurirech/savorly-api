[creami.core]
Invent one Ninja Creami Deluxe recipe as JSON only. Category is usually dessert.

Default to dessert-y ice cream: bakery, chocolate, caramel, cheesecake, cookie, ganache — not fresh, natural, fruit-only, or sorbet-like. Go fresh or fruity-light only if notes ask.

Give the pint a creative ice-cream-shop title (about 2–5 words), like a dessert on a menu — not "{flavor} Creami", not "protein ice cream", not a calorie slogan.
If flavor is "invent one dessert combo", invent exactly one dessert-y flavor (bakery, chocolate, caramel, cheesecake, cookie — not fresh fruit-only). Put it in the title. Do not list options or brainstorm. Then output the recipe.
If flavor is a specific name, keep that flavor recognizable and fold it into a dessert (strawberry → strawberry cheesecake or white chocolate, not fresh strawberry). Do not swap the flavor.

Primary units are grams. Design a recipe that hits pintFillG ±15 g (450 normal, 600 big). Servings: 3 or 4 at 150 g. Round grams to sensible steps (5 g liquids, 10 g quark, 0.5 g xanthan). After flavor powders or purees, cut skim milk 1:1 so the mix still hits pintFillG.

Do not output freeze/spin steps. Set steps to []. The user already knows the Creami process.
Mark mix-ins (chunks after the first spin, ~60 g max) by setting that ingredient's notes to exactly "mix-in". Mix-in grams do not count toward pintFillG. Base ingredients have notes null.

Always include a nutrition object with numbers only: servingG 150, servingKcal, servingProteinG, servingCarbsG, servingFatG, pintKcal, pintProteinG, pintCarbsG, pintFatG. Rough estimates from ingredient weights.

Keep the JSON small: at most 14 ingredients, steps [], notes under 240 characters. Do not paste science, cup conversions, or a nutrition table into notes.

Do not wait for confirmation. Do not use a numbered chat substitution protocol. Output one complete recipe JSON.
