package com.mongle.controller

import com.mongle.common.context.AuthUser
import com.mongle.common.context.UserPrincipal
import com.mongle.common.exception.ErrorResponse
import com.mongle.controller.dto.ChipCreateRequest
import com.mongle.controller.dto.ChipRenameRequest
import com.mongle.controller.dto.ChipResponse
import com.mongle.domain.ChipType
import com.mongle.service.ChipService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.Parameter
import io.swagger.v3.oas.annotations.media.Content
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.responses.ApiResponse
import io.swagger.v3.oas.annotations.responses.ApiResponses
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@Tag(
    name = "칩",
    description = "칩(카테고리·감정·날씨·관계태그·소속) 개인화 — 공통 칩 위에 개인 칩을 만들고, 개인 칩만 이름변경·삭제한다. 소속만 parentId 로 1단계 중첩을 갖는다.",
)
@RestController
@RequestMapping("/api/v1/chips")
class ChipController(
    private val chipService: ChipService,
) {
    @Operation(
        operationId = "getChips",
        summary = "칩 목록 조회",
        description = "종류별로 사용자에게 보이는 칩(공통 + 개인, 숨김 제외)을 순서대로 반환한다. 카테고리는 기본 선택 칩에 default=true 를 표시한다.",
    )
    @ApiResponses(
        ApiResponse(responseCode = "200", description = "칩 목록.", useReturnTypeSchema = true),
        ApiResponse(responseCode = "401", description = "토큰 없음·무효(UNAUTHORIZED).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
    )
    @GetMapping
    fun list(
        @AuthUser user: UserPrincipal,
        @Parameter(description = "칩 종류.", example = "RELATION_TAG") @RequestParam type: ChipType,
    ): List<ChipResponse> {
        val defaultId = if (type == ChipType.CATEGORY) chipService.defaultCategoryId(user.id) else null
        return chipService.visibleChips(user.id, type).map { ChipResponse.from(it, defaultId) }
    }

    @Operation(
        operationId = "createChip",
        summary = "개인 칩 생성",
        description = "종류·라벨로 개인 칩을 만든다. 같은 종류 안에서 라벨은 중복될 수 없고, 종류별 개수 상한이 있다.",
    )
    @ApiResponses(
        ApiResponse(responseCode = "201", description = "등록한 개인 칩.", useReturnTypeSchema = true),
        ApiResponse(responseCode = "400", description = "라벨 누락(REQUIRED_FIELD)·글자수 초과(LENGTH_EXCEEDED)·종류별 개수 초과(CHIP_LIMIT).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
        ApiResponse(responseCode = "401", description = "토큰 없음·무효(UNAUTHORIZED).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
        ApiResponse(responseCode = "409", description = "같은 종류에 같은 라벨이 이미 있음(DUPLICATE).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
    )
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @AuthUser user: UserPrincipal,
        @RequestBody request: ChipCreateRequest,
    ): ChipResponse = ChipResponse.from(chipService.create(user.id, request.type, request.label, request.color, request.parentId))

    @Operation(
        operationId = "updateChip",
        summary = "칩 이름 변경",
        description = "개인 칩의 라벨을 바꾼다. 공통 칩은 바꿀 수 없다. 같은 종류 안에서 라벨은 중복될 수 없다.",
    )
    @ApiResponses(
        ApiResponse(responseCode = "200", description = "수정한 개인 칩.", useReturnTypeSchema = true),
        ApiResponse(responseCode = "400", description = "라벨 누락(REQUIRED_FIELD)·글자수 초과(LENGTH_EXCEEDED).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
        ApiResponse(responseCode = "401", description = "토큰 없음·무효(UNAUTHORIZED).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
        ApiResponse(responseCode = "404", description = "내 개인 칩이 아님·존재하지 않음(NOT_FOUND).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
        ApiResponse(responseCode = "409", description = "같은 종류에 같은 라벨이 이미 있음(DUPLICATE).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
    )
    @PatchMapping("/{id}")
    fun rename(
        @AuthUser user: UserPrincipal,
        @Parameter(description = "칩 id.", example = "12") @PathVariable id: Long,
        @RequestBody request: ChipRenameRequest,
    ): ChipResponse {
        val chip = chipService.rename(user.id, id, request.label, request.color, request.parentId)
        // 목록 조회와 같은 규칙으로 default 를 채운다 — 개인 카테고리 칩이 기본(공통 전부 숨김)일 때 이름변경 응답만 어긋나지 않게.
        val defaultId = if (chip.type == ChipType.CATEGORY) chipService.defaultCategoryId(user.id) else null
        return ChipResponse.from(chip, defaultId)
    }

    @Operation(
        operationId = "deleteChip",
        summary = "칩 삭제(숨김)",
        description = "칩을 삭제한다. 개인 칩은 소프트삭제, 공통 칩은 사용자별 숨김 처리한다(과거 기록의 라벨은 유지). 보이는 카테고리가 마지막 1개면 지울 수 없다.",
    )
    @ApiResponses(
        ApiResponse(responseCode = "400", description = "마지막 카테고리 삭제 시도(CATEGORY_REQUIRED).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
        ApiResponse(responseCode = "401", description = "토큰 없음·무효(UNAUTHORIZED).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
        ApiResponse(responseCode = "404", description = "존재하지 않는 칩(NOT_FOUND).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
    )
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(
        @AuthUser user: UserPrincipal,
        @Parameter(description = "칩 id.", example = "12") @PathVariable id: Long,
    ) = chipService.delete(user.id, id)
}
