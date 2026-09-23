import { describe, expect, it } from "vitest";
import { nevoSearchRelevanceTier, rankNevoSearchHits, type NevoSearchRow } from "./nevoSearchRank";

function row(partial: Partial<NevoSearchRow> & Pick<NevoSearchRow, "nevoCode" | "nameNl">): NevoSearchRow {
  return {
    nameEn: "",
    foodGroupNl: "Melk en melkproducten",
    ...partial,
  };
}

describe("nevoSearchRelevanceTier", () => {
  it("prefers name prefix over contains-only matches", () => {
    expect(nevoSearchRelevanceTier(row({ nevoCode: 1, nameNl: "Melk halfvolle" }), "Melk")).toBe(0);
    expect(nevoSearchRelevanceTier(row({ nevoCode: 2, nameNl: "Karnemelk" }), "Melk")).toBe(1);
  });

  it("does not treat food-group-only text as a name match", () => {
    expect(
      nevoSearchRelevanceTier(
        row({ nevoCode: 3, nameNl: "Vla appel", foodGroupNl: "Melk en melkproducten" }),
        "Melk",
      ),
    ).toBe(2);
  });
});

describe("rankNevoSearchHits", () => {
  it("ranks Melk halfvolle above unrelated dairy names that only matched via group before", () => {
    const hits = rankNevoSearchHits(
      [
        row({ nevoCode: 10, nameNl: "Vla appel" }),
        row({ nevoCode: 11, nameNl: "Yoghurt aardbei" }),
        row({ nevoCode: 286, nameNl: "Melk halfvolle", nameEn: "Milk semi-skimmed" }),
        row({ nevoCode: 12, nameNl: "Karnemelk" }),
      ],
      "Melk",
      20,
    );

    expect(hits[0]?.nameNl).toBe("Melk halfvolle");
    expect(hits.some((hit) => hit.nameNl === "Karnemelk")).toBe(true);
    expect(hits.some((hit) => hit.nameNl === "Vla appel")).toBe(false);
    expect(hits.some((hit) => hit.nameNl === "Yoghurt aardbei")).toBe(false);
  });

  it("ranks English milk names first for milk", () => {
    const hits = rankNevoSearchHits(
      [
        row({ nevoCode: 1, nameNl: "Haverdrank", nameEn: "Oat drink" }),
        row({ nevoCode: 2, nameNl: "Melk halfvolle", nameEn: "Milk semi-skimmed" }),
        row({ nevoCode: 3, nameNl: "Yoghurt naturel", nameEn: "Yoghurt plain" }),
      ],
      "milk",
      10,
    );

    expect(hits[0]?.nameEn).toBe("Milk semi-skimmed");
  });
});
