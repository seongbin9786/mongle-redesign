package com.mongle.service

import com.mongle.common.HexColor
import com.mongle.common.Messages
import com.mongle.common.ValidationLimits
import com.mongle.common.Validators
import com.mongle.common.exception.BusinessException
import com.mongle.common.exception.ErrorCode
import com.mongle.controller.dto.ZoneResponse
import com.mongle.domain.Zone
import com.mongle.domain.ZonePerson
import com.mongle.repository.PersonRepository
import com.mongle.repository.ZonePersonRepository
import com.mongle.repository.ZoneRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * 존(사용자가 이름 붙인 인물 묶음) — 홈에서 좌우로 넘기는 우주의 데이터 축. (mustpass 06-zone)
 *
 * 응답에 personIds 를 실어 내리는 이유: 관계 지도는 한 번만 받고 우주 전환은 클라이언트가
 * 나눠서 한다. 우주를 넘길 때마다 서버를 다녀오면 스와이프 도중 화면이 비어 은유가 깨진다.
 */
@Service
@Transactional(readOnly = true)
class ZoneService(
    private val zoneRepository: ZoneRepository,
    private val zonePersonRepository: ZonePersonRepository,
    private val personRepository: PersonRepository,
) {
    fun list(userId: UUID): List<ZoneResponse> {
        val zones = zoneRepository.findByOwnerIdAndDeletedAtIsNullOrderByDisplayOrderAscIdAsc(userId)
        if (zones.isEmpty()) return emptyList()
        val personIdsByZone = personIdsByZone(userId, zones)
        return zones.map { ZoneResponse.from(it, personIdsByZone[it.id].orEmpty()) }
    }

    @Transactional
    fun create(userId: UUID, rawName: String, rawColor: String?): ZoneResponse {
        val name = rawName.trim()
        val existing = zoneRepository.findByOwnerIdAndDeletedAtIsNullOrderByDisplayOrderAscIdAsc(userId)
        validateName(userId, name)
        Validators.zoneLimit(existing.size)

        // 순서는 '개수'가 아니라 '지금 최대값 다음'이다 — 중간을 지운 뒤 만들면 개수 기준은 순서가 겹친다.
        val nextOrder = (existing.maxOfOrNull { it.displayOrder } ?: -1) + 1
        val zone = zoneRepository.save(
            Zone(ownerId = userId, name = name, color = HexColor.normalize(rawColor), displayOrder = nextOrder),
        )
        // 갓 만든 존은 비어 있다 — 인물은 별도 할당(PUT /persons)으로 붙인다.
        return ZoneResponse.from(zone, emptyList())
    }

    @Transactional
    fun update(userId: UUID, zoneId: Long, rawName: String, rawColor: String?): ZoneResponse {
        val zone = requireOwnZone(userId, zoneId)
        val name = rawName.trim()
        validateName(userId, name, excludeId = zoneId)
        zone.rename(name)
        zone.changeColor(HexColor.normalize(rawColor))
        return ZoneResponse.from(zone, personIdsByZone(userId, listOf(zone))[zoneId].orEmpty())
    }

    /**
     * 존 삭제 = 존 소프트삭제 + 할당 행 하드삭제.
     * 존은 과거 기록이 참조하지 않으므로 칩처럼 이름을 보존할 이유가 없고, 남은 조인 행이
     * 나중의 다른 존 id 와 섞이는 쪽이 더 나쁘다. 인물 자체는 건드리지 않는다.
     */
    @Transactional
    fun delete(userId: UUID, zoneId: Long) {
        val zone = requireOwnZone(userId, zoneId)
        zonePersonRepository.deleteByZoneId(zoneId)
        zone.softDelete()
    }

    /**
     * 존 인물 전체 교체. 부분 추가·삭제 API 를 두지 않는다 — 설정 화면이 체크박스 목록이라
     * "지금 상태를 그대로 보낸다"는 규칙 하나로 끝나는 편이 클라이언트·서버 양쪽에서 단순하다.
     */
    @Transactional
    fun replacePersons(userId: UUID, zoneId: Long, requestedPersonIds: List<Long>): ZoneResponse {
        val zone = requireOwnZone(userId, zoneId)
        // 중복은 에러가 아니라 접는다(같은 사람을 두 번 고른 건 실수지 위반이 아니다). 순서는 첫 등장 기준.
        val personIds = requestedPersonIds.distinct()
        // 내 소유·active 가 아닌 id 가 섞이면 통째로 거절한다 — 일부만 반영하면 화면과 서버가 갈린다.
        val owned = personRepository.findByIdInAndOwnerIdAndDeletedAtIsNull(personIds, userId).mapNotNull { it.id }.toSet()
        if (personIds.any { it !in owned }) throw BusinessException(ErrorCode.NOT_FOUND)

        zonePersonRepository.deleteByZoneId(zoneId)
        // 삭제 후 곧바로 같은 zoneId 로 다시 넣으므로, 지연 flush 가 삽입 뒤로 밀리지 않게 먼저 밀어낸다.
        zonePersonRepository.flush()
        personIds.forEachIndexed { index, personId ->
            zonePersonRepository.save(ZonePerson(zoneId = zoneId, personId = personId, displayOrder = index))
        }
        return ZoneResponse.from(zone, personIds)
    }

    /**
     * 존별 인물 id — 할당 순서를 보존하되 **소프트삭제된 인물은 뺀다.**
     * 지운 사람이 우주에 유령으로 남으면 안 된다(할당 행은 남겨 되살릴 여지를 둔다).
     */
    private fun personIdsByZone(userId: UUID, zones: List<Zone>): Map<Long, List<Long>> {
        val links = zonePersonRepository.findByZoneIdInOrderByZoneIdAscDisplayOrderAsc(zones.mapNotNull { it.id })
        if (links.isEmpty()) return emptyMap()
        val alive = personRepository.findByIdInAndOwnerIdAndDeletedAtIsNull(links.map { it.personId }.distinct(), userId)
            .mapNotNull { it.id }
            .toSet()
        return links.filter { it.personId in alive }.groupBy({ it.zoneId }, { it.personId })
    }

    private fun requireOwnZone(userId: UUID, zoneId: Long): Zone = zoneRepository.findByIdAndOwnerIdAndDeletedAtIsNull(zoneId, userId)
        ?: throw BusinessException(ErrorCode.NOT_FOUND)

    private fun validateName(userId: UUID, name: String, excludeId: Long? = null) {
        Validators.requireNotBlank(name, Messages.REQUIRED_ZONE_NAME)
        Validators.maxLength(name, ValidationLimits.ZONE_NAME_MAX)
        // 지운 존의 이름은 다시 쓸 수 있다 — 중복 판정 대상은 active 뿐이다.
        val duplicate = zoneRepository.findByOwnerIdAndDeletedAtIsNullOrderByDisplayOrderAscIdAsc(userId)
            .any { it.id != excludeId && it.name == name }
        Validators.rejectDuplicate(duplicate)
    }
}
