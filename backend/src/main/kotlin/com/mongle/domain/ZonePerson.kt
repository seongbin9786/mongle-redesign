package com.mongle.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table

/**
 * 존↔인물 연결(다대다 조인 엔티티, 컨벤션 §1).
 *
 * 한 인물이 여러 존에 속할 수 있다 — 존은 배타적 분류가 아니라 겹쳐 보는 렌즈다.
 * 교체는 deleteByZoneId 후 재삽입(하드삭제 기본, PersonRelationTag 와 같은 규약).
 * 인물을 소프트삭제해도 이 행은 지우지 않는다 — 조회에서 active 인물만 남겨 거른다.
 */
@Entity
@Table(
    name = "zone_person",
    indexes = [Index(name = "idx_zone_person_zone", columnList = "zone_id")],
)
class ZonePerson(
    @Column(name = "zone_id", nullable = false, updatable = false)
    val zoneId: Long,
    @Column(name = "person_id", nullable = false, updatable = false)
    val personId: Long,
    @Column(name = "display_order", nullable = false)
    val displayOrder: Int,
) : BaseEntity() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null
}
