import { useRef, useState } from 'react'
import { Camera, RefreshCw } from 'lucide-react'
import { BackButton } from '@/components/layout/back-button'
import { MongleLogo } from '@/components/brand/mongle-logo'
import { Button } from '@/components/ui/button'
import { uploadImage } from '@/lib/api/images'
import {
  DEFAULT_FEMALE_PERSON_IMAGES,
  DEFAULT_MALE_PERSON_IMAGES,
} from '@/lib/default-person-image'
import type { UserProfileInput } from '@/lib/api/auth'
import { optimizedImageUrl } from '@/lib/image-url'
import { cn } from '@/lib/utils'

type Gender = Exclude<UserProfileInput['gender'], null>

const GENDER_OPTIONS: Array<{ value: Gender; label: string }> = [
  { value: 'FEMALE', label: '여성' },
  { value: 'MALE', label: '남성' },
]

export function ProfileOnboarding({
  username,
  onBack,
  onComplete,
}: {
  username: string
  /** 이름 단계로 되돌아가기 (스택 pop) */
  onBack?: () => void
  onComplete: (profile: UserProfileInput) => Promise<void>
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [gender, setGender] = useState<Gender>('FEMALE')
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const candidates =
    gender === 'FEMALE'
      ? DEFAULT_FEMALE_PERSON_IMAGES
      : DEFAULT_MALE_PERSON_IMAGES
  const defaultImageUrl = candidates[candidateIndex % candidates.length]
  const selectedImageUrl = uploadedImageUrl ?? defaultImageUrl
  const previewImageUrl = selectedImageUrl.startsWith('/default-people/')
    ? selectedImageUrl
    : optimizedImageUrl(selectedImageUrl, 640)
  const pending = uploading || saving

  const selectGender = (nextGender: Gender) => {
    setGender(nextGender)
    setCandidateIndex(0)
    setUploadedImageUrl(null)
    setError(null)
  }

  const showNextAvatar = () => {
    setUploadedImageUrl(null)
    setCandidateIndex((value) => (value + 1) % candidates.length)
    setError(null)
  }

  const handleUpload = async (file: File | null) => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const { url } = await uploadImage(file)
      setUploadedImageUrl(url)
    } catch {
      setError('사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setUploading(false)
    }
  }

  const finish = async (profile: UserProfileInput) => {
    setSaving(true)
    setError(null)
    try {
      await onComplete(profile)
    } catch {
      setError('프로필을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
      setSaving(false)
    }
  }

  return (
    <main className="relative flex h-full flex-col overflow-y-auto bg-background px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <div
        aria-hidden
        className="absolute -top-20 -right-20 size-64 rounded-full bg-primary/8 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute bottom-8 -left-28 size-64 rounded-full bg-amber-200/20 blur-3xl"
      />

      <div className="relative flex items-center gap-2">
        {onBack ? (
          <BackButton
            onClick={onBack}
            aria-label="이름 다시 정하기"
            className="-ml-2"
          />
        ) : null}
        <MongleLogo className="text-foreground" />
      </div>

      <section className="relative my-auto py-8 text-center">
        <p className="text-sm font-semibold text-primary">
          2 / 2 · 프로필 설정
        </p>
        <h1 className="mt-3 text-[30px] font-semibold leading-[1.18] tracking-[-0.04em] text-foreground">
          <span data-amp-mask>{username}</span>님을 보여줄
          <br />
          사진을 골라 주세요
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-muted-foreground">
          기본 아바타를 바꿔 보거나 직접 사진을 올릴 수 있어요.
        </p>

        <div className="relative mx-auto mt-8 size-48">
          <div className="absolute inset-2 rounded-full bg-muted/70 blur-xl" />
          <div className="relative size-full overflow-hidden rounded-full border border-border/70 bg-white shadow-[0_18px_50px_-24px_rgba(0,0,0,0.45)]">
            <img
              key={selectedImageUrl}
              src={previewImageUrl ?? undefined}
              alt={`${username}님의 선택한 프로필 사진`}
              className="size-full animate-in object-cover duration-300 fade-in zoom-in-95"
            />
            {uploading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/75 backdrop-blur-sm">
                <span className="size-7 animate-spin rounded-full border-2 border-muted border-t-foreground" />
              </div>
            ) : null}
          </div>
        </div>

        <div
          className="mx-auto mt-7 grid w-full max-w-[240px] grid-cols-2 rounded-2xl bg-muted/70 p-1"
          aria-label="아바타 성별"
        >
          {GENDER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={gender === option.value}
              disabled={pending}
              onClick={() => selectGender(option.value)}
              className={cn(
                'h-10 rounded-xl text-sm font-semibold transition-all',
                gender === option.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={pending}
            onClick={showNextAvatar}
            className="h-12 rounded-2xl font-semibold"
          >
            <RefreshCw />
            다른 사진
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
            className="h-12 rounded-2xl font-semibold"
          >
            <Camera />
            직접 올리기
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            void handleUpload(event.target.files?.[0] ?? null)
            event.target.value = ''
          }}
        />

        {error ? (
          <p className="mt-4 text-xs font-semibold text-destructive">{error}</p>
        ) : null}

        <Button
          type="button"
          size="lg"
          disabled={pending}
          onClick={() =>
            void finish({ profileImageUrl: selectedImageUrl, gender })
          }
          className="mt-7 h-14 w-full rounded-2xl text-base font-semibold"
        >
          {saving ? '저장하는 중...' : '이 사진으로 시작하기'}
        </Button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void finish({ profileImageUrl: null, gender: null })}
          className="mt-4 px-4 py-2 text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
        >
          지금은 건너뛰기
        </button>
      </section>
    </main>
  )
}
