package com.mongle.repository

import com.mongle.domain.Chip
import com.mongle.domain.ChipType
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

/**
 * 조회는 "새로 고를 목록"이므로 항상 deletedAt IS NULL 로 거른다(SoftDeletableEntity 규약).
 * 소유 계층은 ownerId 로 분리: IsNull=공통, ownerId=개인.
 */
interface ChipRepository : JpaRepository<Chip, Long> {
    fun findByTypeAndOwnerIdIsNullAndDeletedAtIsNullOrderByDisplayOrderAsc(type: ChipType): List<Chip>

    fun findByTypeAndOwnerIdAndDeletedAtIsNullOrderByDisplayOrderAsc(type: ChipType, ownerId: UUID): List<Chip>

    // 만남 카테고리 앵커(기록 파생 갱신 #36)·시드 멱등성 — 공통 칩은 rename·삭제 불가라 라벨이 안정적 식별자.
    fun findByTypeAndOwnerIdIsNullAndLabelAndDeletedAtIsNull(type: ChipType, label: String): Chip?

    // 중복 검사(생성) — 공통 전체 + 내 개인 active.
    fun existsByTypeAndOwnerIdIsNullAndLabelAndDeletedAtIsNull(type: ChipType, label: String): Boolean

    fun existsByTypeAndOwnerIdAndLabelAndDeletedAtIsNull(type: ChipType, ownerId: UUID, label: String): Boolean

    // 중복 검사(이름 변경) — 자기 자신 제외.
    fun existsByTypeAndOwnerIdAndLabelAndDeletedAtIsNullAndIdNot(type: ChipType, ownerId: UUID, label: String, id: Long): Boolean

    // 새 개인 칩의 표시 순서 계산용 — 그 종류 개인 칩 중 가장 큰 순서.
    fun findFirstByTypeAndOwnerIdOrderByDisplayOrderDesc(type: ChipType, ownerId: UUID): Chip?

    // 종류별 개인 칩 개수(상한 판정) — 소프트삭제 제외.
    fun countByTypeAndOwnerIdAndDeletedAtIsNull(type: ChipType, ownerId: UUID): Int

    // 이름변경 대상 — 내 소유·active 개인 칩만. 공통(ownerId null)·타인·이미 지운 칩은 안 잡힌다.
    fun findByIdAndOwnerIdAndDeletedAtIsNull(id: Long, ownerId: UUID): Chip?

    // 계층 칩(소속) — 루트 삭제 시 함께 지울 자식, 그리고 손자 생성 차단 판정.
    fun findByParentIdAndDeletedAtIsNull(parentId: Long): List<Chip>

    fun existsByParentIdAndDeletedAtIsNull(parentId: Long): Boolean
}
