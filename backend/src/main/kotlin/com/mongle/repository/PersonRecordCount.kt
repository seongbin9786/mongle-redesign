package com.mongle.repository

/**
 * 인물별 기록 수 집계 행(JPQL 생성자 표현식 대상).
 * 디렉토리 정렬·표시가 인물 수와 무관하게 쿼리 1번으로 끝나게 하려고 둔다.
 */
data class PersonRecordCount(
    val personId: Long,
    val count: Long,
)
