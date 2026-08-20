package com.mongle.controller.dto

import com.mongle.domain.Zone
import io.swagger.v3.oas.annotations.media.Schema

/**
 * 이름의 빈값·글자수·중복 검증은 서비스 계층 Validators 로 미룬다(REQUIRED_FIELD·LENGTH_EXCEEDED·DUPLICATE 코드가 필요).
 * DTO @Size 로 걸면 @Valid 실패가 INVALID_INPUT 으로 뭉뚱그려지기 때문(ChipDtos 와 같은 이유).
 */
@Schema(description = "존 생성 요청. 사용자가 이름 붙인 인물 묶음을 만든다.")
data class ZoneCreateRequest(
    @field:Schema(description = "존 이름(별칭). 내 존 안에서 중복될 수 없다.", example = "최애존")
    val name: String,
    @field:Schema(description = "존 표시 색상(hex). 없으면 무채색으로 그린다.", example = "#E06A2B", nullable = true)
    val color: String? = null,
)

@Schema(description = "존 수정 요청. 이름과 색만 바꾼다.")
data class ZoneUpdateRequest(
    @field:Schema(description = "새 이름. 내 존 안에서 중복될 수 없다.", example = "말잇못존")
    val name: String,
    @field:Schema(description = "존 표시 색상(hex). null 이면 색상을 비운다.", example = "#22A06B", nullable = true)
    val color: String? = null,
)

@Schema(description = "존 인물 할당 요청. 지금 상태를 통째로 보내 교체한다(부분 추가·삭제 없음).")
data class ZonePersonsRequest(
    @field:Schema(description = "이 존에 담을 인물 id 목록. 내 소유·active 인물만 허용하고, 중복 id 는 첫 등장만 남는다.", example = "[7, 12, 19]")
    val personIds: List<Long>,
)

@Schema(description = "존 응답. 홈에서 좌우로 넘기는 우주 한 장에 대응한다.")
data class ZoneResponse(
    @field:Schema(description = "존 id.", example = "3")
    val id: Long,
    @field:Schema(description = "존 이름(별칭).", example = "최애존")
    val name: String,
    @field:Schema(description = "존 표시 색상(hex).", example = "#E06A2B", nullable = true)
    val color: String?,
    @field:Schema(description = "좌우 스와이프 순서(오름차순).", example = "0")
    val order: Int,
    // 관계 지도를 다시 부르지 않고 프론트가 노드를 나눌 수 있게 id 만 싣는다(우주 전환이 서버 왕복이면 스와이프가 끊긴다).
    @field:Schema(description = "이 존에 속한 인물 id 목록. 할당 순서를 보존하며 삭제된 인물은 빠진다.", example = "[7, 12, 19]")
    val personIds: List<Long>,
) {
    companion object {
        fun from(zone: Zone, personIds: List<Long>): ZoneResponse = ZoneResponse(
            id = requireNotNull(zone.id) { "저장되지 않은 Zone은 응답으로 변환할 수 없습니다." },
            name = zone.name,
            color = zone.color,
            order = zone.displayOrder,
            personIds = personIds,
        )
    }
}
