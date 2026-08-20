package com.mongle.repository

import com.mongle.domain.RelationGraphGroup
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/** 노드·선과 같은 규약: 소유자 단위 조회 + 전체 교체(하드삭제 후 재삽입). */
interface RelationGraphGroupRepository : JpaRepository<RelationGraphGroup, Long> {
    fun findByOwnerIdOrderByIdAsc(ownerId: UUID): List<RelationGraphGroup>

    @Transactional
    fun deleteByOwnerId(ownerId: UUID)
}
