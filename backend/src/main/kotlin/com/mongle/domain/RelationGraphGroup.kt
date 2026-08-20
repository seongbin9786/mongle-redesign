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
 * 인물관계도의 **영역**(지도 위 한 구역). 관계태그로 불러온 무리가 여기 담긴다.
 *
 * 영역은 서버가 정의하는 분류가 아니라 **사용자가 지도 위에 그어 둔 구획**이다. 그래서
 * 관계태그(chip)를 참조하지 않고 이름·색을 복사해 든다 — 태그 이름이 바뀌어도 지도 위 구획은
 * 사용자가 놓아둔 그대로 남아야 하고, 태그를 지웠다고 지도에 구멍이 나서도 안 된다.
 *
 * 노드는 서버 id 가 아니라 **key**(예: `tag:12`)로 영역을 가리킨다. 그래프는 통째로 교체되는데
 * id 로 묶으면 저장할 때마다 새 id 를 받아 와야 하고, 그 왕복 동안 화면과 서버가 갈린다.
 */
@Entity
@Table(
    name = "relation_graph_group",
    indexes = [Index(name = "idx_relation_graph_group_owner", columnList = "owner_id")],
)
class RelationGraphGroup(
    @Column(name = "owner_id", nullable = false, updatable = false)
    val ownerId: UUID,
    @Column(name = "group_key", nullable = false, length = 40, updatable = false)
    val key: String,
    @Column(nullable = false)
    var name: String,
    @Column(length = 7)
    var color: String? = null,
    @Column(nullable = false)
    var x: Double,
    @Column(nullable = false)
    var y: Double,
    @Column(nullable = false)
    var width: Double,
    @Column(nullable = false)
    var height: Double,
) : BaseEntity() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null
}
