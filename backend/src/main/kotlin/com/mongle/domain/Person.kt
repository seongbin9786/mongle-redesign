package com.mongle.domain

import jakarta.persistence.CollectionTable
import jakarta.persistence.Column
import jakarta.persistence.ElementCollection
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.JoinColumn
import jakarta.persistence.OrderColumn
import jakarta.persistence.Table
import java.time.LocalDate
import java.util.UUID

/**
 * 인물(관계를 맺은 사람).
 *
 * 소유는 UUID ownerId에 귀속되고 소프트삭제를 상속한다 — 지워도 과거 참조(기록)에는 값이 남는 규약(SoftDeletableEntity).
 * 관계 태그(RELATION_TAG 칩)·소속(AFFILIATION 칩)은 label 을 복사하지 않고 id 만 참조한다(#22) —
 * 칩 이름을 바꾸면 저절로 반영된다. 소속은 사람당 하나라 조인 엔티티 없이 컬럼 하나로 든다.
 */
@Entity
@Table(
    name = "person",
    indexes = [Index(name = "idx_person_owner", columnList = "owner_id")],
)
class Person(
    @Column(name = "owner_id", nullable = false, updatable = false)
    val ownerId: UUID,
    @Column(nullable = false)
    var name: String,
    // 생일 연도-선택: 월·일은 함께 있거나 함께 없고(생일 자체가 선택), 연도만 따로 생략 가능(연도 없이 월 일만).
    @Column(name = "birth_year")
    var birthYear: Int? = null,
    @Column(name = "birth_month")
    var birthMonth: Int? = null,
    @Column(name = "birth_day")
    var birthDay: Int? = null,
    @Column(name = "first_met_date")
    var firstMetDate: LocalDate? = null,
    @Column(name = "last_met_date")
    var lastMetDate: LocalDate? = null,
    // 미리 업로드된 프로필 사진 경로 1장(업로드는 POST /api/images).
    @Column(name = "profile_image_url")
    var profileImageUrl: String? = null,
    // 기본 아바타 선택용 성별 힌트. 미선택 가능.
    @Enumerated(EnumType.STRING)
    @Column(name = "gender")
    var gender: PersonGender? = null,
    /**
     * 소속(AFFILIATION 칩) 한 개. 관계 태그가 여러 개 붙는 라벨이라면, 소속은 "이 사람이 어디 사람인가"를
     * 하나로 답하는 축이다 — 목록에서 아바타 ring 색이 이 값으로 결정된다.
     * 칩과 마찬가지로 label 을 복사하지 않고 id 만 참조한다(#22).
     */
    @Column(name = "affiliation_chip_id")
    var affiliationChipId: Long? = null,
    /**
     * (레거시) 소속 도입 전의 자유 텍스트 관계 유형. API 에서는 사라졌고 AffiliationBackfill 만 읽는다 —
     * 백필이 소속 칩으로 승격한 뒤 null 로 비운다. 새로 채워지는 일은 없다.
     */
    @Column(name = "relation_type")
    var relationType: String? = null,
    @Column(nullable = false)
    var favorite: Boolean = false,
) : SoftDeletableEntity() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null

    // 관계 태그(RELATION_TAG 칩)는 PersonRelationTag 조인 엔티티로 연결한다(#22, 컨벤션 §1) — 이 엔티티는 id 만 보유.

    // 취향 2종(좋아하는 것·조심할 것). 입력 순서를 보존한다. #23
    @ElementCollection
    @CollectionTable(name = "person_like", joinColumns = [JoinColumn(name = "person_id")])
    @OrderColumn(name = "item_order")
    @Column(name = "item")
    val likes: MutableList<String> = mutableListOf()

    @ElementCollection
    @CollectionTable(name = "person_caution", joinColumns = [JoinColumn(name = "person_id")])
    @OrderColumn(name = "item_order")
    @Column(name = "item")
    val cautions: MutableList<String> = mutableListOf()

    fun replaceLikes(items: List<String>) {
        likes.clear()
        likes.addAll(items)
    }

    fun replaceCautions(items: List<String>) {
        cautions.clear()
        cautions.addAll(items)
    }

    /** 즐겨찾기 on/off 토글(별도 확인 없음). #28 */
    fun toggleFavorite() {
        favorite = !favorite
    }

    /**
     * 기록(event)이 더 최근 만남을 반영하는 진입점(파생 단계 #30). 더 최근일 때만 앞당긴다.
     * 여기서 열어두어 이후 event 연동이 이 필드를 막지 않게 한다.
     */
    fun updateLastMetIfNewer(date: LocalDate) {
        // 파생 갱신이 사용자가 확정한 '처음 만난 날'을 침범하지 않는다 — 처음보다 앞선 기록 날짜는 무시(불변식 '마지막 ≥ 처음' 유지).
        if (firstMetDate != null && date.isBefore(firstMetDate)) return
        if (lastMetDate == null || date.isAfter(lastMetDate)) {
            lastMetDate = date
        }
    }
}

enum class PersonGender {
    FEMALE,
    MALE,
}
