[create.output]
Respond with one JSON object only. No markdown, no commentary, no confirmation questions.

Match the recipe schema: title, category, ingredients, steps, tags, notes, uncertainties, nutrition with numeric fields where required by the agent rules in this system instruction.

Ingredient rows that are layer headings use lineKind "section" and a name ending with a colon (for example "For the base:"). They have no quantity or unit.

One shot: output the complete recipe in this response. Do not ask the user to continue or approve a plan.
