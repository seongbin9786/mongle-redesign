import { Star } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { defaultPersonImageUrl } from '@/lib/default-person-image'
import type { PersonImageGender } from '@/lib/default-person-image'
import { monogram } from '@/lib/format'
import { optimizedImageUrl } from '@/lib/image-url'
import { cn } from '@/lib/utils'

export function MonogramAvatar({
  name,
  imageUrl,
  className,
  favorite,
  favoriteBadge = 'compact',
  gender,
  personId,
}: {
  name: string
  imageUrl?: string | null
  className?: string
  favorite?: boolean
  favoriteBadge?: 'compact' | 'prominent'
  gender?: PersonImageGender
  personId?: number | null
}) {
  const apiSrc = optimizedImageUrl(imageUrl, 128)
  const src =
    apiSrc ??
    defaultPersonImageUrl({
      id: personId,
      name,
      gender,
    })

  return (
    <div data-amp-mask className="relative inline-flex shrink-0">
      <Avatar className={cn('border border-border bg-card', className)}>
        <AvatarImage src={src} alt={name} className="object-cover" />
        <AvatarFallback className="bg-muted font-semibold text-foreground">
          {monogram(name)}
        </AvatarFallback>
      </Avatar>
      {favorite ? (
        favoriteBadge === 'prominent' ? (
          <span className="absolute -top-1 -right-1 z-10 flex size-9 items-center justify-center rounded-full border border-border bg-background text-amber-500 shadow-sm">
            <Star className="size-5 fill-current" />
          </span>
        ) : (
          <span className="absolute -top-1 -right-1 text-xs text-amber-500">
            ★
          </span>
        )
      ) : null}
    </div>
  )
}
