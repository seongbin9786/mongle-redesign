package com.mongle.service

import com.mongle.common.HexColor
import com.mongle.common.ValidationLimits
import com.mongle.common.Validators
import com.mongle.common.exception.BusinessException
import com.mongle.common.exception.ErrorCode
import com.mongle.controller.dto.GraphGroup
import com.mongle.controller.dto.GraphLink
import com.mongle.controller.dto.GraphNode
import com.mongle.controller.dto.RelationGraphResponse
import com.mongle.domain.RelationGraphGroup
import com.mongle.domain.RelationGraphLink
import com.mongle.domain.RelationGraphNode
import com.mongle.repository.PersonRepository
import com.mongle.repository.RelationGraphGroupRepository
import com.mongle.repository.RelationGraphLinkRepository
import com.mongle.repository.RelationGraphNodeRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * 인물관계도 — "누가 누구를 아는가"(그 사람들끼리)를 사용자가 손으로 그려 두는 한 장. (mustpass 07-relation-graph)
 *
 * 존과 같은 **전체 교체** 규약을 쓴다. 화면이 캔버스라 한 번의 조작이 영역·노드·선·좌표를 동시에
 * 바꾸는 일이 흔하고, 부분 API 로 쪼개면 중간 상태가 서버에 남아 화면과 갈린다.
 */
@Service
@Transactional(readOnly = true)
class RelationGraphService(
    private val relationGraphGroupRepository: RelationGraphGroupRepository,
    private val relationGraphNodeRepository: RelationGraphNodeRepository,
    private val relationGraphLinkRepository: RelationGraphLinkRepository,
    private val personRepository: PersonRepository,
) {
    fun get(userId: UUID): RelationGraphResponse {
        val nodes = relationGraphNodeRepository.findByOwnerIdOrderByIdAsc(userId)
        val groups = relationGraphGroupRepository.findByOwnerIdOrderByIdAsc(userId)
        if (nodes.isEmpty()) return RelationGraphResponse(groups = emptyList(), nodes = emptyList(), links = emptyList())
        // 지운 사람이 관계도에 유령으로 남으면 안 된다(존과 같은 규약). 그 사람에게 걸린 선도 함께 감춘다.
        val alive = alivePersonIds(userId, nodes.map { it.personId })
        val visible = nodes.filter { it.personId in alive }
        val links = relationGraphLinkRepository.findByOwnerIdOrderByIdAsc(userId)
            .filter { it.fromPersonId in alive && it.toPersonId in alive }
        // 사람이 다 빠진 영역도 그대로 남긴다 — 비어 있는 구역은 오류가 아니라 "여기 자리를 잡아 뒀다"이고,
        // 지워 버리면 사람을 잠깐 뺀 사이 지도의 구획이 무너진다.
        return RelationGraphResponse.from(groups, visible, links)
    }

    @Transactional
    fun replace(
        userId: UUID,
        requestedGroups: List<GraphGroup>,
        requestedNodes: List<GraphNode>,
        requestedLinks: List<GraphLink>,
    ): RelationGraphResponse {
        val groups = normalizeGroups(requestedGroups)
        val groupKeys = groups.map { it.key }.toSet()
        val nodes = requestedNodes.distinctBy { it.personId }
            // 없는 영역을 가리키는 노드는 거절하지 않고 **영역만 떼어 놓는다**. 인물은 지도에 남아야 하고,
            // 구획 하나가 어긋났다고 그림 전체를 저장 못 하게 하는 쪽이 더 나쁘다.
            .map { if (it.groupKey in groupKeys) it else it.copy(groupKey = null) }
        val personIds = nodes.map { it.personId }
        // 내 소유·active 가 아닌 인물이 섞이면 통째로 거절한다 — 일부만 반영하면 화면과 서버가 갈린다(존과 같은 규약).
        val alive = alivePersonIds(userId, personIds)
        if (personIds.any { it !in alive }) throw BusinessException(ErrorCode.NOT_FOUND)

        val links = normalizeLinks(requestedLinks, personIds.toSet())
        links.forEach { it.note?.let { note -> Validators.maxLength(note, ValidationLimits.MEMO_MAX) } }

        relationGraphGroupRepository.deleteByOwnerId(userId)
        relationGraphNodeRepository.deleteByOwnerId(userId)
        relationGraphLinkRepository.deleteByOwnerId(userId)
        // 삭제 후 곧바로 같은 소유자로 다시 넣으므로, 지연 flush 가 삽입 뒤로 밀리지 않게 먼저 밀어낸다.
        relationGraphGroupRepository.flush()
        relationGraphNodeRepository.flush()
        relationGraphLinkRepository.flush()

        val savedGroups = groups.map {
            relationGraphGroupRepository.save(
                RelationGraphGroup(
                    ownerId = userId,
                    key = it.key,
                    name = it.name,
                    color = it.color,
                    x = it.x,
                    y = it.y,
                    width = it.width,
                    height = it.height,
                ),
            )
        }
        val savedNodes = nodes.map {
            relationGraphNodeRepository.save(
                RelationGraphNode(ownerId = userId, personId = it.personId, x = it.x, y = it.y, groupKey = it.groupKey),
            )
        }
        val savedLinks = links.map {
            relationGraphLinkRepository.save(
                RelationGraphLink(
                    ownerId = userId,
                    fromPersonId = it.fromPersonId,
                    toPersonId = it.toPersonId,
                    intimacy = it.intimacy,
                    note = it.note,
                ),
            )
        }
        return RelationGraphResponse.from(savedGroups, savedNodes, savedLinks)
    }

    /**
     * 영역을 저장 가능한 모양으로 다듬는다.
     * - key 는 지도 안에서 하나뿐이다(겹치면 첫 등장만). key 가 비면 노드가 가리킬 수 없으니 버린다.
     * - 이름·색은 태그에서 복사해 온 값이라 여기서 다시 검증한다(태그 이름 규칙과 별개로 자라지 않게).
     * - 폭·높이는 최소값 아래로 내려가지 않게 올린다 — 0 짜리 구역은 화면에서 선 하나로 보여 만질 수 없다.
     */
    private fun normalizeGroups(requested: List<GraphGroup>): List<GraphGroup> = requested
        .asSequence()
        .filter { it.key.isNotBlank() }
        .distinctBy { it.key }
        .map {
            Validators.maxLength(it.key, GROUP_KEY_MAX)
            val name = it.name.trim()
            Validators.requireNotBlank(name, MESSAGE_REQUIRED_GROUP_NAME)
            Validators.maxLength(name, ValidationLimits.NAME_MAX)
            it.copy(
                name = name,
                color = HexColor.normalize(it.color),
                width = maxOf(it.width, GROUP_MIN_SIZE),
                height = maxOf(it.height, GROUP_MIN_SIZE),
            )
        }
        .toList()

    /**
     * 선을 저장 가능한 모양으로 다듬는다. **영역과 무관하다** — 지도에 있기만 하면 어느 구역의
     * 누구와도 이을 수 있다(구획은 보기 위한 것이지 이을 수 있는 범위가 아니다).
     * - 작은 personId 를 from 으로 정렬 → 방향 없는 한 쌍이 두 행으로 갈리지 않는다.
     * - 같은 쌍이 여러 번 오면 첫 등장만 — 중복은 실수지 위반이 아니라 에러 대신 접는다(존 인물 할당과 같은 판단).
     * - 자기 자신과의 연결, 관계도에 없는 인물이 낀 선은 버린다(양끝이 다 있어야 선이다).
     * - 친밀도는 0~100 으로 조인다. 눈금 밖 값은 사용자의 의도가 아니라 클라이언트 사고라 거절보다 보정이 낫다.
     */
    private fun normalizeLinks(requested: List<GraphLink>, personIds: Set<Long>): List<GraphLink> = requested
        .asSequence()
        .filter { it.fromPersonId != it.toPersonId }
        .filter { it.fromPersonId in personIds && it.toPersonId in personIds }
        .map {
            GraphLink(
                fromPersonId = minOf(it.fromPersonId, it.toPersonId),
                toPersonId = maxOf(it.fromPersonId, it.toPersonId),
                intimacy = it.intimacy.coerceIn(INTIMACY_MIN, INTIMACY_MAX),
                note = it.note?.trim()?.ifBlank { null },
            )
        }
        .distinctBy { it.fromPersonId to it.toPersonId }
        .toList()

    private fun alivePersonIds(userId: UUID, personIds: List<Long>): Set<Long> {
        if (personIds.isEmpty()) return emptySet()
        return personRepository.findByIdInAndOwnerIdAndDeletedAtIsNull(personIds.distinct(), userId)
            .mapNotNull { it.id }
            .toSet()
    }

    companion object {
        const val INTIMACY_MIN = 0
        const val INTIMACY_MAX = 100
        const val GROUP_KEY_MAX = 40
        const val GROUP_MIN_SIZE = 80.0
        const val MESSAGE_REQUIRED_GROUP_NAME = "영역 이름을 입력해 주세요."
    }
}
