import type { PersonRequest } from '@/apis/generated/mongle-api.schemas'

const todayIso = () => new Date().toISOString().slice(0, 10)

export function validatePersonForm(data: PersonRequest): string | null {
  if (!data.name.trim()) return '이름을 입력해 주세요.'
  if (data.name.trim().length > 20) return '최대 20자까지 쓸 수 있어요.'
  if (data.relationTagChipIds.length > 10) {
    return '관계 태그는 최대 10개까지 담을 수 있어요.'
  }
  if (data.likes.length > 20 || data.cautions.length > 20) {
    return '최대 20개까지 담을 수 있어요.'
  }
  for (const item of [...data.likes, ...data.cautions]) {
    if (item.length > 30) return '최대 30자까지 쓸 수 있어요.'
  }

  const today = todayIso()
  if (data.firstMetDate && data.firstMetDate > today) {
    return '오늘보다 미래일 수는 없어요.'
  }
  if (data.lastMetDate && data.lastMetDate > today) {
    return '오늘보다 미래일 수는 없어요.'
  }
  if (
    data.firstMetDate &&
    data.lastMetDate &&
    data.lastMetDate < data.firstMetDate
  ) {
    return '마지막 만난 날은 처음 만난 날 이후여야 해요.'
  }

  const b = data.birthday
  if (b?.month && !b.day) return '생일의 월과 일을 함께 입력해 주세요.'
  if (b?.day && !b.month) return '생일의 월과 일을 함께 입력해 주세요.'
  if (b?.year && b.month && b.day) {
    const birthdayIso = `${String(b.year).padStart(4, '0')}-${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')}`
    if (birthdayIso > today) return '오늘보다 미래일 수는 없어요.'
  }

  return null
}
