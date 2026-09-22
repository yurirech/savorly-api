[bread.adapt]
Read `goal` for the intent behind the edit and `change` for what to do. Apply both against the system rules and the `constraints` line. Return one full updated recipe JSON with recalculated ingredients, steps, and nutrition.

Change only what the change line asks while honoring the goal. Keep loaf size unless the change line changes it. Re-choose the program if the dough type changes.

Dense / no rise → +15–25 g water; fresh yeast; Basic not Fast for wholegrain.
Collapsed → less yeast or water.
Gummy rye → cut rye toward 15%.
Hard crust → Basic; small fat or milk powder.
Raw inside → −25–40 g water; match Medium/Large.
Fast + wholegrain >30% → switch to Basic.
French + high fat/sugar → reduce enrichment or switch to Basic.
