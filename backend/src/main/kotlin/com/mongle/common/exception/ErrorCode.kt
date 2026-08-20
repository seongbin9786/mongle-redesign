package com.mongle.common.exception

import com.mongle.common.Messages
import org.springframework.http.HttpStatus

/**
 * 애플리케이션 에러 코드. 새 에러 유형은 여기에 추가한다.
 *
 * message 는 사용자에게 그대로 보여줄 수 있는 §12.5 문구의 기본값이다.
 * 값이 들어가는 문구(글자수·칩 개수 등)는 throw 시점에 Messages 함수로 만들어 override 한다.
 */
enum class ErrorCode(
    val status: HttpStatus,
    val message: String,
) {
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "잘못된 입력입니다."),
    REQUIRED_FIELD(HttpStatus.BAD_REQUEST, Messages.REQUIRED_NAME),
    LENGTH_EXCEEDED(HttpStatus.BAD_REQUEST, "글자수를 초과했어요."),
    DUPLICATE(HttpStatus.CONFLICT, Messages.DUPLICATE),
    FUTURE_DATE(HttpStatus.BAD_REQUEST, Messages.FUTURE_DATE),
    DATE_ORDER(HttpStatus.BAD_REQUEST, Messages.DATE_ORDER),
    SELECTION_LIMIT(HttpStatus.BAD_REQUEST, Messages.SELECTION_LIMIT),
    CHIP_LIMIT(HttpStatus.BAD_REQUEST, "칩 개수 상한을 넘었어요."),
    ZONE_LIMIT(HttpStatus.BAD_REQUEST, "존 개수 상한을 넘었어요."),
    CATEGORY_REQUIRED(HttpStatus.BAD_REQUEST, Messages.CATEGORY_REQUIRED),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "로그인이 필요해요."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "리소스를 찾을 수 없습니다."),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다."),
}
