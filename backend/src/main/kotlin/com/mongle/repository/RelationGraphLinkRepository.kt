package com.mongle.repository

import com.mongle.domain.RelationGraphLink
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/** 노드와 같은 규약: 소유자 단위 조회 + 전체 교체(하드삭제 후 재삽입). */
interface RelationGraphLinkRepository : JpaRepository<RelationGraphLink, Long> {
    fun findByOwnerIdOrderByIdAsc(ownerId: UUID): List<RelationGraphLink>

    @Transactional
    fun deleteByOwnerId(ownerId: UUID)
}
