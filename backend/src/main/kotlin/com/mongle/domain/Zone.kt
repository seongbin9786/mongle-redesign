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
 * 존(사용자가 이름 붙인 인물 묶음). 홈에서 좌우로 넘기는 우주 한 장이 존 하나다.
 *
 * 칩과 달리 **공통(ownerId == null)이 없다** — 존의 이름은 사용자의 언어("최애존"·"말잇못존")라
 * 제품이 미리 정해 줄 수 없다. 그래서 소유자 없는 존은 만들지 않는다.
 * 인물 연결은 ZonePerson 조인 엔티티가 든다(컨벤션 §1).
 */
@Entity
@Table(
    name = "zone",
    indexes = [Index(name = "idx_zone_owner", columnList = "owner_id")],
)
class Zone(
    @Column(name = "owner_id", nullable = false, updatable = false)
    val ownerId: UUID,
    @Column(nullable = false)
    var name: String,
    @Column(length = 7)
    var color: String? = null,
    // 좌우 스와이프 순서(오름차순). order 는 SQL 예약어라 display_order.
    @Column(name = "display_order", nullable = false)
    var displayOrder: Int,
) : SoftDeletableEntity() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null

    fun rename(name: String) {
        this.name = name
    }

    fun changeColor(color: String?) {
        this.color = color
    }
}
