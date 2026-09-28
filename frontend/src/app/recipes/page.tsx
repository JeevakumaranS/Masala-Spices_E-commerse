import type { Metadata } from "next";
import { getRecipes } from "@/lib/api";
import { RecipeBrowser } from "./RecipeBrowser";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Recipes",
  description:
    "Cook with Masala House blends — weeknight-friendly Indian recipes measured in spoons, filtered by cuisine, dish type and how long you've got.",
};

export default async function RecipesPage() {
  const recipes = await getRecipes();

  return <RecipeBrowser recipes={recipes} />;
}
