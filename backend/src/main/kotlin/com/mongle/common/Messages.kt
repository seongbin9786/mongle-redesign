package com.mongle.common

/**
 * 사용자에게 그대로 노출하는 공통 문구 사전(§12.5). 코드 상의 SSOT.
 *
 * 값이 들어가는 문구는 함수로 두어 한도 상수(ValidationLimits)를 인자로 받는다 —
 * 문구와 숫자를 각각 한 곳에서만 관리하기 위함.
 * 도메인 서비스는 여기 상수/함수를 BusinessException 메시지로 넘긴다.
 */
object Messages {
    // 필수 누락 — 대상 명사에 맞춰 골라 쓴다.
    const val REQUIRED_NAME = "이름을 입력해 주세요."
    const val REQUIRED_CHIP_NAME = "칩 이름을 입력해 주세요."
    const val REQUIRED_PERSON = "함께한 사람을 한 명 이상 선택해 주세요."
    const val REQUIRED_ZONE_NAME = "존 이름을 입력해 주세요."

    // 날짜
    const val FUTURE_DATE = "오늘보다 미래일 수는 없어요."
    const val DATE_ORDER = "마지막 만난 날은 처음 만난 날 이후여야 해요."

    // 중복·개수
    const val DUPLICATE = "이미 있는 항목이에요."
    const val CATEGORY_REQUIRED = "카테고리는 최소 1개가 필요해요."
    const val SELECTION_LIMIT = "선택할 수 있는 최대 개수를 넘었어요."

    fun lengthExceeded(max: Int) = "최대 ${max}자까지 쓸 수 있어요."

    fun chipKindLimitExceeded(max: Int) = "칩은 종류별로 최대 ${max}개까지 만들 수 있어요."

    fun zoneLimitExceeded(max: Int) = "존은 최대 ${max}개까지 만들 수 있어요."

    // 개수 초과 — 대상별 확정 문구(PRD 02 §7 · 04 §6). 대상 없는 일반 상한은 SELECTION_LIMIT 만.
    fun emotionSelectionLimit(max: Int) = "감정은 최대 ${max}개까지 고를 수 있어요."

    fun photoSelectionLimit(max: Int) = "사진은 최대 ${max}장까지 넣을 수 있어요."

    fun relationTagSelectionLimit(max: Int) = "관계 태그는 최대 ${max}개까지 담을 수 있어요."

    fun preferenceSelectionLimit(max: Int) = "최대 ${max}개까지 담을 수 있어요."
}
