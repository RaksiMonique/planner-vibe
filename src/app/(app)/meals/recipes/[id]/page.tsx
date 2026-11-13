import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ClockIcon, HeartIcon, PencilIcon, Trash2Icon, UsersIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { ConfirmActionButton } from '@/features/life-segments/components/confirm-action-button';
import { deleteRecipeAction, toggleRecipeFavouriteAction } from '@/features/meals/actions';
import { RecipeFormDialog } from '@/features/meals/components/recipe-form-dialog';
import { ServingsScaler } from '@/features/meals/components/servings-scaler';
import { getRecipe } from '@/features/meals/queries';
import { requireUser } from '@/lib/auth';
import { signedImageUrl } from '@/lib/storage';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Recipe' };
export const dynamic = 'force-dynamic';

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const recipe = await getRecipe(user.id, id);
  if (!recipe) notFound();
  const imageUrl = await signedImageUrl(recipe.imagePath).catch(() => null);
  const minutes = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  const steps = (recipe.instructions ?? '')
    .split(/\r?\n/)
    .map((s) => s.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean);

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Recipes', href: '/meals/recipes' }]}
        title={recipe.title}
        description={recipe.description ?? undefined}
        actions={
          <>
            <form action={toggleRecipeFavouriteAction}>
              <input type="hidden" name="id" value={recipe.id} />
              <input type="hidden" name="isFavourite" value={recipe.isFavourite ? '' : 'on'} />
              <Button type="submit" variant="outline" size="sm" aria-pressed={recipe.isFavourite}>
                <HeartIcon
                  data-icon="inline-start"
                  className={cn(recipe.isFavourite && 'fill-primary text-primary')}
                />
                {recipe.isFavourite ? 'Favourite' : 'Add to favourites'}
              </Button>
            </form>
            <RecipeFormDialog
              recipe={recipe}
              variant="outline"
              trigger={
                <>
                  <PencilIcon data-icon="inline-start" />
                  Edit
                </>
              }
            />
            <ConfirmActionButton
              action={deleteRecipeAction}
              fields={{ id: recipe.id }}
              title="Delete this recipe?"
              description="Planned meals that used it keep their history; the recipe leaves your list."
              trigger={
                <>
                  <Trash2Icon data-icon="inline-start" />
                  Delete
                </>
              }
            />
          </>
        }
      />
      <div className="text-muted-foreground mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1">
          <UsersIcon className="size-4" aria-hidden /> {recipe.servings} servings
        </span>
        {minutes > 0 && (
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="size-4" aria-hidden /> {recipe.prepMinutes ?? 0} prep +{' '}
            {recipe.cookMinutes ?? 0} cook
          </span>
        )}
        {recipe.category && <span>{recipe.category}</span>}
        {recipe.rating && (
          <span aria-label={`${recipe.rating} of 5`}>{'★'.repeat(recipe.rating)}</span>
        )}
        {recipe.dietaryTags.map((t) => (
          <Badge key={t} variant="outline">
            {t}
          </Badge>
        ))}
        <Link
          href="/meals"
          className={cn(buttonVariants({ variant: 'link', size: 'sm' }), 'ml-auto')}
        >
          Plan it into the week
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        <div className="flex flex-col gap-4">
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="w-full rounded-xl object-cover" />
          )}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Ingredients</CardTitle>
            </CardHeader>
            <CardContent>
              {recipe.ingredients.length === 0 ? (
                <p className="text-muted-foreground text-sm">No ingredients listed yet.</p>
              ) : (
                <ServingsScaler base={recipe.servings} ingredients={recipe.ingredients} />
              )}
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Method</CardTitle>
            </CardHeader>
            <CardContent>
              {steps.length === 0 ? (
                <p className="text-muted-foreground text-sm">No steps written yet.</p>
              ) : (
                <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
                  {steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
          {recipe.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-line">{recipe.notes}</CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
