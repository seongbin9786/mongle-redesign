package com.mongle.repository

import com.mongle.domain.ZonePerson
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.transaction.annotation.Transactional

/**
 * 존의 인물 연결 행. 순서(displayOrder)는 할당 순서 보존.
 * 교체는 deleteByZoneId 후 재삽입(하드삭제 기본). 배치 조회는 findByZoneIdIn 으로 N+1 을 막는다.
 */
interface ZonePersonRepository : JpaRepository<ZonePerson, Long> {
    fun findByZoneIdInOrderByZoneIdAscDisplayOrderAsc(zoneIds: Collection<Long>): List<ZonePerson>

    @Transactional
    fun deleteByZoneId(zoneId: Long)
}
