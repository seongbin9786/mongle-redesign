package com.mongle.controller

import com.mongle.common.context.AuthUser
import com.mongle.common.context.UserPrincipal
import com.mongle.common.exception.ErrorResponse
import com.mongle.controller.dto.ZoneCreateRequest
import com.mongle.controller.dto.ZonePersonsRequest
import com.mongle.controller.dto.ZoneResponse
import com.mongle.controller.dto.ZoneUpdateRequest
import com.mongle.service.ZoneService
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
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@Tag(
    name = "존",
    description = "존(사용자가 이름 붙인 인물 묶음) — 홈에서 좌우로 넘기는 우주 한 장에 대응한다. 이름·색을 정하고 인물을 할당한다.",
)
@RestController
@RequestMapping("/api/v1/zones")
class ZoneController(
    private val zoneService: ZoneService,
) {
    @Operation(
        operationId = "getZones",
        summary = "존 목록 조회",
        description = "내 존을 표시 순서대로 반환한다. 각 존은 소속 인물 id 목록을 함께 담아, 프론트가 관계 지도 노드를 우주별로 나눌 수 있게 한다.",
    )
    @ApiResponses(
        ApiResponse(responseCode = "200", description = "존 목록.", useReturnTypeSchema = true),
        ApiResponse(responseCode = "401", description = "토큰 없음·무효(UNAUTHORIZED).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
    )
    @GetMapping
    fun list(
        @AuthUser user: UserPrincipal,
    ): List<ZoneResponse> = zoneService.list(user.id)

    @Operation(
        operationId = "createZone",
        summary = "존 생성",
        description = "이름(별칭)과 색으로 존을 만든다. 이름은 내 존 안에서 중복될 수 없고 개수 상한이 있다. 갓 만든 존은 비어 있다.",
    )
    @ApiResponses(
        ApiResponse(responseCode = "201", description = "만든 존.", useReturnTypeSchema = true),
        ApiResponse(responseCode = "400", description = "이름 누락(REQUIRED_FIELD)·글자수 초과(LENGTH_EXCEEDED)·개수 초과(ZONE_LIMIT).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
        ApiResponse(responseCode = "401", description = "토큰 없음·무효(UNAUTHORIZED).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
        ApiResponse(responseCode = "409", description = "같은 이름의 존이 이미 있음(DUPLICATE).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
    )
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @AuthUser user: UserPrincipal,
        @RequestBody request: ZoneCreateRequest,
    ): ZoneResponse = zoneService.create(user.id, request.name, request.color)

    @Operation(
        operationId = "updateZone",
        summary = "존 이름·색 변경",
        description = "존의 이름과 색을 바꾼다. 인물 할당은 바뀌지 않는다.",
    )
    @ApiResponses(
        ApiResponse(responseCode = "200", description = "수정한 존.", useReturnTypeSchema = true),
        ApiResponse(responseCode = "400", description = "이름 누락(REQUIRED_FIELD)·글자수 초과(LENGTH_EXCEEDED).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
        ApiResponse(responseCode = "401", description = "토큰 없음·무효(UNAUTHORIZED).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
        ApiResponse(responseCode = "404", description = "내 존이 아님·존재하지 않음(NOT_FOUND).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
        ApiResponse(responseCode = "409", description = "같은 이름의 존이 이미 있음(DUPLICATE).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
    )
    @PatchMapping("/{id}")
    fun update(
        @AuthUser user: UserPrincipal,
        @Parameter(description = "존 id.", example = "3") @PathVariable id: Long,
        @RequestBody request: ZoneUpdateRequest,
    ): ZoneResponse = zoneService.update(user.id, id, request.name, request.color)

    @Operation(
        operationId = "deleteZone",
        summary = "존 삭제",
        description = "존과 인물 할당을 지운다. 인물 자체는 지워지지 않는다.",
    )
    @ApiResponses(
        ApiResponse(responseCode = "204", description = "삭제 완료(본문 없음).", content = [Content()]),
        ApiResponse(responseCode = "401", description = "토큰 없음·무효(UNAUTHORIZED).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
        ApiResponse(responseCode = "404", description = "내 존이 아님·존재하지 않음(NOT_FOUND).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
    )
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(
        @AuthUser user: UserPrincipal,
        @Parameter(description = "존 id.", example = "3") @PathVariable id: Long,
    ) = zoneService.delete(user.id, id)

    @Operation(
        operationId = "replaceZonePersons",
        summary = "존 인물 할당(전체 교체)",
        description = "이 존에 담을 인물을 통째로 교체한다. 내 소유·활성 인물만 담을 수 있고, 중복 id 는 첫 등장만 남는다. 빈 목록을 보내면 존이 비워진다.",
    )
    @ApiResponses(
        ApiResponse(responseCode = "200", description = "인물을 교체한 존.", useReturnTypeSchema = true),
        ApiResponse(responseCode = "401", description = "토큰 없음·무효(UNAUTHORIZED).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
        ApiResponse(responseCode = "404", description = "내 존이 아님·내 인물이 아님(NOT_FOUND).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
    )
    @PutMapping("/{id}/persons")
    fun replacePersons(
        @AuthUser user: UserPrincipal,
        @Parameter(description = "존 id.", example = "3") @PathVariable id: Long,
        @RequestBody request: ZonePersonsRequest,
    ): ZoneResponse = zoneService.replacePersons(user.id, id, request.personIds)
}
