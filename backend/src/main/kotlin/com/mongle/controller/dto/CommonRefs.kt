package com.mongle.controller.dto

import io.swagger.v3.oas.annotations.media.Schema

/**
 * 다른 도메인을 조회 응답에 요약 참조할 때의 공용 조각(컨벤션 §2 `{도메인}Ref`).
 * id 로 참조하되 표시값(라벨·이름)을 함께 실어 클라이언트가 재조회 없이 바로 그린다(수정 모드 재사용).
 * 라벨·이름은 소프트삭제된 칩·인물도 유지된다(과거 참조 보존, 00-infra).
 */
@Schema(description = "칩 요약 참조(id + 라벨). 소프트삭제된 칩도 라벨은 유지된다.")
data class ChipRef(
    @field:Schema(description = "칩 id.", example = "3")
    val id: Long,
    @field:Schema(description = "칩 라벨.", example = "만남")
    val label: String,
    @field:Schema(description = "칩 표시 색상(hex).", example = "#0EA5E9", nullable = true)
    val color: String? = null,
)

data class ChipDisplay(
    val label: String,
    val color: String?,
    // 소속 칩만 값을 갖는다(중첩 1단계). AffiliationRef 를 한 번의 칩 로드로 조립하기 위해 함께 싣는다.
    val parentId: Long? = null,
)

/**
 * 소속 요약 참조(중첩 1단계). 하위 소속이면 parent 에 루트가 실린다.
 * 표시 색은 **루트만** 갖는다 — 목록에서 사람의 ring 색은 루트 소속 하나로 결정된다.
 */
@Schema(description = "소속 요약 참조. 하위 소속이면 parent 에 루트가 실린다. 색은 루트만 갖는다.")
data class AffiliationRef(
    @field:Schema(description = "소속 칩 id.", example = "42")
    val id: Long,
    @field:Schema(description = "소속 라벨.", example = "대학교")
    val label: String,
    @field:Schema(description = "표시 색상(hex). 하위 소속은 null.", example = "#0EA5E9", nullable = true)
    val color: String? = null,
    @field:Schema(description = "상위 소속(루트). 루트 자신이면 null.", nullable = true)
    val parent: AffiliationRef? = null,
) {
    companion object {
        /** displays 는 소속 칩 id → 표시정보 맵. 상위 칩이 맵에 없으면(방어) 루트로 취급한다. */
        fun of(chipId: Long?, displays: Map<Long, ChipDisplay>): AffiliationRef? {
            val display = displays[chipId ?: return null] ?: return null
            val parent = display.parentId?.let { parentId ->
                displays[parentId]?.let { AffiliationRef(parentId, it.label, it.color) }
            }
            return AffiliationRef(chipId, display.label, display.color, parent)
        }
    }
}

@Schema(description = "인물 요약 참조(id + 이름). 소프트삭제된 인물도 이름은 유지된다.")
data class PersonRef(
    @field:Schema(description = "인물 id.", example = "7")
    val id: Long,
    @field:Schema(description = "인물 이름.", example = "김하늘")
    val name: String,
)
