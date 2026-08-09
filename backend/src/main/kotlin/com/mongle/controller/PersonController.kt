package com.mongle.controller

import com.mongle.common.context.AuthUser
import com.mongle.common.context.UserPrincipal
import com.mongle.common.exception.ErrorResponse
import com.mongle.controller.dto.PersonDetailResponse
import com.mongle.controller.dto.PersonRequest
import com.mongle.controller.dto.PersonResponse
import com.mongle.controller.dto.PersonSort
import com.mongle.service.PersonService
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
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@Tag(
    name = "사람",
    description = "인물(관계도감) 등록·조회·수정 — 관계태그·취향·만남 이력을 담고, 즐겨찾기·파생 스탯을 제공한다.",
)
@RestController
@RequestMapping("/api/v1/persons")
class PersonController(
    private val personService: PersonService,
) {
    @Operation(
        operationId = "getPersons",
        summary = "인물 디렉토리 조회",
        description = "내 인물 목록을 정렬·검색해 반환한다. 어느 정렬이든 즐겨찾기가 앞선다. query 는 이름·소속·관계태그 라벨을 함께 훑는다.",
    )
    @ApiResponses(
        ApiResponse(responseCode = "200", description = "인물 목록.", useReturnTypeSchema = true),
        ApiResponse(responseCode = "401", description = "토큰 없음·무효(UNAUTHORIZED).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
    )
    @GetMapping
    fun directory(
        @AuthUser user: UserPrincipal,
        @Parameter(description = "정렬(RECENT=마지막 만남, RECORD_COUNT=기록 많은 순, NAME=가나다). 즐겨찾기가 앞선다.", example = "RECENT")
        @RequestParam(defaultValue = "RECENT") sort: PersonSort,
        @Parameter(description = "검색어(선택). 이름·소속·관계태그 라벨을 훑는다.", example = "김")
        @RequestParam(required = false) query: String?,
    ): List<PersonResponse> = personService.directory(user.id, sort, query)

    @Operation(
        operationId = "getPerson",
        summary = "인물 상세 조회",
        description = "기본 정보에 파생 스탯(만남 횟수·기록 수·알고 지낸 기간·마지막 만남)을 더해 반환한다. 마지막 만난 날은 수기 입력과 기록의 max 를 재계산한 값이다.",
    )
    @ApiResponses(
        ApiResponse(responseCode = "200", description = "인물 상세.", useReturnTypeSchema = true),
        ApiResponse(responseCode = "401", description = "토큰 없음·무효(UNAUTHORIZED).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
        ApiResponse(responseCode = "404", description = "내 인물이 아님·존재하지 않음(NOT_FOUND).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
    )
    @GetMapping("/{id}")
    fun detail(
        @AuthUser user: UserPrincipal,
        @Parameter(description = "인물 id.", example = "7") @PathVariable id: Long,
    ): PersonDetailResponse = personService.detail(user.id, id)

    @Operation(
        operationId = "createPerson",
        summary = "인물 등록",
        description = "이름만 필수로 인물을 등록한다. 관계태그 칩은 내 것이면서 보이는 것만 붙일 수 있고, 만난 날짜는 미래일 수 없으며 마지막 만난 날은 처음 만난 날 이후여야 한다.",
    )
    @ApiResponses(
        ApiResponse(responseCode = "201", description = "등록한 인물.", useReturnTypeSchema = true),
        ApiResponse(responseCode = "400", description = "이름 누락(REQUIRED_FIELD)·글자수 초과(LENGTH_EXCEEDED)·태그/취향 개수 초과(SELECTION_LIMIT)·미래 날짜(FUTURE_DATE)·날짜 역순(DATE_ORDER)·잘못된 생일(INVALID_INPUT).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
        ApiResponse(responseCode = "401", description = "토큰 없음·무효(UNAUTHORIZED).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
        ApiResponse(responseCode = "404", description = "내 것이 아니거나 보이지 않는 관계태그 칩 연결(NOT_FOUND).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
    )
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun register(
        @AuthUser user: UserPrincipal,
        @RequestBody request: PersonRequest,
    ): PersonResponse = personService.register(user.id, request)

    @Operation(
        operationId = "updatePerson",
        summary = "인물 수정",
        description = "인물 정보를 통째로 교체한다(등록과 같은 검증). 관계태그·취향도 요청 값으로 재구성한다.",
    )
    @ApiResponses(
        ApiResponse(responseCode = "200", description = "수정한 인물.", useReturnTypeSchema = true),
        ApiResponse(responseCode = "400", description = "이름 누락(REQUIRED_FIELD)·글자수 초과(LENGTH_EXCEEDED)·태그/취향 개수 초과(SELECTION_LIMIT)·미래 날짜(FUTURE_DATE)·날짜 역순(DATE_ORDER)·잘못된 생일(INVALID_INPUT).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
        ApiResponse(responseCode = "401", description = "토큰 없음·무효(UNAUTHORIZED).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
        ApiResponse(responseCode = "404", description = "내 인물이 아님·존재하지 않음, 또는 내 것이 아닌 관계태그 칩 연결(NOT_FOUND).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
    )
    @PutMapping("/{id}")
    fun update(
        @AuthUser user: UserPrincipal,
        @Parameter(description = "인물 id.", example = "7") @PathVariable id: Long,
        @RequestBody request: PersonRequest,
    ): PersonResponse = personService.update(user.id, id, request)

    @Operation(
        operationId = "togglePersonFavorite",
        summary = "즐겨찾기 토글",
        description = "인물의 즐겨찾기 여부를 뒤집는다. 즐겨찾기는 디렉토리·관계 지도에서 항상 상단 그룹으로 뜬다.",
    )
    @ApiResponses(
        ApiResponse(responseCode = "200", description = "즐겨찾기 변경 결과.", useReturnTypeSchema = true),
        ApiResponse(responseCode = "401", description = "토큰 없음·무효(UNAUTHORIZED).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
        ApiResponse(responseCode = "404", description = "내 인물이 아님·존재하지 않음(NOT_FOUND).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
    )
    @PatchMapping("/{id}/favorite")
    fun toggleFavorite(
        @AuthUser user: UserPrincipal,
        @Parameter(description = "인물 id.", example = "7") @PathVariable id: Long,
    ): PersonResponse = personService.toggleFavorite(user.id, id)

    @Operation(
        operationId = "deletePerson",
        summary = "인물 삭제",
        description = "인물을 소프트삭제한다. 과거 기록의 인물 참조(이름)는 유지된다.",
    )
    @ApiResponses(
        ApiResponse(responseCode = "401", description = "토큰 없음·무효(UNAUTHORIZED).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
        ApiResponse(responseCode = "404", description = "내 인물이 아님·존재하지 않음(NOT_FOUND).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
    )
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(
        @AuthUser user: UserPrincipal,
        @Parameter(description = "인물 id.", example = "7") @PathVariable id: Long,
    ) = personService.delete(user.id, id)
}
