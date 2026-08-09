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
  ringColor,
}: {
  name: string
  imageUrl?: string | null
  className?: string
  favorite?: boolean
  favoriteBadge?: 'compact' | 'prominent'
  gender?: PersonImageGender
  personId?: number | null
  // 아바타를 감싸는 색 링. border가 아니라 outline인 이유는 링을 켜고 꺼도
  // 아바타 크기·정렬이 흔들리지 않아야 하기 때문(목록에서 링 있는 사람과 없는
  // 사람이 한 줄에 섞인다).
  ringColor?: string | null
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
      <Avatar
        className={cn('border border-border bg-card', className)}
        style={
          ringColor
            ? {
                outline: `2px solid ${ringColor}`,
                outlineOffset: '2px',
              }
            : undefined
        }
      >
        <AvatarImage src={src} alt={name} className="object-cover" />
        <AvatarFallback className="bg-muted font-bold text-foreground">
          {monogram(name)}
        </AvatarFallback>
      </Avatar>
      {favorite ? (
        favoriteBadge === 'prominent' ? (
          // 목록 별과 같은 비율로 줄인 크기(원래 36/20px의 75%). 즐겨찾기는 표시일 뿐이라
          // 얼굴보다 커 보이면 안 된다.
          <span className="absolute -top-1 -right-1 z-10 flex size-7 items-center justify-center rounded-full border border-border bg-background text-amber-500 shadow-sm">
            <Star className="size-[15px] fill-current" />
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
