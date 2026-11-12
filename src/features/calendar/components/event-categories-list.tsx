import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { removeEventCategory, renameEventCategory } from '../actions';
import { CATEGORY_LABELS, CATEGORY_MAX_LENGTH, EVENT_CATEGORIES } from '../categories';

/** Settings: the user's own event categories, renamed or removed across every event. */
export function EventCategoriesList({ custom }: { custom: string[] }) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="text-muted-foreground">
        Built in: {EVENT_CATEGORIES.map((k) => CATEGORY_LABELS[k]).join(', ')}. The Self-care page
        lists events in Self-care.
      </p>
      {custom.length === 0 ? (
        <p>
          No categories of your own yet. In the event form, press “New category” beside the Category
          field.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {custom.map((name) => (
            <li key={name} className="flex flex-wrap items-center gap-2">
              <form action={renameEventCategory} className="flex min-w-0 flex-1 items-center gap-2">
                <input type="hidden" name="from" value={name} />
                <Input
                  name="to"
                  defaultValue={name}
                  aria-label={`Rename ${name}`}
                  maxLength={CATEGORY_MAX_LENGTH}
                  required
                  className="min-w-0 flex-1 sm:max-w-xs"
                />
                <Button type="submit" variant="outline" size="sm">
                  Rename
                </Button>
              </form>
              <form action={removeEventCategory}>
                <input type="hidden" name="name" value={name} />
                <Button type="submit" variant="ghost" size="sm">
                  Remove
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
