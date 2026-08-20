package com.mongle.repository

import com.mongle.domain.RelationGraphNode
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * 그래프는 사용자당 한 장이라 소유자로만 긁는다. 저장은 전체 교체(deleteByOwnerId 후 재삽입,
 * 하드삭제 기본 — 조인 엔티티 규약). 순서는 id 오름차순으로 고정해 표시 결정성을 지킨다.
 */
interface RelationGraphNodeRepository : JpaRepository<RelationGraphNode, Long> {
    fun findByOwnerIdOrderByIdAsc(ownerId: UUID): List<RelationGraphNode>

    @Transactional
    fun deleteByOwnerId(ownerId: UUID)
}
