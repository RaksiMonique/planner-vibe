import Link from 'next/link';
import { ClockIcon, HeartIcon, UsersIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toggleRecipeFavouriteAction } from '../actions';
import type { Recipe } from '../queries';
import { cn } from '@/lib/utils';

export function RecipeCard({ recipe, imageUrl }: { recipe: Recipe; imageUrl: string | null }) {
  const minutes = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  return (
    <Card className="h-full">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-36 w-full object-cover" />
      )}
      <CardContent className="flex h-full flex-col gap-2">
        <div className="flex items-start gap-2">
          <Link
            href={`/meals/recipes/${recipe.id}`}
            className="font-heading min-w-0 flex-1 text-lg leading-snug hover:underline"
          >
            {recipe.title}
          </Link>
          <form action={toggleRecipeFavouriteAction}>
            <input type="hidden" name="id" value={recipe.id} />
            <input type="hidden" name="isFavourite" value={recipe.isFavourite ? '' : 'on'} />
            <Button
              type="submit"
              variant="ghost"
              size="icon-xs"
              aria-label={recipe.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
              aria-pressed={recipe.isFavourite}
            >
              <HeartIcon className={cn(recipe.isFavourite && 'fill-primary text-primary')} />
            </Button>
          </form>
        </div>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1">
            <UsersIcon className="size-3" aria-hidden /> {recipe.servings}
          </span>
          {minutes > 0 && (
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="size-3" aria-hidden /> {minutes} min
            </span>
          )}
          {recipe.category && <span>{recipe.category}</span>}
          {recipe.rating && (
            <span aria-label={`${recipe.rating} of 5`}>{'★'.repeat(recipe.rating)}</span>
          )}
        </div>
        {recipe.dietaryTags.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1">
            {recipe.dietaryTags.map((t) => (
              <Badge key={t} variant="outline">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
