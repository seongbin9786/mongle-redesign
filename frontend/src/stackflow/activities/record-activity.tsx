import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ActivityComponentType } from '@stackflow/react'
import { useFunnel } from '@use-funnel/browser'
import { Check, ImagePlus, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  EventRequest,
  PersonResponse,
} from '@/apis/generated/mongle-api.schemas'
import { eventMutation } from '@/apis/mutations'
import {
  chipQuery,
  eventQuery,
  homeQuery,
  personQuery,
  timelineQuery,
} from '@/apis/queries'
import { FunnelHeader } from '@/components/layout/funnel-header'
import { Button } from '@/components/ui/button'
import {
  EmptyState,
  EmptyStateAction,
  EmptyStateDescription,
} from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { MonogramAvatar } from '@/components/ui/monogram-avatar'
import { NextBar } from '@/components/ui/next-bar'
import { StatusMessage } from '@/components/ui/status-message'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { DateStrip } from '@/components/record/date-strip'
import { TimeWheel } from '@/components/record/time-wheel'
import { AppScreen } from '@/stackflow/components/app-screen'
import { uploadImage } from '@/lib/api/images'
import { todayLocalIso } from '@/lib/format'
import { optimizedImageUrl } from '@/lib/image-url'
import {
  formatOccurredTimeForApi,
  formatOccurredTimeForInput,
  validateRecordForm,
} from '@/lib/record-validation'
import { cn } from '@/lib/utils'
import { useEnterDone } from '@/stackflow/use-enter-done'
import { featureEvents, trackFeature } from '@/lib/analytics'
import { useAppFlow } from '@/stackflow/use-app-flow'

const MEMO_MAX = 200 // 백엔드 memo 상한과 일치
const EMOTION_MAX = 5 // 백엔드 ValidationLimits.EMOTION_PER_EVENT_MAX와 일치

// 감정 칩(명사)을 "오늘은 ___다" 문장에 맞는 과거 서술형으로 바꾼다.
// 한국어 활용은 규칙화가 어려워(es-hangul도 조사만 지원) 알려진 값만 매핑한다.
// 백엔드 ChipSeeder 의 감정 시드 라벨은 전부 여기 있어야 한다 — 빠지면 "반가움다"처럼 깨진다.
const EMOTION_PAST: Record<string, string> = {
  반가움: '반가웠',
  뭉클: '뭉클했',
  편안: '편안했',
  즐거움: '즐거웠',
  고마움: '고마웠',
  설렘: '설렜',
  든든: '든든했',
  서운: '서운했',
  아쉬움: '아쉬웠',
  속상: '속상했',
  그냥: '그냥 그랬',
  // 이하는 과거 시드·개인 칩에서 올 수 있는 라벨.
  기쁨: '기뻤',
  감사: '감사했',
  행복: '행복했',
  뿌듯: '뿌듯했',
  슬픔: '슬펐',
  우울: '우울했',
  불안: '불안했',
  신남: '신났',
  피곤: '피곤했',
}
// 매핑에 없는 라벨(사용자 개인 칩 등)에 '다'를 붙이면 "반가움다"처럼 깨지므로 원형 그대로 둔다.
const emotionWord = (label: string) => {
  const past = EMOTION_PAST[label]
  return past ? `${past}다` : label
}

// 감정은 칩(테두리) 대신 색상 있는 글자만. 리터럴이라 Tailwind JIT가 스캔한다.
const EMOTION_TEXT = [
  'text-rose-500',
  'text-amber-500',
  'text-sky-500',
  'text-violet-500',
  'text-emerald-500',
  'text-orange-500',
]

const bigChipBase =
  'inline-flex h-11 items-center justify-center rounded-full border px-5 text-body whitespace-nowrap transition-colors'
// 선택 채움은 순검정 대신 살짝 연한 잉크(눈부심 완화).
const neutralChipClass = cn(
  bigChipBase,
  'border-border bg-card text-foreground/80 data-[state=on]:border-transparent data-[state=on]:bg-foreground/85 data-[state=on]:text-background',
)

// 편지지: 흑백 톤 + 손그림 느낌 옅은 괘선. 줄 높이 28px에 맞춘다.
// 괘선 SVG는 배경 이미지라 currentColor를 못 받으므로 styles.css의
// --letter-paper(라이트/다크 각각)에서 가져온다.
const letterPaperStyle: React.CSSProperties = {
  backgroundImage: 'var(--letter-paper)',
  backgroundRepeat: 'repeat',
  backgroundSize: '90px 28px',
  backgroundPositionY: '3px',
}

const pad = (n: number) => String(n).padStart(2, '0')
function nowTimeStr() {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(Math.floor(d.getMinutes() / 5) * 5)}`
}

function parseId(value: string | undefined): number | undefined {
  if (value === undefined) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

type RecordSteps = {
  person: Record<string, never>
  emotion: Record<string, never>
  what: Record<string, never>
  detail: Record<string, never>
}

export const RecordActivity: ActivityComponentType<'Record'> = ({ params }) => {
  const presetPersonId = parseId(params.personId)
  const editingEventId = parseId(params.eventId)
  const isEditing = editingEventId !== undefined
  // 인물 화면(프로필/타임라인)에서 진입하면 personId가 프리셋된다. 이때는 상세
  // 흐름의 연장이라 일반 push 슬라이드로, 하단 ＋·이벤트 수정은 모달 present로 뜬다.
  const slideIn = presetPersonId !== undefined
  const enterDone = useEnterDone()
  const { push, pop, replace } = useAppFlow()
  const queryClient = useQueryClient()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const hydratedEventId = useRef<number | null>(null)

  const [selectedPersonIds, setSelectedPersonIds] = useState<number[]>(() =>
    presetPersonId ? [presetPersonId] : [],
  )
  const [categoryChipId, setCategoryChipId] = useState<number | null>(null)
  const [emotionChipIds, setEmotionChipIds] = useState<number[]>([])
  const [weatherChipId, setWeatherChipId] = useState<number | null>(null)
  const [what, setWhat] = useState('')
  const [occurredDate, setOccurredDate] = useState(() => todayLocalIso())
  const [occurredTime, setOccurredTime] = useState(nowTimeStr)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const chipsQuery = useQuery(chipQuery.all())
  const personsQuery = useQuery(personQuery.all())
  const editedEventQuery = useQuery(
    eventQuery.byId(editingEventId ?? 0, isEditing),
  )

  const persons = personsQuery.data ?? []
  const chips = chipsQuery.data ?? []

  const categoryChips = useMemo(
    () => chips.filter((c) => c.type === 'CATEGORY'),
    [chips],
  )
  const emotionChips = useMemo(
    () => chips.filter((c) => c.type === 'EMOTION'),
    [chips],
  )

  const selectedPersons = useMemo(() => {
    return selectedPersonIds.map((id) => {
      const fromDirectory = persons.find((p) => p.id === id)
      if (fromDirectory) return fromDirectory
      const fromEvent = editedEventQuery.data?.persons.find((p) => p.id === id)
      if (fromEvent) return { ...fromEvent, profileImageUrl: undefined }
      return {
        id,
        name: `#${id}`,
        profileImageUrl: undefined,
      } satisfies Pick<PersonResponse, 'id' | 'name' | 'profileImageUrl'>
    })
  }, [editedEventQuery.data?.persons, persons, selectedPersonIds])

  const primaryPerson = selectedPersons.at(0)
  let personLabel = ''
  if (primaryPerson) {
    personLabel =
      selectedPersons.length === 1
        ? `${primaryPerson.name}님`
        : `${primaryPerson.name}님 외 ${selectedPersons.length - 1}명`
  }

  const categoryLabel =
    categoryChips.find((c) => c.id === categoryChipId)?.label ??
    categoryChips.at(0)?.label ??
    ''

  // 제목 인풋은 없앴다. 본문 첫 줄을 잘라 제목으로(엔터 = 첫 줄까지).
  const derivedTitle = what.split('\n')[0].slice(0, 40).trim()
  const fallbackTitle = useMemo(() => {
    if (selectedPersons.length === 0) return ''
    const who =
      selectedPersons.length === 1
        ? selectedPersons[0].name
        : `${selectedPersons[0].name} 외 ${selectedPersons.length - 1}명`
    return categoryLabel ? `${who} · ${categoryLabel}` : who
  }, [selectedPersons, categoryLabel])

  useEffect(() => {
    if (!isEditing || !editedEventQuery.data) return
    if (hydratedEventId.current === editingEventId) return
    const event = editedEventQuery.data
    hydratedEventId.current = editingEventId
    setSelectedPersonIds(event.persons.map((p) => p.id))
    setWhat(event.memo ?? '')
    setOccurredDate(event.occurredDate)
    setOccurredTime(formatOccurredTimeForInput(event.occurredTime))
    setCategoryChipId(event.category?.id ?? null)
    setEmotionChipIds(event.emotions.map((e) => e.id))
    setWeatherChipId(event.weather?.id ?? null)
    setPhotoUrls(event.photoUrls)
  }, [editedEventQuery.data, editingEventId, isEditing])

  const navigateAfterSave = (personId?: number) => {
    if (isEditing) {
      pop()
      return
    }
    if (personId) {
      replace('Person', { personId: String(personId), view: 'timeline' })
      return
    }
    pop()
  }

  const saveMutation = useMutation({
    ...(isEditing
      ? eventMutation.update(editingEventId)
      : eventMutation.register()),
    onSuccess: async (event) => {
      void trackFeature(
        isEditing ? featureEvents.eventUpdated : featureEvents.eventCreated,
        {
          person_count: selectedPersonIds.length,
          photo_count: photoUrls.length,
          emotion_count: emotionChipIds.length,
          has_category: categoryChipId !== null,
        },
      )
      await queryClient.invalidateQueries({ queryKey: homeQuery.allKey })
      await queryClient.invalidateQueries({ queryKey: personQuery.allKey })
      await queryClient.invalidateQueries({ queryKey: timelineQuery.allKey })
      await queryClient.invalidateQueries({ queryKey: eventQuery.allKey })
      if (isEditing) {
        await queryClient.invalidateQueries({
          queryKey: eventQuery.byId(editingEventId).queryKey,
        })
      }
      navigateAfterSave(event.persons[0]?.id)
    },
    onError: () => {
      setFormError(
        '기록을 저장하지 못했어요. 입력한 내용은 그대로 두었어요. 잠시 후 다시 시도해 주세요.',
      )
    },
  })

  const buildPayload = (): EventRequest => ({
    title: derivedTitle || fallbackTitle || undefined,
    memo: what.trim() || undefined,
    occurredDate,
    occurredTime: formatOccurredTimeForApi(occurredTime) ?? undefined,
    categoryChipId: categoryChipId ?? categoryChips.at(0)?.id,
    weatherChipId: weatherChipId ?? undefined,
    emotionChipIds,
    personIds: selectedPersonIds,
    photoUrls,
  })

  const handleSave = () => {
    const validationError = validateRecordForm({
      personIds: selectedPersonIds,
      title: derivedTitle,
      memo: what.trim(),
      photoUrls,
      occurredDate,
    })
    if (validationError) {
      setFormError(validationError)
      return
    }
    setFormError(null)
    saveMutation.mutate(buildPayload())
  }

  const togglePerson = (id: number) => {
    setSelectedPersonIds((prev) =>
      prev.includes(id)
        ? prev.filter((personId) => personId !== id)
        : [...prev, id],
    )
  }

  const toggleEmotion = (id: number) => {
    setEmotionChipIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((emotionId) => emotionId !== id)
      }
      if (prev.length >= EMOTION_MAX) return prev
      return [...prev, id]
    })
  }

  const handlePhotoPick = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const room = 5 - photoUrls.length
    if (room <= 0) {
      setFormError('사진은 최대 5장까지 넣을 수 있어요.')
      return
    }
    const picked = Array.from(files).slice(0, room)
    setUploadingPhoto(true)
    try {
      for (const file of picked) {
        const { url } = await uploadImage(file)
        setPhotoUrls((prev) => [...prev, url])
      }
      void trackFeature(featureEvents.eventPhotoUploaded, {
        context: isEditing ? 'event_edit' : 'event_create',
        photo_count: picked.length,
      })
    } catch {
      setFormError('사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const startStep: keyof RecordSteps =
    presetPersonId || isEditing ? 'emotion' : 'person'
  const funnel = useFunnel<RecordSteps>({
    id: 'record',
    initial: { step: startStep, context: {} },
  })

  // 선택한 사람은 메모리 상태라 새로고침하면 사라진다. 사람 없이 뒤 단계
  // URL(record.step=emotion 등)로 들어오면 빈 화면이 되므로 사람 단계로 되돌린다.
  useEffect(() => {
    if (isEditing || presetPersonId) return
    if (funnel.step !== 'person' && selectedPersonIds.length === 0) {
      void funnel.history.replace('person', {})
    }
  }, [funnel, isEditing, presetPersonId, selectedPersonIds.length])

  const isLoading =
    chipsQuery.isPending ||
    personsQuery.isPending ||
    (isEditing && editedEventQuery.isPending)

  // 퍼널 본문 마운트가 무거워 enter 전환 중에는 로딩 셸만 둔다 (use-enter-done.ts)
  if (isLoading || !enterDone) {
    return (
      <BareShell slideIn={slideIn}>
        <StatusMessage inset="screen" className="px-5">
          불러오는 중…
        </StatusMessage>
      </BareShell>
    )
  }

  if (chipsQuery.isError) {
    return (
      <BareShell slideIn={slideIn}>
        <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
          <p className="text-sm text-destructive">
            기록 선택지를 불러오지 못했어요.
          </p>
          <Button
            type="button"
            variant="outline-foreground"
            size="cta"
            onClick={() => void chipsQuery.refetch()}
            className="mt-5"
          >
            다시 시도
          </Button>
        </div>
      </BareShell>
    )
  }

  if (!isEditing && persons.length === 0) {
    return (
      <BareShell slideIn={slideIn}>
        <EmptyState className="flex-1 justify-center px-5">
          <EmptyStateDescription>
            먼저 함께한 사람을 추가해 주세요.
          </EmptyStateDescription>
          <EmptyStateAction>
            <Button
              type="button"
              variant="outline-foreground"
              size="cta"
              onClick={() => push('PersonNew', {})}
            >
              <Plus className="size-4" />
              사람 추가
            </Button>
          </EmptyStateAction>
        </EmptyState>
      </BareShell>
    )
  }

  if (isEditing && !editedEventQuery.data) {
    return (
      <BareShell slideIn={slideIn}>
        <StatusMessage inset="screen" className="px-5">
          기록을 찾을 수 없어요.
        </StatusMessage>
      </BareShell>
    )
  }

  const saving = saveMutation.isPending
  const selectedEmotionWords = emotionChipIds.flatMap((id) => {
    const emotion = emotionChips.find((chip) => chip.id === id)
    return emotion ? [emotionWord(emotion.label)] : []
  })

  return (
    <funnel.Render
      person={({ history }) => (
        <StepFrame
          slideIn={slideIn}
          onBack={() => pop()}
          errorMessage={formError}
          footer={
            <NextBar
              onNext={() => history.push('emotion', {})}
              disabled={selectedPersonIds.length === 0}
              sticky
              label="이어서"
            />
          }
        >
          <h2 className="text-2xl font-semibold">누구와의 기록이에요?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            함께한 사람을 모두 골라주세요. {selectedPersonIds.length}명 선택
          </p>
          <ul className="mt-5 flex flex-col">
            {[...persons]
              .sort((a, b) => Number(b.favorite) - Number(a.favorite))
              .map((person) => {
                const selected = selectedPersonIds.includes(person.id)
                return (
                  <li key={person.id}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => togglePerson(person.id)}
                      className="flex w-full items-center gap-3 border-b border-border/70 py-2.5 text-left"
                    >
                      <MonogramAvatar
                        name={person.name}
                        imageUrl={person.profileImageUrl}
                        favorite={person.favorite}
                        className="size-12"
                      />
                      <span data-amp-mask className="flex-1 text-lg">
                        {person.name}
                      </span>
                      <span
                        className={cn(
                          'flex size-6 items-center justify-center rounded-full border',
                          selected
                            ? 'border-foreground/85 bg-foreground/85 text-background'
                            : 'border-border text-transparent',
                        )}
                      >
                        <Check className="size-4" />
                      </span>
                    </button>
                  </li>
                )
              })}
          </ul>
        </StepFrame>
      )}
      emotion={({ history }) => (
        <StepFrame
          slideIn={slideIn}
          centerLabel={personLabel}
          onBack={() => (startStep === 'person' ? history.back() : pop())}
          onDone={handleSave}
          doneSaving={saving}
          errorMessage={formError}
          footer={
            <NextBar
              onNext={() => history.push('what', {})}
              sticky
              label="이어서"
            />
          }
        >
          <div className="flex justify-center">
            <MonogramAvatar
              name={primaryPerson?.name ?? ''}
              imageUrl={primaryPerson?.profileImageUrl}
              // size-[62vw]는 뷰포트 기준이라 데스크톱에서 폭 상한(max-w)만 걸면
              // 높이가 그대로 남아 화면을 채우는 세로 알약이 된다 — 양축 모두 상한.
              className="size-[62vw] max-h-72 max-w-72"
            />
          </div>

          <div className="mt-8 text-center">
            <p className="font-hand text-2xl text-foreground/70">오늘은</p>
            <p
              data-amp-mask
              className="font-hand mt-2 min-h-11 text-3xl text-foreground/85"
            >
              {selectedEmotionWords.length > 0
                ? selectedEmotionWords.join(' · ')
                : '\u00A0'}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              최대 {EMOTION_MAX}개 · {emotionChipIds.length}개 선택
            </p>
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-3 font-hand">
            {emotionChips.map((chip, i) => {
              const on = emotionChipIds.includes(chip.id)
              return (
                <button
                  key={chip.id}
                  type="button"
                  aria-pressed={on}
                  disabled={!on && emotionChipIds.length >= EMOTION_MAX}
                  data-amp-mask={chip.personal || undefined}
                  onClick={() => toggleEmotion(chip.id)}
                  className={cn(
                    'text-3xl transition disabled:opacity-20',
                    EMOTION_TEXT[i % EMOTION_TEXT.length],
                    on
                      ? 'underline decoration-2 underline-offset-8 opacity-100'
                      : 'opacity-40',
                  )}
                >
                  {emotionWord(chip.label)}
                </button>
              )
            })}
          </div>
        </StepFrame>
      )}
      what={({ history }) => (
        <StepFrame
          slideIn={slideIn}
          centerLabel={personLabel}
          onBack={() => history.back()}
          onDone={handleSave}
          doneSaving={saving}
          errorMessage={formError}
          footer={
            <NextBar
              onNext={() => history.push('detail', {})}
              sticky
              label="이어서"
            />
          }
        >
          {/* 사진 추가를 편지지보다 위에 둔다. */}
          {/* accept에 heic를 넣으면 iOS가 HEIC 원본을 그대로 넘겨 업로더(jpg·png·webp만 허용)에서
              거부된다. heic를 빼면 iOS가 JPEG로 자동 변환해 넘겨줘 아이폰 기본 사진도 첨부된다. */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              void handlePhotoPick(e.target.files)
              e.target.value = ''
            }}
          />
          {photoUrls.length > 0 ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {photoUrls.map((url) => {
                const src = optimizedImageUrl(url, 256)
                return (
                  <div key={url} className="relative size-20">
                    {src ? (
                      <img
                        src={src}
                        alt=""
                        className="size-20 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex size-20 items-center justify-center rounded-xl bg-muted text-[10px] font-semibold text-muted-foreground">
                        PHOTO
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setPhotoUrls((prev) => prev.filter((u) => u !== url))
                      }
                      className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background"
                      aria-label="사진 삭제"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                )
              })}
            </div>
          ) : null}
          {photoUrls.length < 5 ? (
            <button
              type="button"
              disabled={uploadingPhoto}
              onClick={() => photoInputRef.current?.click()}
              className="mb-3 flex h-28 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card text-muted-foreground disabled:opacity-50"
            >
              <ImagePlus className="size-9" strokeWidth={1.6} />
              <span className="text-sm">
                {uploadingPhoto ? '올리는 중…' : '사진 추가'}
              </span>
            </button>
          ) : null}

          <div className="relative rounded-2xl border border-border bg-card p-4">
            <Textarea
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              maxLength={MEMO_MAX}
              autoFocus
              enterKeyHint="done"
              autoCapitalize="sentences"
              placeholder="오늘 있었던 일"
              style={letterPaperStyle}
              className="font-hand min-h-[148px] resize-none border-0 bg-transparent p-0 text-lg leading-7 tracking-tight shadow-none focus-visible:ring-0 md:text-lg"
            />
            <span className="pointer-events-none absolute right-3 bottom-2 text-caption tabular-nums text-muted-foreground/70">
              {what.length}/{MEMO_MAX}
            </span>
          </div>
        </StepFrame>
      )}
      detail={({ history }) => (
        <StepFrame
          slideIn={slideIn}
          centerLabel={personLabel}
          onBack={() => history.back()}
          onDone={handleSave}
          doneSaving={saving}
          errorMessage={formError}
        >
          <div className="flex flex-col gap-7">
            <Field label="종류">
              <ToggleGroup
                type="single"
                value={categoryChipId ? String(categoryChipId) : undefined}
                onValueChange={(v) => setCategoryChipId(v ? Number(v) : null)}
                className="flex flex-wrap justify-start gap-2.5"
              >
                {categoryChips.map((chip) => (
                  <ToggleGroupItem
                    key={chip.id}
                    value={String(chip.id)}
                    data-amp-mask={chip.personal || undefined}
                    className={neutralChipClass}
                  >
                    {chip.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>

            <Field label="언제">
              <DateStrip value={occurredDate} onChange={setOccurredDate} />
              <div className="mt-4">
                <TimeWheel value={occurredTime} onChange={setOccurredTime} />
              </div>
            </Field>
          </div>
        </StepFrame>
      )}
    />
  )
}

// 몰입형 껍데기: 앱 헤더/하단 탭바 없이 전체화면.
// AppScreen 래핑은 필수 — 없으면 push 되어도 아래 activity(탭 화면)를 덮지 못해
// "+ 눌러도 아무 일 없음"이 된다. 전환은 stackflow/README 계약:
// slideIn(인물 화면 진입)이면 일반 push 슬라이드, 아니면 fullScreen 모달 present.
// AppScreen 컨테이너(absolute inset)에 갇히므로 dvh 대신 h-full 기준.
function RecordScreen({
  slideIn,
  children,
}: {
  slideIn: boolean
  children: React.ReactNode
}) {
  return (
    <AppScreen
      CUPERTINO_ONLY_modalPresentationStyle={slideIn ? undefined : 'fullScreen'}
    >
      <div className="mx-auto flex h-full max-w-md flex-col overflow-y-auto bg-background">
        {children}
      </div>
    </AppScreen>
  )
}

function BareShell({
  slideIn,
  children,
}: {
  slideIn: boolean
  children: React.ReactNode
}) {
  return <RecordScreen slideIn={slideIn}>{children}</RecordScreen>
}

function StepFrame({
  slideIn,
  centerLabel,
  onBack,
  onDone,
  doneSaving,
  errorMessage,
  footer,
  children,
}: {
  slideIn: boolean
  centerLabel?: string
  onBack: () => void
  onDone?: () => void
  doneSaving?: boolean
  errorMessage?: string | null
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <RecordScreen slideIn={slideIn}>
      <FunnelHeader
        onBack={onBack}
        centerLabel={centerLabel}
        onSave={onDone}
        saving={doneSaving}
      />
      <main className="flex flex-1 flex-col px-5 pt-4 pb-6">
        {errorMessage ? (
          <p className="mb-4 text-center text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}
        {children}
      </main>
      {footer}
    </RecordScreen>
  )
}
