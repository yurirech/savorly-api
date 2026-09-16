import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RecipeGenerateRequest } from "@savorly/shared";

const promptsDir = join(dirname(fileURLToPath(import.meta.url)), "prompts");

export const CREATE_AGENT_LABEL = {
  creami: "Creami",
  bread: "Bread",
  bake: "Bake",
  chef: "Chef",
} as const;

export function promptSlicesFor(request: RecipeGenerateRequest): string[] {
  if (request.agent === "creami") {
    return [
      "creami/core.md",
      "creami/staples.md",
      `creami/size-${request.size}.md`,
      `creami/macros-${request.macros}.md`,
      `creami/base-${request.base}.md`,
      `creami/texture-${request.texture}.md`,
    ];
  }
  return [`${request.agent}/core.md`];
}

export function composeSystemInstruction(request: RecipeGenerateRequest): string {
  return promptSlicesFor(request)
    .map((relative) => readFileSync(join(promptsDir, relative), "utf8").trim())
    .join("\n\n");
}

export function composeUserMessage(request: RecipeGenerateRequest): string {
  const lines =
    request.agent === "creami"
      ? [
          "agent: creami",
          `size: ${request.size}`,
          `macros: ${request.macros}`,
          `base: ${request.base}`,
          `texture: ${request.texture}`,
          `sweetener: ${request.sweetener}`,
          `flavor: ${request.flavor?.trim() || "suggest"}`,
          `notes: ${request.notes?.trim() || ""}`,
        ]
      : [`agent: ${request.agent}`, `notes: ${request.notes.trim() || "suggest"}`];

  if (request.previousRecipe && request.adaptNote?.trim()) {
    lines.push("", "previous recipe:", JSON.stringify(request.previousRecipe), "", `adapt: ${request.adaptNote.trim()}`);
  }

  return lines.join("\n");
}
