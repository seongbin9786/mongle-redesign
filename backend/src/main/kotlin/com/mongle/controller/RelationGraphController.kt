package com.mongle.controller

import com.mongle.common.context.AuthUser
import com.mongle.common.context.UserPrincipal
import com.mongle.common.exception.ErrorResponse
import com.mongle.controller.dto.RelationGraphRequest
import com.mongle.controller.dto.RelationGraphResponse
import com.mongle.service.RelationGraphService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Content
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.responses.ApiResponse
import io.swagger.v3.oas.annotations.responses.ApiResponses
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@Tag(
    name = "인물관계도",
    description = "인물끼리의 관계도(나 중심의 홈 궤도와 다른 축) — 지도 위 영역, 올린 인물의 좌표, 인물↔인물 연결(친밀도·메모)을 사용자당 한 장으로 든다.",
)
@RestController
@RequestMapping("/api/v1/relation-graph")
class RelationGraphController(
    private val relationGraphService: RelationGraphService,
) {
    @Operation(
        operationId = "getRelationGraph",
        summary = "인물관계도 조회",
        description = "내 관계도를 통째로 반환한다. 아직 그린 적이 없으면 빈 목록이고, 삭제된 인물과 그 인물에 걸린 연결은 빠진다.",
    )
    @ApiResponses(
        ApiResponse(responseCode = "200", description = "인물관계도.", useReturnTypeSchema = true),
        ApiResponse(responseCode = "401", description = "토큰 없음·무효(UNAUTHORIZED).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
    )
    @GetMapping
    fun get(
        @AuthUser user: UserPrincipal,
    ): RelationGraphResponse = relationGraphService.get(user.id)

    @Operation(
        operationId = "replaceRelationGraph",
        summary = "인물관계도 저장(전체 교체)",
        description = "지금 화면 상태(영역·인물·연결)를 통째로 보내 교체한다. 연결은 방향이 없어 작은 인물 id 로 정렬해 저장하고, 같은 쌍이 여러 번 오면 첫 등장만 남는다. 양끝이 nodes 에 없는 연결과 자기 자신과의 연결은 버린다. 없는 영역을 가리키는 인물은 영역만 떼고 지도에는 남긴다.",
    )
    @ApiResponses(
        ApiResponse(responseCode = "200", description = "저장한 인물관계도.", useReturnTypeSchema = true),
        ApiResponse(responseCode = "400", description = "메모·영역 이름 글자수 초과(LENGTH_EXCEEDED)·영역 이름 누락(REQUIRED_FIELD).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
        ApiResponse(responseCode = "401", description = "토큰 없음·무효(UNAUTHORIZED).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
        ApiResponse(responseCode = "404", description = "내 인물이 아님·삭제된 인물(NOT_FOUND).", content = [Content(schema = Schema(implementation = ErrorResponse::class))]),
    )
    @PutMapping
    fun replace(
        @AuthUser user: UserPrincipal,
        @RequestBody request: RelationGraphRequest,
    ): RelationGraphResponse = relationGraphService.replace(user.id, request.groups, request.nodes, request.links)
}
