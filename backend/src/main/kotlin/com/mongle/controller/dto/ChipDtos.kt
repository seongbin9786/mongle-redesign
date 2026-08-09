package com.mongle.controller.dto

import com.mongle.domain.Chip
import com.mongle.domain.ChipType
import io.swagger.v3.oas.annotations.media.Schema

/**
 * 라벨의 빈값·글자수·중복 검증은 서비스 계층 Validators 로 미룬다(REQUIRED_FIELD·LENGTH_EXCEEDED·DUPLICATE 코드가 필요).
 * DTO @Size 로 걸면 @Valid 실패가 INVALID_INPUT 으로 뭉뚱그려지기 때문.
 */
@Schema(description = "개인 칩 생성 요청. 칩 종류와 라벨을 받는다.")
data class ChipCreateRequest(
    @field:Schema(description = "칩 종류(카테고리·감정·날씨·관계태그·소속).", example = "RELATION_TAG")
    val type: ChipType,
    @field:Schema(description = "칩에 표시할 라벨. 종류 안에서 중복될 수 없다(소속은 같은 상위 안에서만).", example = "대학 친구")
    val label: String,
    @field:Schema(description = "칩 표시 색상(hex). 관계태그·루트 소속에서 사용한다. 하위 소속은 무시된다.", example = "#0EA5E9", nullable = true)
    val color: String? = null,
    @field:Schema(description = "상위 소속 칩 id. 소속에서만 쓸 수 있고 상위는 루트여야 한다(중첩 1단계).", example = "31", nullable = true)
    val parentId: Long? = null,
)

@Schema(description = "칩 이름 변경 요청. 개인 칩만 변경할 수 있다.")
data class ChipRenameRequest(
    @field:Schema(description = "새 라벨. 종류 안에서 중복될 수 없다(소속은 같은 상위 안에서만).", example = "동네 친구")
    val label: String,
    @field:Schema(description = "칩 표시 색상(hex). null 이면 색상을 비운다. 하위 소속은 무시된다.", example = "#22A06B", nullable = true)
    val color: String? = null,
    @field:Schema(description = "상위 소속 칩 id. null 이면 루트로 올린다(소속 전용).", example = "31", nullable = true)
    val parentId: Long? = null,
)

@Schema(description = "칩 응답. 공통 칩과 개인 칩을 함께 담는다.")
data class ChipResponse(
    @field:Schema(description = "칩 id.", example = "12")
    val id: Long,
    @field:Schema(description = "칩 종류(카테고리·감정·날씨·관계태그·소속).", example = "RELATION_TAG")
    val type: ChipType,
    @field:Schema(description = "상위 소속 칩 id. 루트이거나 계층이 없는 종류면 null.", example = "31", nullable = true)
    val parentId: Long?,
    @field:Schema(description = "칩 라벨. 소프트삭제된 칩도 과거 기록 표시를 위해 라벨은 유지된다.", example = "대학 친구")
    val label: String,
    @field:Schema(description = "칩 표시 색상(hex).", example = "#0EA5E9", nullable = true)
    val color: String?,
    // 개인 칩 여부(공통=false). 클라이언트가 이름변경·삭제 가능 여부를 판단한다.
    @field:Schema(description = "개인 칩 여부. 공통 칩은 false 이며 이름변경·삭제가 불가하다.", example = "true")
    val personal: Boolean,
    @field:Schema(description = "같은 종류 안에서의 표시 순서(오름차순).", example = "0")
    val order: Int,
    // 카테고리에서만 의미 — 기록 작성 시 기본 선택할 칩. 다른 종류는 항상 false.
    @field:Schema(description = "기록 작성 시 기본 선택될 카테고리 칩인지 여부. 카테고리 외 종류는 항상 false.", example = "false")
    val default: Boolean,
) {
    companion object {
        fun from(chip: Chip, defaultChipId: Long? = null): ChipResponse = ChipResponse(
            id = requireNotNull(chip.id) { "저장되지 않은 Chip은 응답으로 변환할 수 없습니다." },
            type = chip.type,
            parentId = chip.parentId,
            label = chip.label,
            color = chip.color,
            personal = !chip.common,
            order = chip.displayOrder,
            default = chip.id == defaultChipId,
        )
    }
}
