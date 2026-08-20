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
 * 인물↔인물 연결 한 줄(인물관계도의 선). 인물끼리의 다대다라 조인 엔티티로 둔다(컨벤션 §1).
 *
 * **방향이 없다.** 'A가 B를 안다'와 'B가 A를 안다'는 같은 한 줄이라, 저장 전에
 * 작은 personId 를 fromPersonId 로 정렬해 넣는다(RelationGraphService) — 그래야 같은 쌍이
 * 두 행으로 갈리지 않는다. 방향이 필요해지는 날에는 이 정규화를 걷어내는 게 시작점이다.
 *
 * intimacy 는 사용자가 바로 끌어 정하는 0~100 눈금이다. 만남 기록에서 계산하는
 * 홈 궤도의 친밀도와는 **다른 축**이다 — 여기 값은 "내가 보기에 둘이 얼마나 가까운가"라
 * 서버가 대신 계산해 줄 근거가 없다.
 */
@Entity
@Table(
    name = "relation_graph_link",
    indexes = [Index(name = "idx_relation_graph_link_owner", columnList = "owner_id")],
)
class RelationGraphLink(
    @Column(name = "owner_id", nullable = false, updatable = false)
    val ownerId: UUID,
    @Column(name = "from_person_id", nullable = false, updatable = false)
    val fromPersonId: Long,
    @Column(name = "to_person_id", nullable = false, updatable = false)
    val toPersonId: Long,
    @Column(nullable = false)
    var intimacy: Int,
    @Column(length = 255)
    var note: String? = null,
) : BaseEntity() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null
}
