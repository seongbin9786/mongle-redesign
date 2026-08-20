package com.mongle.controller.dto

import com.mongle.domain.RelationGraphGroup
import com.mongle.domain.RelationGraphLink
import com.mongle.domain.RelationGraphNode
import io.swagger.v3.oas.annotations.media.Schema

/**
 * 인물관계도는 사용자당 **한 장**이라 자원 id 가 없다 — 통째로 받고 통째로 보낸다.
 * 메모 글자수 검증은 서비스 계층 Validators 로 미룬다(ZoneDtos 와 같은 이유).
 */
@Schema(description = "인물관계도의 영역(지도 위 한 구역). 관계태그로 불러온 무리가 여기 담긴다.")
data class GraphGroup(
    @field:Schema(description = "영역 식별자. 클라이언트가 정한다(관계태그로 만든 영역은 `tag:{chipId}`).", example = "tag:12")
    val key: String,
    @field:Schema(description = "영역 이름. 관계태그 이름을 복사해 둔다(태그가 바뀌어도 지도는 그대로다).", example = "직장")
    val name: String,
    @field:Schema(description = "영역 색(hex). 없으면 무채색으로 그린다.", example = "#22A06B", nullable = true)
    val color: String?,
    @field:Schema(description = "영역 왼쪽 위 x 좌표(px).", example = "40.0")
    val x: Double,
    @field:Schema(description = "영역 왼쪽 위 y 좌표(px).", example = "60.0")
    val y: Double,
    @field:Schema(description = "영역 너비(px).", example = "320.0")
    val width: Double,
    @field:Schema(description = "영역 높이(px).", example = "240.0")
    val height: Double,
)

@Schema(description = "인물관계도에 올린 인물 한 명. 좌표는 사용자가 손으로 잡아 둔 자리 그대로다.")
data class GraphNode(
    @field:Schema(description = "인물 id.", example = "7")
    val personId: Long,
    @field:Schema(description = "캔버스 x 좌표(px).", example = "120.5")
    val x: Double,
    @field:Schema(description = "캔버스 y 좌표(px).", example = "240.0")
    val y: Double,
    @field:Schema(description = "속한 영역의 key. 어느 구역에도 안 들면 null.", example = "tag:12", nullable = true)
    val groupKey: String? = null,
)

@Schema(description = "인물관계도의 연결 한 줄. 방향이 없어 (A,B)와 (B,A)는 같은 줄이다.")
data class GraphLink(
    @field:Schema(description = "연결된 인물 id 중 하나(저장 시 작은 id 로 정렬된다).", example = "7")
    val fromPersonId: Long,
    @field:Schema(description = "연결된 다른 인물 id.", example = "12")
    val toPersonId: Long,
    @field:Schema(description = "친밀도 0~100. 사용자가 바를 끌어 정한다(홈 궤도의 계산된 친밀도와 다른 축).", example = "70")
    val intimacy: Int,
    @field:Schema(description = "어떻게 아는 사이인지 한 줄 메모. 최대 200자.", example = "대학 동아리에서 만난 사이", nullable = true)
    val note: String?,
)

@Schema(description = "인물관계도 저장 요청. 지금 화면 상태를 통째로 보내 교체한다(부분 추가·삭제 없음).")
data class RelationGraphRequest(
    @field:Schema(description = "지도 위 영역 목록. key 가 겹치면 첫 등장만 남는다.")
    val groups: List<GraphGroup> = emptyList(),
    @field:Schema(description = "관계도에 올린 인물과 좌표. 내 소유·active 인물만 허용하고, 중복 인물은 첫 등장만 남는다.")
    val nodes: List<GraphNode>,
    @field:Schema(description = "연결 목록. 양끝이 모두 nodes 에 있어야 하고, 같은 쌍이 여러 번 오면 첫 등장만 남는다.")
    val links: List<GraphLink>,
)

@Schema(description = "인물관계도 응답. 사용자당 한 장이라 자원 id 가 없다.")
data class RelationGraphResponse(
    @field:Schema(description = "지도 위 영역 목록.")
    val groups: List<GraphGroup>,
    @field:Schema(description = "관계도에 올린 인물과 좌표.")
    val nodes: List<GraphNode>,
    @field:Schema(description = "연결 목록.")
    val links: List<GraphLink>,
) {
    companion object {
        fun from(
            groups: List<RelationGraphGroup>,
            nodes: List<RelationGraphNode>,
            links: List<RelationGraphLink>,
        ): RelationGraphResponse = RelationGraphResponse(
            groups = groups.map {
                GraphGroup(
                    key = it.key,
                    name = it.name,
                    color = it.color,
                    x = it.x,
                    y = it.y,
                    width = it.width,
                    height = it.height,
                )
            },
            nodes = nodes.map { GraphNode(personId = it.personId, x = it.x, y = it.y, groupKey = it.groupKey) },
            links = links.map {
                GraphLink(
                    fromPersonId = it.fromPersonId,
                    toPersonId = it.toPersonId,
                    intimacy = it.intimacy,
                    note = it.note,
                )
            },
        )
    }
}
