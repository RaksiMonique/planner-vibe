import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpenTextIcon, PlusIcon, SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { RecipeCard } from '@/features/meals/components/recipe-card';
import { RecipeFormDialog } from '@/features/meals/components/recipe-form-dialog';
import { listRecipeTags, listRecipes } from '@/features/meals/queries';
import { requireUser } from '@/lib/auth';
import { signedImageUrls } from '@/lib/storage';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Recipes' };
export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

export default async function RecipesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const params = await searchParams;
  const q = str(params.q)?.trim() || undefined;
  const tag = str(params.tag) || undefined;
  const favouriteOnly = params.favourite === '1';

  const [recipes, tags] = await Promise.all([
    listRecipes(user.id, { q, tag, favouriteOnly }),
    listRecipeTags(user.id),
  ]);
  const images: Record<string, string> = await signedImageUrls(
    recipes.map((r) => r.imagePath)
  ).catch(() => ({}));
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q, tag, favourite: favouriteOnly ? '1' : undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const qs = p.toString();
    return qs ? `/meals/recipes?${qs}` : '/meals/recipes';
  };
  const chip = (active: boolean) =>
    cn(
      'inline-flex items-center rounded-full border px-2.5 py-1 text-xs transition-colors',
      active ? 'border-primary bg-secondary text-secondary-foreground' : 'bg-card hover:bg-muted'
    );

  return (
    <>
      <PageHeader
        eyebrow="Lifestyle"
        title="Recipes"
        description="Ingredients, steps and servings. Plan them into the week and shop from them."
        actions={
          <>
            <Link href="/meals" className={cn(chip(false), 'py-1.5')}>
              Meal planner
            </Link>
            <RecipeFormDialog
              trigger={
                <>
                  <PlusIcon data-icon="inline-start" />
                  New recipe
                </>
              }
            />
          </>
        }
      />
      <form className="mb-3 flex max-w-md items-center gap-2" action="/meals/recipes">
        {tag && <input type="hidden" name="tag" value={tag} />}
        <Input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search recipes"
          aria-label="Search recipes"
        />
        <button type="submit" className={cn(chip(false), 'py-1.5')} aria-label="Search">
          <SearchIcon className="size-3.5" />
        </button>
      </form>
      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link href={href({ tag: undefined })} className={chip(!tag)}>
          All tags
        </Link>
        {tags.map((t) => (
          <Link key={t} href={href({ tag: t === tag ? undefined : t })} className={chip(t === tag)}>
            {t}
          </Link>
        ))}
        <Link
          href={href({ favourite: favouriteOnly ? undefined : '1' })}
          className={chip(favouriteOnly)}
        >
          Favourites
        </Link>
      </div>
      {recipes.length === 0 ? (
        <EmptyState
          icon={BookOpenTextIcon}
          title={q || tag || favouriteOnly ? 'No recipes match' : 'No recipes yet'}
          description="Save what you cook, with ingredients, and the planner and grocery list build on it."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              imageUrl={r.imagePath ? (images[r.imagePath] ?? null) : null}
            />
          ))}
        </div>
      )}
    </>
  );
}
