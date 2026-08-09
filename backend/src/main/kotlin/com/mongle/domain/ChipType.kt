package com.mongle.domain

/**
 * 칩 종류. 각 종류는 독립 세트(중복·개수·기본값 규칙은 종류 안에서만 따진다).
 *
 * 기록(event)은 EMOTION·WEATHER·CATEGORY 를, 인물(person)은 RELATION_TAG·AFFILIATION 을 칩 id 로 참조한다.
 * RELATION_TAG·AFFILIATION 은 공통 시드가 없다(모두 개인).
 *
 * AFFILIATION(소속)만 계층을 갖는다 — Chip.parentId 로 1단계 중첩(학교 > 대학교).
 * 관계태그가 '여러 개 붙이는 라벨'인 반면 소속은 '사람당 하나'라는 점이 둘을 가른다.
 */
enum class ChipType {
    EMOTION,
    WEATHER,
    CATEGORY,
    RELATION_TAG,
    AFFILIATION,
    ;

    /** 계층(parentId)을 허용하는 종류인지. 현재는 소속만. */
    val nestable: Boolean
        get() = this == AFFILIATION
}
