import { Camera, Star } from 'lucide-react'
import { MonogramAvatar } from '@/components/ui/monogram-avatar'
import type { PersonRequest } from '@/apis/generated/mongle-api.schemas'
import { cn } from '@/lib/utils'

export function ProfileHero({
  name,
  imageUrl,
  favorite,
  uploading,
  onPhotoClick,
  onFavoriteToggle,
}: {
  name: string
  imageUrl: string | null
  favorite: boolean
  uploading: boolean
  onPhotoClick: () => void
  onFavoriteToggle: () => void
}) {
  const hasPhoto = Boolean(imageUrl)

  return (
    <div className="rounded-lg border border-border bg-card p-3.5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={uploading}
          onClick={onPhotoClick}
          className="relative shrink-0"
          aria-label={hasPhoto ? '프로필 사진 변경' : '프로필 사진 추가'}
        >
          {hasPhoto || name.trim() ? (
            <MonogramAvatar
              name={name || '?'}
              imageUrl={imageUrl}
              className="size-14"
            />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-full border border-dashed border-muted-foreground/50 bg-muted/20 text-muted-foreground">
              <Camera className="size-5" />
            </div>
          )}
          <span className="absolute -right-0.5 -bottom-0.5 flex size-6 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm">
            {uploading ? (
              <span className="text-[10px] font-semibold">…</span>
            ) : (
              <Camera className="size-3" />
            )}
          </span>
        </button>

        <button
          type="button"
          disabled={uploading}
          onClick={onPhotoClick}
          className="min-w-0 flex-1 text-left"
        >
          <p className="text-sm font-semibold text-foreground">
            {hasPhoto ? '프로필 사진 변경' : '프로필 사진 추가'}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {uploading
              ? '사진을 올리는 중이에요'
              : '탭해서 앨범에서 고를 수 있어요'}
          </p>
        </button>

        <button
          type="button"
          onClick={onFavoriteToggle}
          aria-label={favorite ? '즐겨찾기 해제' : '즐겨찾기'}
          aria-pressed={favorite}
          className={cn(
            'flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 transition-colors',
            favorite
              ? 'bg-amber-500/12 text-amber-600 dark:text-amber-400'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted',
          )}
        >
          <Star
            className={cn('size-5', favorite && 'fill-current text-amber-500')}
          />
          <span className="text-[10px] font-semibold">즐겨찾기</span>
        </button>
      </div>
    </div>
  )
}

export type PersonFormValues = {
  name: string
  profileImageUrl: string | null
  gender: 'FEMALE' | 'MALE' | ''
  relationType: string
  relationTagChipIds: number[]
  likes: string[]
  cautions: string[]
  favorite: boolean
  firstMetYear: string
  firstMetMonth: string
  firstMetDay: string
  lastMetDate: string
  birthMonth: string
  birthDay: string
  birthYear: string
}

function parseIsoDateParts(iso: string | null | undefined) {
  if (!iso) return { year: '', month: '', day: '' }
  const [year, month, day] = iso.split('-')
  return {
    year: year || '',
    month: month ? String(Number(month)) : '',
    day: day ? String(Number(day)) : '',
  }
}

function composeFirstMetDate(
  year: string,
  month: string,
  day: string,
): string | null {
  const y = year.trim()
  const m = month.trim()
  const d = day.trim()

  if (!y && !m && !d) return null
  if (!y) return ''

  const monthPart = m ? m.padStart(2, '0') : '01'
  const dayPart = d ? d.padStart(2, '0') : '01'
  return `${y.padStart(4, '0')}-${monthPart}-${dayPart}`
}

export function personToFormValues(
  person?: Partial<PersonRequest> & {
    name?: string
    relationTags?: Array<{ id: number }>
  },
): PersonFormValues {
  const firstMet = parseIsoDateParts(person?.firstMetDate)

  return {
    name: person?.name ?? '',
    profileImageUrl: person?.profileImageUrl ?? null,
    gender: person?.gender ?? '',
    relationType: person?.relationType ?? '',
    relationTagChipIds:
      person?.relationTagChipIds ??
      person?.relationTags?.map((t) => t.id) ??
      [],
    likes: person?.likes ?? [],
    cautions: person?.cautions ?? [],
    favorite: person?.favorite ?? false,
    firstMetYear: firstMet.year,
    firstMetMonth: firstMet.month,
    firstMetDay: firstMet.day,
    lastMetDate: person?.lastMetDate ?? '',
    birthMonth: person?.birthday?.month ? String(person.birthday.month) : '',
    birthDay: person?.birthday?.day ? String(person.birthday.day) : '',
    birthYear: person?.birthday?.year ? String(person.birthday.year) : '',
  }
}

export function formValuesToRequest(values: PersonFormValues): PersonRequest {
  const month = values.birthMonth ? Number(values.birthMonth) : undefined
  const day = values.birthDay ? Number(values.birthDay) : undefined
  const year = values.birthYear ? Number(values.birthYear) : undefined
  const birthday =
    month && day ? { month, day, ...(year ? { year } : {}) } : undefined

  const firstMetDate = composeFirstMetDate(
    values.firstMetYear,
    values.firstMetMonth,
    values.firstMetDay,
  )

  return {
    name: values.name.trim(),
    profileImageUrl: values.profileImageUrl ?? undefined,
    gender: values.gender || undefined,
    relationType: values.relationType.trim() || undefined,
    relationTagChipIds: values.relationTagChipIds,
    likes: values.likes,
    cautions: values.cautions,
    favorite: values.favorite,
    firstMetDate: firstMetDate || undefined,
    lastMetDate: values.lastMetDate || undefined,
    birthday,
  }
}

export const GENDER_OPTIONS = [
  { value: '', label: '선택 안 함' },
  { value: 'FEMALE', label: '여성' },
  { value: 'MALE', label: '남성' },
] as const
