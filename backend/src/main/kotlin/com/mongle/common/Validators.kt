package com.mongle.common

import com.mongle.common.exception.BusinessException
import com.mongle.common.exception.ErrorCode
import java.time.LocalDate
import java.time.LocalDateTime

/**
 * 서비스 계층 공통 검증. 위반 시 §12.5 문구를 담은 BusinessException 을 던진다.
 *
 * 글자수 검증도 DTO @Size 가 아니라 여기서 한다 — @Valid 실패는 INVALID_INPUT 으로
 * 뭉뚱그려져 LENGTH_EXCEEDED 코드를 잃는다(ValidationLimits 주석 참조).
 */
object Validators {
    /** 필수 값. 대상에 맞는 §12.5 문구(예: Messages.REQUIRED_NAME)를 넘긴다. */
    fun requireNotBlank(value: String?, message: String) {
        if (value.isNullOrBlank()) throw BusinessException(ErrorCode.REQUIRED_FIELD, message)
    }

    /** 글자수 한도(LENGTH_EXCEEDED). 모든 글자수 검증의 단일 경로. */
    fun maxLength(value: String, max: Int) {
        if (value.length > max) {
            throw BusinessException(ErrorCode.LENGTH_EXCEEDED, Messages.lengthExceeded(max))
        }
    }

    fun notFuture(date: LocalDate, today: LocalDate = LocalDate.now()) {
        if (date.isAfter(today)) throw BusinessException(ErrorCode.FUTURE_DATE)
    }

    fun notFuture(dateTime: LocalDateTime, now: LocalDateTime = LocalDateTime.now()) {
        if (dateTime.isAfter(now)) throw BusinessException(ErrorCode.FUTURE_DATE)
    }

    /** 마지막 만난 날은 처음 만난 날 이후여야 한다(둘 다 있을 때만 검사). */
    fun dateOrder(first: LocalDate?, last: LocalDate?) {
        if (first != null && last != null && last.isBefore(first)) {
            throw BusinessException(ErrorCode.DATE_ORDER)
        }
    }

    /** 한 번에 고를 수 있는 최대 개수(감정 5·관계태그 10 등). 대상별 확정 문구(Messages.xxxSelectionLimit)가 있으면 넘긴다. */
    fun maxSelection(size: Int, max: Int, message: String = Messages.SELECTION_LIMIT) {
        if (size > max) throw BusinessException(ErrorCode.SELECTION_LIMIT, message)
    }

    /** 개인 칩 종류별 개수 상한. currentCount 는 만들기 전 기존 개수. */
    fun chipKindLimit(currentCount: Int, max: Int = ValidationLimits.CHIP_PER_KIND_MAX) {
        if (currentCount >= max) {
            throw BusinessException(ErrorCode.CHIP_LIMIT, Messages.chipKindLimitExceeded(max))
        }
    }

    /** 존 개수 상한. currentCount 는 만들기 전 기존 개수. */
    fun zoneLimit(currentCount: Int, max: Int = ValidationLimits.ZONE_MAX) {
        if (currentCount >= max) {
            throw BusinessException(ErrorCode.ZONE_LIMIT, Messages.zoneLimitExceeded(max))
        }
    }

    /** 이미 있는 항목(같은 종류 내 중복 등). */
    fun rejectDuplicate(exists: Boolean) {
        if (exists) throw BusinessException(ErrorCode.DUPLICATE)
    }
}
