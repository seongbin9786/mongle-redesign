package com.mongle.common

/**
 * 입력 검증 한도(§12.3 글자수 · §12.2 개수 · §12.6 이미지 개수)의 SSOT.
 *
 * 글자수를 포함한 모든 검증은 서비스 계층 Validators 로 한다.
 * DTO `@field:Size` 는 쓰지 않는다 — @Valid 실패가 INVALID_INPUT 으로 뭉뚱그려져
 * LENGTH_EXCEEDED 등 도메인 에러코드(§12.5 문구)를 잃기 때문.
 */
object ValidationLimits {
    // 글자수 (§12.3)
    const val NAME_MAX = 20
    const val CHIP_NAME_MAX = 10
    const val EVENT_TITLE_MAX = 40
    const val PREFERENCE_ITEM_MAX = 30
    const val MEMO_MAX = 200

    // 개수 (§12.2 / §12.6)
    const val CHIP_PER_KIND_MAX = 30
    const val EMOTION_PER_EVENT_MAX = 5
    const val RELATION_TAG_PER_PERSON_MAX = 10
    const val PREFERENCE_LIST_MAX = 20
    const val EVENT_PHOTO_MAX = 5
    const val PROFILE_PHOTO_MAX = 1
}
