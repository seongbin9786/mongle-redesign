package com.mongle.service

import com.mongle.common.Messages
import com.mongle.common.ValidationLimits
import com.mongle.common.Validators
import com.mongle.common.exception.BusinessException
import com.mongle.common.exception.ErrorCode
import com.mongle.controller.dto.ChipDisplay
import com.mongle.controller.dto.PersonDetailResponse
import com.mongle.controller.dto.PersonRequest
import com.mongle.controller.dto.PersonResponse
import com.mongle.controller.dto.PersonSort
import com.mongle.domain.ChipType
import com.mongle.domain.Person
import com.mongle.domain.PersonGender
import com.mongle.domain.PersonRelationTag
import com.mongle.repository.ChipRepository
import com.mongle.repository.EventPersonRepository
import com.mongle.repository.EventRepository
import com.mongle.repository.PersonRelationTagRepository
import com.mongle.repository.PersonRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.util.UUID

@Service
@Transactional(readOnly = true)
class PersonService(
    private val personRepository: PersonRepository,
    private val chipService: ChipService,
    private val chipRepository: ChipRepository,
    private val personStatsService: PersonStatsService,
    private val eventRepository: EventRepository,
    private val personRelationTagRepository: PersonRelationTagRepository,
    private val eventPersonRepository: EventPersonRepository,
) {
    @Transactional
    fun register(userId: UUID, request: PersonRequest): PersonResponse {
        val person = Person(ownerId = userId, name = request.name)
        val relationTagChipIds = applyRequest(userId, person, request)
        val saved = personRepository.save(person)
        syncRelationTags(requireNotNull(saved.id), relationTagChipIds)
        return toResponse(saved)
    }

    /** 전체 수정(PUT) — 등록과 같은 입력·검증을 재사용한다. 내 소유·active 인물만, 아니면 NOT_FOUND. */
    @Transactional
    fun update(userId: UUID, personId: Long, request: PersonRequest): PersonResponse {
        val person = personRepository.findByIdAndOwnerIdAndDeletedAtIsNull(personId, userId)
            ?: throw BusinessException(ErrorCode.NOT_FOUND)
        val relationTagChipIds = applyRequest(userId, person, request)
        syncRelationTags(requireNotNull(person.id), relationTagChipIds)
        return toResponse(person)
    }

    /**
     * 디렉토리 목록(#29). 즐겨찾기가 어느 정렬에서든 앞서고, 그 안에서 정렬한다:
     * 마지막 만남순(기본·최신 먼저, 없는 사람은 뒤) / 기록 많은 순 / 이름순(대소문자 무시).
     * 즐겨찾기 우선 조건이 있어 in-memory 로 조합한다.
     * (마지막 만난 날은 파생 단계에서 event 반영으로 갱신된다.)
     */
    fun directory(userId: UUID, sort: PersonSort, query: String?): List<PersonResponse> {
        val all = personRepository.findByOwnerIdAndDeletedAtIsNull(userId)
        // 표시값(소속·관계태그 라벨)은 검색 대상이기도 해서 필터보다 먼저 해석한다.
        val tagChipIdsByPerson = relationTagChipIdsByPerson(all)
        val chipDisplays = resolveChipDisplays(all, tagChipIdsByPerson)
        val recordCounts = recordCountsOf(all)

        val keyword = query?.trim()?.lowercase()?.ifBlank { null }
        val matched = all.filter { keyword == null || it.matches(keyword, tagChipIdsByPerson, chipDisplays) }

        val within = when (sort) {
            PersonSort.RECENT -> Comparator.comparing(Person::lastMetDate, Comparator.nullsLast(Comparator.reverseOrder<LocalDate>()))
            PersonSort.RECORD_COUNT -> compareByDescending<Person> { recordCounts[it.id] ?: 0 }
            PersonSort.NAME -> compareBy(String.CASE_INSENSITIVE_ORDER) { p: Person -> p.name }
        }
        // 같은 값이 몰리는 정렬(기록 0건·만남 없음)에서 순서가 요청마다 흔들리지 않게 이름으로 마무리한다.
        val order = compareByDescending<Person> { it.favorite }
            .then(within)
            .then(compareBy(String.CASE_INSENSITIVE_ORDER) { p: Person -> p.name })

        return matched.sortedWith(order).map {
            PersonResponse.from(it, tagChipIdsByPerson[it.id].orEmpty(), chipDisplays, recordCounts[it.id] ?: 0)
        }
    }

    /** 검색 대상은 이름 + 소속(루트·하위 라벨) + 관계태그 라벨. 사람을 떠올리는 단서가 이름만은 아니다. */
    private fun Person.matches(
        keyword: String,
        tagChipIdsByPerson: Map<Long, List<Long>>,
        chipDisplays: Map<Long, ChipDisplay>,
    ): Boolean {
        if (name.lowercase().contains(keyword)) return true
        val affiliationLabels = affiliationChipId?.let { chipId ->
            val display = chipDisplays[chipId]
            listOfNotNull(display?.label, display?.parentId?.let { chipDisplays[it]?.label })
        }.orEmpty()
        val tagLabels = tagChipIdsByPerson[id].orEmpty().mapNotNull { chipDisplays[it]?.label }
        return (affiliationLabels + tagLabels).any { it.lowercase().contains(keyword) }
    }

    /** 상세 조회(#25). 기본 정보 + 파생 스탯(#30). 내 소유·active 인물만, 아니면 NOT_FOUND. */
    fun detail(userId: UUID, personId: Long): PersonDetailResponse {
        val person = personRepository.findByIdAndOwnerIdAndDeletedAtIsNull(personId, userId)
            ?: throw BusinessException(ErrorCode.NOT_FOUND)
        val stats = personStatsService.statsOf(person)
        val tagChipIds = relationTagChipIdsOf(person)
        val displays = resolveChipDisplays(listOf(person), mapOf(personId to tagChipIds))
        return PersonDetailResponse.from(person, stats, tagChipIds, displays, LocalDate.now())
    }

    /** 즐겨찾기 토글(#28). 내 소유·active 인물만, 아니면 NOT_FOUND. */
    @Transactional
    fun toggleFavorite(userId: UUID, personId: Long): PersonResponse {
        val person = personRepository.findByIdAndOwnerIdAndDeletedAtIsNull(personId, userId)
            ?: throw BusinessException(ErrorCode.NOT_FOUND)
        person.toggleFavorite()
        return toResponse(person)
    }

    /**
     * 삭제(#27). 인물을 소프트삭제하고, 연결된 active 기록마다 이 인물을 연결에서 제거한다 —
     * 그 결과 연결 인물이 0명이 되면(마지막 연결이었으면) 그 기록도 소프트삭제한다.
     * 다인 연결 기록은 통삭제하지 않는다(다른 사람 타임라인 보존, 판단 근거는 mustpass 02 §삭제).
     * 이미 소프트삭제된 기록은 findByPersonId 가 걸러 과거 참조를 보존한다.
     */
    @Transactional
    fun delete(userId: UUID, personId: Long) {
        val person = personRepository.findByIdAndOwnerIdAndDeletedAtIsNull(personId, userId)
            ?: throw BusinessException(ErrorCode.NOT_FOUND)
        // active 기록에서만 이 인물 연결을 끊는다(소프트삭제된 기록은 findByPersonId 가 걸러 과거 참조 보존).
        // 연결이 0명이 된(마지막 연결이었던) 기록은 소프트삭제. 인물의 관계태그 행은 소프트삭제 시 남긴다(과거 참조 보존).
        eventRepository.findByPersonId(personId).forEach { event ->
            val eventId = requireNotNull(event.id)
            eventPersonRepository.deleteByEventIdAndPersonId(eventId, personId)
            if (eventPersonRepository.countByEventId(eventId) == 0L) event.softDelete()
        }
        person.softDelete()
    }

    /**
     * 등록·수정이 공유하는 입력 반영. 검증(글자수·날짜·태그·취향)을 모두 통과한 뒤에만 필드를 세팅한다.
     * 취향 목록은 엔티티에 바로 교체하고, 관계 태그는 조인 엔티티라 검증된 칩 id 목록만 돌려줘
     * 저장(id 확보) 후 호출자가 syncRelationTags 로 교체한다(PUT 시맨틱).
     */
    private fun applyRequest(userId: UUID, person: Person, request: PersonRequest): List<Long> {
        val name = request.name.trim()
        Validators.requireNotBlank(name, Messages.REQUIRED_NAME)
        Validators.maxLength(name, ValidationLimits.NAME_MAX)

        val affiliationChipId = request.affiliationChipId
        if (affiliationChipId != null) {
            val allowedAffiliationIds = chipService.visibleChips(userId, ChipType.AFFILIATION).mapNotNull { it.id }.toSet()
            if (affiliationChipId !in allowedAffiliationIds) throw BusinessException(ErrorCode.NOT_FOUND)
        }

        val birthday = request.birthday
        PersonValidator.validateDates(
            birthYear = birthday?.year,
            birthMonth = birthday?.month,
            birthDay = birthday?.day,
            firstMetDate = request.firstMetDate,
            lastMetDate = request.lastMetDate,
        )

        // 관계태그 id 중복은 첫 등장 기준 1건으로 정규화한다 — 개수 상한도 정규화 이후 개수로 판단.
        val relationTagChipIds = request.relationTagChipIds.distinct()
        val allowedTagIds = chipService.visibleChips(userId, ChipType.RELATION_TAG).mapNotNull { it.id }.toSet()
        PersonValidator.validateRelationTags(relationTagChipIds, allowedTagIds)

        val likes = request.likes.map { it.trim() }.filter { it.isNotBlank() }
        val cautions = request.cautions.map { it.trim() }.filter { it.isNotBlank() }
        PersonValidator.validatePreferences(likes)
        PersonValidator.validatePreferences(cautions)

        // 월·일 없는 생일은 연도까지 무시한다(전부 null) — Birthday.from 이 월·일 기준으로 '생일 없음'을 판정하므로 연도만 남으면 응답에 안 보이는 유령 값이 된다.
        val effectiveBirthday = birthday?.takeIf { it.month != null && it.day != null }

        person.name = name
        person.birthYear = effectiveBirthday?.year
        person.birthMonth = effectiveBirthday?.month
        person.birthDay = effectiveBirthday?.day
        person.firstMetDate = request.firstMetDate
        person.lastMetDate = request.lastMetDate
        person.profileImageUrl = request.profileImageUrl?.trim()?.ifBlank { null }
        person.gender = request.gender?.let { PersonGender.valueOf(it.name) }
        person.affiliationChipId = affiliationChipId
        person.favorite = request.favorite
        person.replaceLikes(likes)
        person.replaceCautions(cautions)
        return relationTagChipIds
    }

    /** 관계 태그 조인 행 전체 교체(수정 시 보낸 값으로 갈아끼움) — 하드삭제 후 순서대로 재삽입. */
    private fun syncRelationTags(personId: Long, chipIds: List<Long>) {
        personRelationTagRepository.deleteByPersonId(personId)
        chipIds.forEachIndexed { order, chipId ->
            personRelationTagRepository.save(PersonRelationTag(personId = personId, chipId = chipId, displayOrder = order))
        }
    }

    private fun relationTagChipIdsOf(person: Person): List<Long> = personRelationTagRepository
        .findByPersonIdOrderByDisplayOrderAsc(requireNotNull(person.id)).map { it.chipId }

    /** 여러 인물의 관계태그 칩 id 를 한 번에 로드(순서 보존) — 목록·홈이 재사용해 N+1 을 막는다. */
    fun relationTagChipIdsByPerson(persons: List<Person>): Map<Long, List<Long>> {
        val personIds = persons.mapNotNull { it.id }
        if (personIds.isEmpty()) return emptyMap()
        return personRelationTagRepository.findByPersonIdInOrderByPersonIdAscDisplayOrderAsc(personIds)
            .groupBy { it.personId }
            .mapValues { (_, rows) -> rows.map { it.chipId } }
    }

    /**
     * 소속·관계 태그 라벨은 칩에서 해석한다 — id 참조라 이름이 바뀌면 자동 반영되고,
     * 소프트삭제된 칩도 findAllById 로 잡혀 라벨이 유지된다(과거 참조 보존, 00-infra).
     */
    private fun toResponse(person: Person): PersonResponse {
        val tagChipIds = relationTagChipIdsOf(person)
        val personId = requireNotNull(person.id)
        val displays = resolveChipDisplays(listOf(person), mapOf(personId to tagChipIds))
        return PersonResponse.from(person, tagChipIds, displays, recordCountsOf(listOf(person))[personId] ?: 0)
    }

    /**
     * 인물들이 참조하는 칩(소속·관계태그)을 한 번에 해석한다.
     * 하위 소속은 루트를 알아야 색·경로를 그릴 수 있어 상위 칩까지 2차로 더 로드한다(최대 2쿼리).
     */
    private fun resolveChipDisplays(persons: List<Person>, tagChipIdsByPerson: Map<Long, List<Long>>): Map<Long, ChipDisplay> {
        val referenced = persons.mapNotNull { it.affiliationChipId } + tagChipIdsByPerson.values.flatten()
        if (referenced.isEmpty()) return emptyMap()
        val displays = chipRepository.findAllById(referenced.distinct())
            .mapNotNull { chip -> chip.id?.let { it to ChipDisplay(chip.label, chip.color, chip.parentId) } }
            .toMap()
        val missingParents = displays.values.mapNotNull { it.parentId }.filter { it !in displays }.distinct()
        if (missingParents.isEmpty()) return displays
        val parents = chipRepository.findAllById(missingParents)
            .mapNotNull { chip -> chip.id?.let { it to ChipDisplay(chip.label, chip.color, chip.parentId) } }
        return displays + parents
    }

    /** 기록 수 배치 집계(정렬·표시 공용). 기록이 0건인 인물은 집계 결과에 없어 호출부가 0으로 읽는다. */
    private fun recordCountsOf(persons: List<Person>): Map<Long, Int> {
        val personIds = persons.mapNotNull { it.id }
        if (personIds.isEmpty()) return emptyMap()
        return eventRepository.countByPersonIdIn(personIds).associate { it.personId to it.count.toInt() }
    }
}
