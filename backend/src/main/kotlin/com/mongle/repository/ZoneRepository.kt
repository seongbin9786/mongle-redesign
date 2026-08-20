package com.mongle.repository

import com.mongle.domain.Zone
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

/**
 * 조회는 항상 소유자·active(deletedAt IS NULL)로 거른다(SoftDeletableEntity 규약).
 * 존은 과거 기록이 참조하지 않으므로 "지운 존"을 되살려 보여줄 경로가 없다 — active 조회만 둔다.
 */
interface ZoneRepository : JpaRepository<Zone, Long> {
    fun findByOwnerIdAndDeletedAtIsNullOrderByDisplayOrderAscIdAsc(ownerId: UUID): List<Zone>

    fun findByIdAndOwnerIdAndDeletedAtIsNull(id: Long, ownerId: UUID): Zone?
}
