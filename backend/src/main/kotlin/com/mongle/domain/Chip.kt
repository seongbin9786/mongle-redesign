package com.mongle.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import java.util.UUID

/**
 * 칩(감정·날씨·카테고리·관계태그 라벨).
 *
 * 소유는 ownerId 로 구분한다: null=공통(모두 공유)·값=개인(그 사용자만). (00-infra 소유 컨텍스트)
 * 기록·인물은 이 id 를 참조하고 label 은 복사 저장하지 않는다 —
 * 이름을 바꾸면 id 그대로라 지난 기록·인물에 저절로 반영된다.
 * 공통 칩의 "개인 숨김"은 여기서 지우지 않고 별도 ChipHide 로 표현한다(타인 영향 차단).
 */
@Entity
@Table(
    name = "chip",
    indexes = [Index(name = "idx_chip_type_owner", columnList = "type, owner_id")],
)
class Chip(
    /**
     * columnDefinition 으로 문자열 컬럼을 못박는다 — 기본 매핑은 MySQL 네이티브 ENUM 을 만드는데,
     * `ddl-auto: update` 는 기존 ENUM 에 값을 더해주지 못해 종류가 늘 때마다 기동이 깨진다
     * (AFFILIATION 추가 때 실제로 겪음: "Data truncated for column 'type'").
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, columnDefinition = "varchar(32)")
    val type: ChipType,
    // null = 공통, 값 = 개인 소유자. 소유는 생성 후 바뀌지 않는다.
    @Column(name = "owner_id", updatable = false)
    val ownerId: UUID?,
    @Column(nullable = false)
    var label: String,
    @Column(length = 7)
    var color: String? = null,
    // 같은 종류·계층 안에서의 표시 순서(오름차순). order 는 SQL 예약어라 display_order.
    @Column(name = "display_order", nullable = false)
    var displayOrder: Int,
    /**
     * 상위 칩 id. ChipType.nestable(현재 소속)만 값을 가질 수 있고 깊이는 1단계다 —
     * 부모는 언제나 parentId 가 null 인 루트라, 이 컬럼 하나로 계층 전체가 표현된다.
     * 연관관계 대신 id 참조를 쓰는 이유는 다른 칩 참조(인물·기록)와 같다(컨벤션 §1).
     */
    @Column(name = "parent_id")
    var parentId: Long? = null,
) : SoftDeletableEntity() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null

    val common: Boolean
        get() = ownerId == null

    val root: Boolean
        get() = parentId == null

    fun rename(label: String) {
        this.label = label
    }

    fun changeColor(color: String?) {
        this.color = color
    }

    fun moveUnder(parentId: Long?) {
        this.parentId = parentId
    }
}
