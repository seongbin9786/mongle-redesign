import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ActivityComponentType } from '@stackflow/react'
import { useFunnel } from '@use-funnel/browser'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useRef, useState } from 'react'
import { FunnelHeader } from '@/components/layout/funnel-header'
import { DateWheel } from '@/components/person/date-wheel'
import { ListField } from '@/components/person/list-field'
import { RelationTypeField } from '@/components/person/relation-type-field'
import {
  GENDER_OPTIONS,
  ProfileHero,
  formValuesToRequest,
  personToFormValues,
} from '@/components/person/person-form'
import type { PersonFormValues } from '@/components/person/person-form'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NextBar } from '@/components/ui/next-bar'
import {
  fadeVariants,
  slideVariants,
  stepTransition,
  useStepSlideDirection,
} from '@/components/ui/step-slide'
import { TagChip } from '@/components/ui/tag-chip'
import { AppScreen } from '@/stackflow/components/app-screen'
import { personMutation } from '@/apis/mutations'
import { chipQuery, homeQuery, personQuery } from '@/apis/queries'
import { uploadImage } from '@/lib/api/images'
import { featureEvents, trackFeature } from '@/lib/analytics'
import { useAppFlow } from '@/stackflow/use-app-flow'
import { validatePersonForm } from '@/lib/person-validation'

// 새 단계는 여기 키와 STEP_ORDER에 추가하고 아래 stepBody에 섹션을 더하면 된다.
type PersonNewSteps = {
  name: Record<string, never>
  relation: Record<string, never>
  dates: Record<string, never>
  detail: Record<string, never>
}

const STEP_ORDER = ['name', 'relation', 'dates', 'detail'] as const

export const PersonNewActivity: ActivityComponentType<'PersonNew'> = () => {
  const { pop, replace } = useAppFlow()
  const queryClient = useQueryClient()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const reducedMotion = useReducedMotion()

  const [values, setValues] = useState<PersonFormValues>(() =>
    personToFormValues(),
  )
  const [formError, setFormError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const patch = <TKey extends keyof PersonFormValues>(
    key: TKey,
    value: PersonFormValues[TKey],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setFormError(null)
  }

  const chipsQuery = useQuery(chipQuery.all())
  const relationTags =
    chipsQuery.data?.filter((c) => c.type === 'RELATION_TAG') ?? []

  const funnel = useFunnel<PersonNewSteps>({
    id: 'person-new',
    initial: { step: 'name', context: {} },
  })
  const direction = useStepSlideDirection(funnel.step, STEP_ORDER)

  const createMutation = useMutation({
    ...personMutation.register(),
    onSuccess: async (person) => {
      void trackFeature(featureEvents.personCreated, {
        has_profile_image: Boolean(values.profileImageUrl),
        relation_tag_count: values.relationTagChipIds.length,
      })
      await queryClient.invalidateQueries({ queryKey: personQuery.allKey })
      await queryClient.invalidateQueries({ queryKey: homeQuery.allKey })
      // 등록 화면을 새 인물 프로필로 갈아끼워, 뒤로가기 시 폼이 다시 나오지 않게 한다
      replace('Person', { personId: String(person.id) })
    },
    onError: () => {
      setFormError('저장에 실패했어요. 잠시 후 다시 시도해 주세요.')
    },
  })

  const handleSave = () => {
    const request = formValuesToRequest(values)
    // 처음 만난 날은 선택이지만(PRD 02 §4) 월·일만 있고 연도가 없으면 날짜를 만들 수 없다
    if (!values.firstMetYear && (values.firstMetMonth || values.firstMetDay)) {
      setFormError('처음 만난 날의 연도를 입력해 주세요.')
      return
    }
    const validationError = validatePersonForm(request)
    if (validationError) {
      setFormError(validationError)
      return
    }
    createMutation.mutate(request)
  }

  const toggleTag = (id: number) => {
    patch(
      'relationTagChipIds',
      values.relationTagChipIds.includes(id)
        ? values.relationTagChipIds.filter((t) => t !== id)
        : [...values.relationTagChipIds, id].slice(0, 10),
    )
  }

  const handlePhoto = async (file: File | null) => {
    if (!file) return
    setUploading(true)
    setFormError(null)
    try {
      const { url } = await uploadImage(file)
      patch('profileImageUrl', url)
      void trackFeature(featureEvents.profileImageUploaded, {
        context: 'person_create',
      })
    } catch {
      setFormError('사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setUploading(false)
    }
  }

  const saving = createMutation.isPending
  const name = values.name.trim()
  const step = funnel.step

  const stepBody =
    step === 'name' ? (
      <>
        <h2 className="text-2xl font-semibold">누구를 남길까요?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          이름만 있으면 나머지는 나중에 채워도 돼요.
        </p>
        <Input
          value={values.name}
          onChange={(e) => patch('name', e.target.value)}
          placeholder="이름"
          maxLength={20}
          autoFocus
          enterKeyHint="next"
          className="mt-10 h-14 rounded-none border-0 border-b border-border bg-transparent px-1 text-2xl font-semibold shadow-none focus-visible:ring-0 md:text-2xl"
        />
      </>
    ) : step === 'relation' ? (
      <>
        <h2 className="text-2xl font-semibold">어떤 사이예요?</h2>
        <div className="mt-8 flex flex-col gap-8">
          <Field label="한마디로">
            <RelationTypeField
              value={values.relationType}
              onChange={(v) => patch('relationType', v)}
              hideLabel
            />
          </Field>
          {relationTags.length > 0 ? (
            <Field label="관계 태그">
              <div className="flex flex-wrap gap-2">
                {relationTags.map((tag) => {
                  const active = values.relationTagChipIds.includes(tag.id)
                  return (
                    <TagChip
                      key={tag.id}
                      tone="foreground"
                      surface="card"
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
            </Field>
          ) : null}
        </div>
      </>
    ) : step === 'dates' ? (
      <>
        <h2 className="text-2xl font-semibold">언제부터의 인연이에요?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          기억나지 않으면 비워 두어도 돼요.
        </p>
        <div className="mt-8 flex flex-col gap-8">
          <Field label="처음 만난 날">
            <DateWheel
              year={values.firstMetYear}
              month={values.firstMetMonth}
              day={values.firstMetDay}
              onChange={({ year, month, day }) => {
                setValues((prev) => ({
                  ...prev,
                  firstMetYear: year,
                  firstMetMonth: month,
                  firstMetDay: day,
                }))
                setFormError(null)
              }}
            />
          </Field>
          <Field label="생일">
            <DateWheel
              yearOptional
              year={values.birthYear}
              month={values.birthMonth}
              day={values.birthDay}
              onChange={({ year, month, day }) => {
                setValues((prev) => ({
                  ...prev,
                  birthYear: year,
                  birthMonth: month,
                  birthDay: day,
                }))
                setFormError(null)
              }}
            />
          </Field>
        </div>
      </>
    ) : (
      <>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => void handlePhoto(e.target.files?.[0] ?? null)}
        />
        <h2 className="text-2xl font-semibold">조금 더 남겨볼까요?</h2>
        <div className="mt-8 flex flex-col gap-8">
          <ProfileHero
            name={values.name}
            imageUrl={values.profileImageUrl}
            favorite={values.favorite}
            uploading={uploading}
            onPhotoClick={() => photoInputRef.current?.click()}
            onFavoriteToggle={() => patch('favorite', !values.favorite)}
          />
          <Field label="성별">
            <div className="flex flex-wrap gap-2">
              {GENDER_OPTIONS.map((option) => {
                const active = values.gender === option.value
                return (
                  <TagChip
                    key={option.value || 'none'}
                    tone="foreground"
                    surface="card"
                    hover
                    selected={active}
                    onClick={() => patch('gender', option.value)}
                  >
                    {option.label}
                  </TagChip>
                )
              })}
            </div>
          </Field>
          <Field label="좋아하는 것">
            <ListField
              label=""
              items={values.likes}
              onChange={(likes) => patch('likes', likes)}
              tone="green"
              placeholder="좋아하는 것을 입력해 주세요"
            />
          </Field>
          <Field label="조심할 것">
            <ListField
              label=""
              items={values.cautions}
              onChange={(cautions) => patch('cautions', cautions)}
              tone="red"
              placeholder="조심할 것을 입력해 주세요"
            />
          </Field>
        </div>
      </>
    )

  const footer =
    step === 'name' ? (
      <NextBar
        onNext={() => funnel.history.push('relation', {})}
        disabled={name.length === 0}
        label="다음"
      />
    ) : step === 'relation' ? (
      <NextBar onNext={() => funnel.history.push('dates', {})} label="다음" />
    ) : step === 'dates' ? (
      <NextBar onNext={() => funnel.history.push('detail', {})} label="다음" />
    ) : null

  return (
    <PersonNewScreen>
      <FunnelHeader
        onBack={() => (step === 'name' ? pop() : funnel.history.back())}
        centerLabel={step === 'name' ? '' : name}
        onSave={step !== 'name' ? handleSave : undefined}
        saving={saving}
      />
      <div className="relative min-h-0 min-w-0 flex-1 overflow-x-clip">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={reducedMotion ? fadeVariants : slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={stepTransition(reducedMotion)}
            className="absolute inset-0 flex min-w-0 flex-col overflow-y-auto px-5 pt-4 pb-6 [-webkit-overflow-scrolling:touch]"
          >
            {stepBody}
          </motion.div>
        </AnimatePresence>
      </div>
      {formError ? (
        <p className="px-5 pb-3 text-center text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      {footer}
    </PersonNewScreen>
  )
}

// 몰입형 껍데기. AppScreen 래핑은 필수 — 없으면 push 되어도 아래 activity를
// 덮지 못한다(stackflow/README 계약). 컨테이너(absolute inset)에 갇히므로 h-full 기준.
// 공통 조각(FunnelHeader, NextBar, Field)은 추출해 record와 공유하지만, 이 껍데기는
// record의 RecordScreen과 스크롤 모델이 반대라(record는 전체 스크롤, 여기는 껍데기 고정)
// 일부러 합치지 않는다.
function PersonNewScreen({ children }: { children: React.ReactNode }) {
  return (
    <AppScreen>
      <div className="mx-auto flex h-full max-w-md flex-col bg-background">
        {children}
      </div>
    </AppScreen>
  )
}
