package com.mongle.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import java.util.UUID

/**
 * 인물관계도에 올려 둔 인물 한 명과 그 좌표.
 *
 * 좌표를 서버가 드는 이유: 관계도는 "누가 누구를 아는가"를 **배치로** 읽는 그림이라,
 * 자리를 잃으면 선만 남아도 같은 그림이 아니다. 자동 레이아웃을 넣기 전까지는
 * 사용자가 손으로 잡아 둔 자리가 곧 데이터다.
 *
 * 인물은 id 로만 참조한다(컨벤션 §1). 인물을 소프트삭제해도 이 행은 지우지 않고,
 * 조회에서 active 인물만 남겨 거른다(ZonePerson 과 같은 규약).
 */
@Entity
@Table(
    name = "relation_graph_node",
    indexes = [Index(name = "idx_relation_graph_node_owner", columnList = "owner_id")],
)
class RelationGraphNode(
    @Column(name = "owner_id", nullable = false, updatable = false)
    val ownerId: UUID,
    @Column(name = "person_id", nullable = false, updatable = false)
    val personId: Long,
    @Column(nullable = false)
    var x: Double,
    @Column(nullable = false)
    var y: Double,
    // 속한 영역(RelationGraphGroup.key). 어느 구역에도 안 든 인물은 null 이다 —
    // 지도에서 '아직 아무 데도 속하지 않음'은 오류가 아니라 정상 상태다.
    @Column(name = "group_key", length = 40)
    var groupKey: String? = null,
) : BaseEntity() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null
}
