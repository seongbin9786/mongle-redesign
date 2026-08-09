package com.mongle.repository

import com.mongle.domain.Event
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate
import java.util.UUID

/**
 * 조회는 항상 소유자·active(deletedAt IS NULL)로 거른다(SoftDeletableEntity 규약).
 * 인물별 집계는 EventPerson 조인 엔티티를 JOIN 하는 JPQL 로 연다(컨벤션 §1) —
 * 파생 스탯(#30)·홈(#41 #43)·타임라인(#44~46)이 이 진입점을 확장한다.
 */
interface EventRepository : JpaRepository<Event, Long> {
    fun findByIdAndOwnerIdAndDeletedAtIsNull(id: Long, ownerId: UUID): Event?

    // 전역 타임라인(#44~46): 최신 날짜 먼저, 같은 날은 최근 저장 먼저.
    fun findByOwnerIdAndDeletedAtIsNullOrderByOccurredDateDescIdDesc(ownerId: UUID): List<Event>

    // 사람별 피드(#44) — 대표/비대표 구분 없이 연결된 모든 기록.
    @Query(
        "SELECT e FROM Event e, EventPerson ep WHERE ep.eventId = e.id " +
            "AND ep.personId = :personId AND e.deletedAt IS NULL ORDER BY e.occurredDate DESC, e.id DESC",
    )
    fun findByPersonId(
        @Param("personId") personId: Long,
    ): List<Event>

    // 카테고리 필터(#46) / 만난 횟수 기초(#30).
    @Query(
        "SELECT e FROM Event e, EventPerson ep WHERE ep.eventId = e.id " +
            "AND ep.personId = :personId AND e.categoryChipId = :categoryChipId AND e.deletedAt IS NULL " +
            "ORDER BY e.occurredDate DESC, e.id DESC",
    )
    fun findByPersonIdAndCategoryChipId(
        @Param("personId") personId: Long,
        @Param("categoryChipId") categoryChipId: Long,
    ): List<Event>

    // 함께한 기록 수(#30).
    @Query(
        "SELECT COUNT(e) FROM Event e, EventPerson ep WHERE ep.eventId = e.id " +
            "AND ep.personId = :personId AND e.deletedAt IS NULL",
    )
    fun countByPersonId(
        @Param("personId") personId: Long,
    ): Long

    // 디렉토리 '기록 많은 순' 정렬·목록 표시용 배치 집계 — 인물 수만큼 countByPersonId 를 도는 N+1 을 막는다.
    // 기록이 0건인 인물은 결과에 없으므로 호출부가 0으로 채운다.
    @Query(
        "SELECT new com.mongle.repository.PersonRecordCount(ep.personId, COUNT(e)) FROM Event e, EventPerson ep " +
            "WHERE ep.eventId = e.id AND ep.personId IN :personIds AND e.deletedAt IS NULL GROUP BY ep.personId",
    )
    fun countByPersonIdIn(
        @Param("personIds") personIds: Collection<Long>,
    ): List<PersonRecordCount>

    // 만난 횟수(#30): 만남 카테고리 기록의 고유 날짜 수(같은 날 여러 건은 1회).
    @Query(
        "SELECT COUNT(DISTINCT e.occurredDate) FROM Event e, EventPerson ep WHERE ep.eventId = e.id " +
            "AND ep.personId = :personId AND e.categoryChipId = :categoryChipId AND e.deletedAt IS NULL",
    )
    fun countDistinctOccurredDateByPersonIdAndCategoryChipId(
        @Param("personId") personId: Long,
        @Param("categoryChipId") categoryChipId: Long,
    ): Long

    // 만남 카테고리 고유 날짜(최신 먼저) — 만난 횟수·마지막 만남·만남 주기(#30 #41)의 단일 근거.
    @Query(
        "SELECT DISTINCT e.occurredDate FROM Event e, EventPerson ep WHERE ep.eventId = e.id " +
            "AND ep.personId = :personId AND e.categoryChipId = :categoryChipId AND e.deletedAt IS NULL " +
            "ORDER BY e.occurredDate DESC",
    )
    fun findDistinctMeetingDatesDesc(
        @Param("personId") personId: Long,
        @Param("categoryChipId") categoryChipId: Long,
    ): List<LocalDate>

    // 날짜 범위(#41 친밀도).
    @Query(
        "SELECT e FROM Event e, EventPerson ep WHERE ep.eventId = e.id " +
            "AND ep.personId = :personId AND e.occurredDate BETWEEN :from AND :to AND e.deletedAt IS NULL " +
            "ORDER BY e.occurredDate DESC, e.id DESC",
    )
    fun findByPersonIdAndOccurredDateBetween(
        @Param("personId") personId: Long,
        @Param("from") from: LocalDate,
        @Param("to") to: LocalDate,
    ): List<Event>

    // 1년 전 오늘 회고(#43): 같은 월·일의 지난 기록.
    @Query(
        "SELECT e FROM Event e WHERE e.ownerId = :ownerId AND e.deletedAt IS NULL " +
            "AND MONTH(e.occurredDate) = :month AND DAY(e.occurredDate) = :day " +
            "ORDER BY e.occurredDate DESC, e.id DESC",
    )
    fun findByOwnerIdAndMonthDay(
        @Param("ownerId") ownerId: UUID,
        @Param("month") month: Int,
        @Param("day") day: Int,
    ): List<Event>
}
