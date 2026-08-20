package com.mongle.common

/**
 * 사용자가 고른 표시 색(hex)의 정규화 단일 경로. 칩(관계태그·루트 소속)과 존이 함께 쓴다.
 *
 * 형식을 어긴 값은 거절(400)이 아니라 **버린다(null)** — 색은 표시 보조값이라
 * 색 하나 때문에 이름 저장까지 막는 편이 사용자에게 더 나쁘다.
 * 대소문자는 올려서 저장한다: 같은 색이 `#e06a2b`·`#E06A2B` 두 값으로 갈리면
 * 프론트의 색 비교(선택된 색 표시)가 어긋난다.
 */
object HexColor {
    private val PATTERN = Regex("^#[0-9A-F]{6}$")

    fun normalize(raw: String?): String? {
        val color = raw?.trim()?.uppercase()?.ifBlank { null } ?: return null
        return color.takeIf { PATTERN.matches(it) }
    }
}
