package com.mongle.service

import com.mongle.common.HexColor
import com.mongle.common.Messages
import com.mongle.common.ValidationLimits
import com.mongle.common.Validators
import com.mongle.common.exception.BusinessException
import com.mongle.common.exception.ErrorCode
import com.mongle.domain.Chip
import com.mongle.domain.ChipHide
import com.mongle.domain.ChipType
import com.mongle.repository.ChipHideRepository
import com.mongle.repository.ChipRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class ChipService(
    private val chipRepository: ChipRepository,
    private val chipHideRepository: ChipHideRepository,
) {
    /**
     * 사용자 시점 목록 = 공통(안 숨긴 것) + 내 개인(안 지운 것). 공통 먼저·각 표시순서.
     * 다른 서비스(기록·인물)의 칩 참조 검증도 이 집합을 기준으로 한다.
     */
    fun visibleChips(userId: UUID, type: ChipType): List<Chip> {
        val hidden = chipHideRepository.findByOwnerId(userId).map { it.chipId }.toSet()
        val common = chipRepository
            .findByTypeAndOwnerIdIsNullAndDeletedAtIsNullOrderByDisplayOrderAsc(type)
            .filter { it.id !in hidden }
        val personal = chipRepository
            .findByTypeAndOwnerIdAndDeletedAtIsNullOrderByDisplayOrderAsc(type, userId)
        return common + personal
    }

    @Transactional
    fun create(userId: UUID, type: ChipType, rawLabel: String, rawColor: String? = null, parentId: Long? = null): Chip {
        val label = rawLabel.trim()
        Validators.requireNotBlank(label, Messages.REQUIRED_CHIP_NAME)
        Validators.maxLength(label, ValidationLimits.CHIP_NAME_MAX)
        val parent = resolveParent(userId, type, parentId)
        // 하위 소속은 색을 갖지 않는다 — 표시 색은 루트가 정한다(mustpass people-directory).
        val color = if (parent == null) normalizeColor(rawColor) else null
        assertNoDuplicate(userId, type, label, parentId = parent?.id)
        Validators.chipKindLimit(chipRepository.countByTypeAndOwnerIdAndDeletedAtIsNull(type, userId))

        val nextOrder = (chipRepository.findFirstByTypeAndOwnerIdOrderByDisplayOrderDesc(type, userId)?.displayOrder ?: -1) + 1
        return chipRepository.save(
            Chip(type = type, ownerId = userId, label = label, color = color, displayOrder = nextOrder, parentId = parent?.id),
        )
    }

    @Transactional
    fun rename(userId: UUID, chipId: Long, rawLabel: String, rawColor: String? = null, parentId: Long? = null): Chip {
        // 개인 칩만 이름을 바꾼다 — 공통·타인·없는 칩은 여기서 잡히지 않아 NOT_FOUND.
        val chip = chipRepository.findByIdAndOwnerIdAndDeletedAtIsNull(chipId, userId)
            ?: throw BusinessException(ErrorCode.NOT_FOUND)
        val label = rawLabel.trim()
        Validators.requireNotBlank(label, Messages.REQUIRED_CHIP_NAME)
        Validators.maxLength(label, ValidationLimits.CHIP_NAME_MAX)
        val parent = resolveParent(userId, chip.type, parentId, movingChipId = chipId)
        val color = if (parent == null) normalizeColor(rawColor) else null
        assertNoDuplicate(userId, chip.type, label, parentId = parent?.id, excludeId = chipId)
        chip.rename(label)
        chip.changeColor(color)
        chip.moveUnder(parent?.id)
        return chip
    }

    /**
     * 하나의 삭제 요청을 소유에 따라 분기한다:
     * 공통 칩 → 그 사용자에게만 숨김(원본 불변, 타인 무관), 개인 칩 → 소프트삭제(과거 기록 값 유지).
     * 타인 개인 칩·없는 칩은 NOT_FOUND. 이미 지운/숨긴 칩 재요청은 멱등.
     */
    @Transactional
    fun delete(userId: UUID, chipId: Long) {
        val chip = chipRepository.findById(chipId).orElseThrow { BusinessException(ErrorCode.NOT_FOUND) }
        assertCategoryMinimum(userId, chip)
        when {
            chip.common -> hideCommon(userId, chip)
            chip.ownerId == userId -> {
                // 루트 소속을 지우면 하위도 함께 사라진다 — 부모 없는 하위가 남으면 목록에서 갈 곳이 없다.
                // 인물의 참조는 끊지 않는다(소프트삭제된 칩도 라벨을 유지하는 과거 참조 보존 규약).
                if (chip.type.nestable && chip.root) {
                    chipRepository.findByParentIdAndDeletedAtIsNull(chipId).forEach { it.softDelete() }
                }
                chip.softDelete()
            }
            else -> throw BusinessException(ErrorCode.NOT_FOUND)
        }
    }

    /**
     * 기록 작성 시 기본 선택할 카테고리 = 사용자 시점 카테고리 목록의 첫 칩(공통 먼저·order 순).
     * 시드상 `만남` 이 기본이고, 그게 삭제·숨김되면 다음 순서가 자연히 승계된다.
     */
    fun defaultCategoryId(userId: UUID): Long? = visibleChips(userId, ChipType.CATEGORY).firstOrNull()?.id

    /**
     * 만남 카테고리 칩 id(기록의 마지막 만남 파생 판정용 #36). 공통·전 사용자 공유라 userId 무관.
     * 기본 카테고리(defaultCategoryId, 사용자 시점 첫 칩)와 개념이 다르다 — 그건 폼 기본 선택,
     * 이건 "만남으로 세는 카테고리"의 고정 앵커다. 공통 만남 칩은 이름변경·삭제가 막혀 있어 id 가 안정적이다.
     */
    fun meetingCategoryId(): Long? = commonCategoryId(MEETING_CATEGORY_LABEL)

    /**
     * 공통 카테고리 칩 라벨 → id. 활동 흐름 레인(만남/연락/기념일) 앵커 해석용(#45).
     * 공통 칩은 전 사용자 공유라 userId 무관이며, 숨김(ChipHide)과 무관하게 레인 개념 자체는 고정이다.
     */
    fun commonCategoryId(label: String): Long? = chipRepository.findByTypeAndOwnerIdIsNullAndLabelAndDeletedAtIsNull(ChipType.CATEGORY, label)?.id

    companion object {
        // 시드(ChipSeeder)의 첫 카테고리 라벨과 동일해야 한다.
        const val MEETING_CATEGORY_LABEL = "만남"
    }

    /** 카테고리는 사용자 시점 목록이 최소 1개 유지 — 현재 보이는 마지막 1개를 지우려 하면 거절. */
    private fun assertCategoryMinimum(userId: UUID, chip: Chip) {
        if (chip.type != ChipType.CATEGORY) return
        val visible = visibleChips(userId, ChipType.CATEGORY)
        if (visible.size <= 1 && visible.any { it.id == chip.id }) {
            throw BusinessException(ErrorCode.CATEGORY_REQUIRED)
        }
    }

    private fun hideCommon(userId: UUID, chip: Chip) {
        val chipId = requireNotNull(chip.id)
        if (!chipHideRepository.existsByOwnerIdAndChipId(userId, chipId)) {
            chipHideRepository.save(ChipHide(ownerId = userId, chipId = chipId))
        }
    }

    /**
     * 상위 칩 해석. 계층을 안 쓰는 종류에 parentId 가 오거나(INVALID_INPUT),
     * 깊이 2단계를 만들려 하거나, 자기 자신을 부모로 삼으면 거절한다.
     * 없는·타인·다른 종류 칩은 NOT_FOUND.
     */
    private fun resolveParent(userId: UUID, type: ChipType, parentId: Long?, movingChipId: Long? = null): Chip? {
        if (parentId == null) return null
        if (!type.nestable) throw BusinessException(ErrorCode.INVALID_INPUT)
        if (parentId == movingChipId) throw BusinessException(ErrorCode.INVALID_INPUT)
        val parent = chipRepository.findByIdAndOwnerIdAndDeletedAtIsNull(parentId, userId)
            ?: throw BusinessException(ErrorCode.NOT_FOUND)
        if (parent.type != type) throw BusinessException(ErrorCode.NOT_FOUND)
        // 부모는 언제나 루트다 — 깊이는 1단계로 못 박는다.
        if (!parent.root) throw BusinessException(ErrorCode.INVALID_INPUT)
        // 자식이 있는 칩을 다른 칩 밑으로 넣으면 손자가 생긴다.
        if (movingChipId != null && chipRepository.existsByParentIdAndDeletedAtIsNull(movingChipId)) {
            throw BusinessException(ErrorCode.INVALID_INPUT)
        }
        return parent
    }

    /**
     * 같은 종류 안 중복(공통 전체 + 내 개인 active). excludeId 는 이름변경 시 자기 자신 제외.
     * 계층이 있는 종류(소속)는 **같은 부모 안에서만** 중복을 막는다 —
     * `학교 > 동아리` 와 `직장 > 동아리` 는 다른 소속이기 때문.
     */
    private fun assertNoDuplicate(userId: UUID, type: ChipType, label: String, parentId: Long? = null, excludeId: Long? = null) {
        if (type.nestable) {
            val siblingDup = visibleChips(userId, type)
                .any { it.id != excludeId && it.parentId == parentId && it.label == label }
            Validators.rejectDuplicate(siblingDup)
            return
        }
        val commonDup = chipRepository.existsByTypeAndOwnerIdIsNullAndLabelAndDeletedAtIsNull(type, label)
        val personalDup = if (excludeId == null) {
            chipRepository.existsByTypeAndOwnerIdAndLabelAndDeletedAtIsNull(type, userId, label)
        } else {
            chipRepository.existsByTypeAndOwnerIdAndLabelAndDeletedAtIsNullAndIdNot(type, userId, label, excludeId)
        }
        Validators.rejectDuplicate(commonDup || personalDup)
    }

    private fun normalizeColor(rawColor: String?): String? = HexColor.normalize(rawColor)
}
