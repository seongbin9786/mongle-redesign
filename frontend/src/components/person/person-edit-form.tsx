import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { DateWheel } from '@/components/person/date-wheel'
import { ListField } from '@/components/person/list-field'
import { RelationTypeField } from '@/components/person/relation-type-field'
import {
  GENDER_OPTIONS,
  ProfileHero,
  formValuesToRequest,
} from '@/components/person/person-form'
import type { PersonFormValues } from '@/components/person/person-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TagChip } from '@/components/ui/tag-chip'
import { uploadImage } from '@/lib/api/images'
import { featureEvents, trackFeature } from '@/lib/analytics'
import type { PersonRequest } from '@/apis/generated/mongle-api.schemas'
import { validatePersonForm } from '@/lib/person-validation'

export function PersonEditForm({
  initialValues,
  relationTags,
  pending = false,
  onSubmit,
  onDelete,
  formId = 'person-edit-form',
}: {
  initialValues: PersonFormValues
  relationTags: Array<{ id: number; label: string; color?: string | null }>
  pending?: boolean
  onSubmit: (request: PersonRequest) => void
  onDelete: () => void
  formId?: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [values, setValues] = useState(initialValues)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const patch = <TKey extends keyof PersonFormValues>(
    key: TKey,
    value: PersonFormValues[TKey],
  ) => {
    setValues((previous) => ({ ...previous, [key]: value }))
    setError(null)
  }

  const toggleTag = (id: number) => {
    patch(
      'relationTagChipIds',
      values.relationTagChipIds.includes(id)
        ? values.relationTagChipIds.filter((tagId) => tagId !== id)
        : [...values.relationTagChipIds, id].slice(0, 10),
    )
  }

  const handlePhoto = async (file: File | null) => {
    if (!file) return

    setUploading(true)
    setError(null)
    try {
      const { url } = await uploadImage(file)
      patch('profileImageUrl', url)
      void trackFeature(featureEvents.profileImageUploaded, {
        context: 'person_edit',
      })
    } catch {
      setError('사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const request = formValuesToRequest(values)

    if (!values.firstMetYear && (values.firstMetMonth || values.firstMetDay)) {
      setError('처음 만난 날의 연도를 입력해 주세요.')
      return
    }

    const validationError = validatePersonForm(request)
    if (validationError) {
      setError(validationError)
      return
    }

    onSubmit(request)
  }

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className="flex flex-col gap-10 pb-6"
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => void handlePhoto(event.target.files?.[0] ?? null)}
      />

      <ProfileHero
        name={values.name}
        imageUrl={values.profileImageUrl}
        favorite={values.favorite}
        uploading={uploading}
        onPhotoClick={() => fileRef.current?.click()}
        onFavoriteToggle={() => patch('favorite', !values.favorite)}
      />

      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive"
        >
          {error}
        </p>
      ) : null}

      <section aria-labelledby="person-basic-heading">
        <h2
          id="person-basic-heading"
          className="mb-6 text-xl font-semibold tracking-tight"
        >
          기본 정보
        </h2>
        <div className="flex flex-col gap-6">
          <div>
            <label htmlFor="name" className="text-xs font-semibold">
              이름
            </label>
            <Input
              id="name"
              value={values.name}
              onChange={(event) => patch('name', event.target.value)}
              className="mt-2 h-11 bg-background px-3 text-base font-semibold"
              placeholder="이름을 입력해 주세요"
              maxLength={20}
              enterKeyHint="done"
            />
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold">성별</p>
            <div className="flex flex-wrap gap-2">
              {GENDER_OPTIONS.map((option) => {
                const active = values.gender === option.value
                return (
                  <TagChip
                    key={option.value || 'none'}
                    tone="foreground"
                    surface="background"
                    hover
                    selected={active}
                    onClick={() => patch('gender', option.value)}
                  >
                    {option.label}
                  </TagChip>
                )
              })}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold">생일</p>
            <div className="mt-3">
              <DateWheel
                yearOptional
                year={values.birthYear}
                month={values.birthMonth}
                day={values.birthDay}
                onChange={({ year, month, day }) => {
                  setValues((previous) => ({
                    ...previous,
                    birthYear: year,
                    birthMonth: month,
                    birthDay: day,
                  }))
                  setError(null)
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="person-relation-heading">
        <h2
          id="person-relation-heading"
          className="mb-6 text-xl font-semibold tracking-tight"
        >
          관계
        </h2>
        <div className="flex flex-col gap-6">
          <div>
            <p className="mb-3 text-xs font-semibold">한마디로</p>
            <RelationTypeField
              value={values.relationType}
              onChange={(value) => patch('relationType', value)}
              hideLabel
            />
          </div>
          {relationTags.length > 0 ? (
            <div>
              <p className="mb-3 text-xs font-semibold">관계 태그</p>
              <div className="flex flex-wrap gap-2">
                {relationTags.map((tag) => {
                  const active = values.relationTagChipIds.includes(tag.id)
                  return (
                    <TagChip
                      key={tag.id}
                      tone="foreground"
                      surface="background"
                      hover
                      selected={active}
                      color={tag.color}
                      onClick={() => toggleTag(tag.id)}
                      data-amp-mask
                    >
                      {tag.label}
                    </TagChip>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="person-dates-heading">
        <h2
          id="person-dates-heading"
          className="mb-6 text-xl font-semibold tracking-tight"
        >
          함께한 날짜
        </h2>
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-xs font-semibold">처음 만난 날</p>
            <div className="mt-3">
              <DateWheel
                year={values.firstMetYear}
                month={values.firstMetMonth}
                day={values.firstMetDay}
                onChange={({ year, month, day }) => {
                  setValues((previous) => ({
                    ...previous,
                    firstMetYear: year,
                    firstMetMonth: month,
                    firstMetDay: day,
                  }))
                  setError(null)
                }}
              />
            </div>
          </div>
          <div>
            <label htmlFor="lastMetDate" className="text-xs font-semibold">
              마지막으로 만난 날
            </label>
            <Input
              id="lastMetDate"
              type="date"
              value={values.lastMetDate}
              onChange={(event) => patch('lastMetDate', event.target.value)}
              className="mt-2 h-11 bg-background px-3 text-sm"
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="person-memory-heading">
        <h2
          id="person-memory-heading"
          className="mb-6 text-xl font-semibold tracking-tight"
        >
          기억 메모
        </h2>
        <div className="flex flex-col gap-6">
          <ListField
            label="좋아하는 것"
            items={values.likes}
            onChange={(likes) => patch('likes', likes)}
            tone="green"
            compact
            placeholder="예: 산책, 라떼"
          />
          <div>
            <ListField
              label="조심할 것"
              items={values.cautions}
              onChange={(cautions) => patch('cautions', cautions)}
              tone="red"
              compact
              placeholder="예: 매운 음식"
            />
          </div>
        </div>
      </section>

      <div className="text-center">
        <Button
          type="button"
          variant="ghost"
          className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={pending}
          onClick={onDelete}
        >
          인물 삭제
        </Button>
      </div>
    </form>
  )
}
