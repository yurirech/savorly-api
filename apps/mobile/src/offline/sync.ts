import type { DiaryDayResponse, NutritionProfileResponse, SavedRecipe, UserFood } from "@savorly/shared";
import { ApiRequestError, apiRequest } from "../api/client";
import { mergeRecipes, pruneRecipes, removeCachedRecipe, upsertCachedRecipe } from "../db/cache";
import {
  deleteJob,
  enqueueJob,
  listJobs,
  removeFood,
  saveCookbook,
  saveDay,
  saveFood,
  saveNutritionRecipe,
  saveProfile,
  type OutboxJob,
} from "./store";

let flushing = false;

export function isUnavailable(err: unknown): boolean {
  if (err instanceof ApiRequestError) {
    return err.code !== "unauthorized" && err.code !== "validation_error" && err.code !== "not_found";
  }
  return true;
}

export async function enqueue(method: string, path: string, body: unknown | null = null): Promise<void> {
  await enqueueJob({ method, path, body });
}

export async function flushOutbox(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const jobs = await listJobs();
    for (const job of jobs) {
      const sent = await sendJob(job);
      if (!sent) return;
    }
  } finally {
    flushing = false;
  }
}

async function sendJob(job: OutboxJob): Promise<boolean> {
  try {
    const data = await apiRequest<unknown>(job.path, {
      method: job.method,
      body: job.body == null ? undefined : JSON.stringify(job.body),
    });
    await absorb(data);
    await dropReplacedLocalId(job, data);
    await deleteJob(job.id);
    return true;
  } catch (err) {
    if (isUnavailable(err)) return false;
    await deleteJob(job.id);
    return true;
  }
}

async function dropReplacedLocalId(job: OutboxJob, data: unknown): Promise<void> {
  const sentId = job.body && typeof job.body === "object" ? (job.body as { id?: string }).id : undefined;
  if (!sentId || !data || typeof data !== "object") return;
  const received = data as { food?: { id?: string }; recipe?: { id?: string } };
  const receivedId = received.food?.id ?? received.recipe?.id;
  if (!receivedId || receivedId === sentId) return;
  if (received.food) await removeFood(sentId);
  if (received.recipe) await removeCachedRecipe(sentId);
}

async function absorb(data: unknown): Promise<void> {
  if (!data || typeof data !== "object") return;
  const body = data as {
    recipe?: SavedRecipe;
    cookbook?: { id: string; updatedAt: string };
    food?: UserFood;
    foods?: UserFood[];
    date?: string;
    meals?: DiaryDayResponse["meals"];
    profile?: NutritionProfileResponse["profile"];
    targets?: NutritionProfileResponse["targets"];
    id?: string;
    items?: unknown;
  };
  if (body.recipe?.id) await upsertCachedRecipe(body.recipe);
  if (body.cookbook?.id && "recipeCount" in body.cookbook) await saveCookbook(body.cookbook as never);
  if (body.food?.id) await saveFood(body.food);
  if (body.date && Array.isArray(body.meals)) await saveDay(body as DiaryDayResponse);
  if ("profile" in body && "targets" in body && !body.date) await saveProfile(body as NutritionProfileResponse);
  if (body.id && Array.isArray(body.items)) await saveNutritionRecipe(body as { id: string });
}

export async function cacheRecipeList(recipes: SavedRecipe[], full: boolean): Promise<void> {
  await mergeRecipes(recipes);
  if (full) {
    const pending = await listJobs();
    const pendingIds = new Set(
      pending.flatMap((job) => {
        const body = job.body as { id?: string } | null;
        return body?.id ? [body.id] : [];
      }),
    );
    await pruneRecipes([...recipes.map((recipe) => recipe.id), ...pendingIds]);
  }
}
