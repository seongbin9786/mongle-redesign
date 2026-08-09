package com.mongle.service

import com.mongle.domain.Chip
import com.mongle.domain.ChipType
import com.mongle.domain.Event
import com.mongle.domain.EventEmotion
import com.mongle.domain.EventPerson
import com.mongle.domain.Person
import com.mongle.domain.PersonGender
import com.mongle.domain.PersonRelationTag
import com.mongle.repository.ChipRepository
import com.mongle.repository.EventEmotionRepository
import com.mongle.repository.EventPersonRepository
import com.mongle.repository.EventRepository
import com.mongle.repository.PersonRelationTagRepository
import com.mongle.repository.PersonRepository
import com.mongle.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.LocalTime
import java.util.UUID

/**
 * 인증된 사용자 소유의 데모 인물·기록 시드 (#13).
 *
 * 앱 시작 때 자동 실행하지 않는다. 인증된 `POST /api/v1/seed` 요청이 전달한 UUID를 소유자로 사용한다.
 * 멱등: User.demoSeeded가 true면 스킵한다. 기존 인물이 있는 사용자는 완료 처리만 해 데이터 혼합을 막는다.
 * 관계태그 개인 칩도 라벨 존재로 재사용한다.
 *
 * 도메인 서비스(사용자 컨텍스트·검증)를 거치지 않고 리포지토리를 직접 쓴다 — 단 mustpass 불변식
 * (이름 필수·날짜 순서/미래·감정 ≤5·연결 인물 ≥1·관계태그 id 참조 등)은 시드 값에서 지킨다.
 */
@Service
class DemoDataSeeder(
    private val userRepository: UserRepository,
    private val personRepository: PersonRepository,
    private val eventRepository: EventRepository,
    private val chipRepository: ChipRepository,
    private val personRelationTagRepository: PersonRelationTagRepository,
    private val eventPersonRepository: EventPersonRepository,
    private val eventEmotionRepository: EventEmotionRepository,
) {
    @Transactional
    fun seed(ownerId: UUID) {
        val user = requireNotNull(userRepository.findByIdForUpdate(ownerId))
        if (user.demoSeeded) return
        if (personRepository.findByOwnerIdAndDeletedAtIsNull(ownerId).isNotEmpty()) {
            user.markDemoSeeded()
            return
        }

        val today = LocalDate.now()

        // 관계태그는 공통용이 없어(01-chip) 현재 사용자 개인 칩으로 먼저 시드한다. 라벨→id 로 인물이 참조.
        val relationTagIds = ensureRelationTags(
            ownerId,
            listOf(
                "가족" to "#E85D75",
                "친구" to "#0EA5E9",
                "직장" to "#22A06B",
                "대학동기" to "#8B5CF6",
                "동네" to "#F97316",
            ),
        )

        // 소속도 공통용이 없어 개인 칩으로 시드한다. '학교 > 대학교'로 1단계 중첩 케이스를 함께 심어
        // 목록의 하위 chip 표시(mustpass people-directory)가 데모에서 바로 검증된다.
        val affiliationIds = ensureAffiliations(
            ownerId,
            listOf(
                AffiliationSeed("학교", "#0EA5E9", children = listOf("대학교")),
                AffiliationSeed("직장", "#22A06B"),
                AffiliationSeed("가족", "#E85D75"),
                AffiliationSeed("동네", "#F97316"),
            ),
        )

        // 기록·인물이 참조할 공통 칩(감정·날씨·카테고리)을 라벨→id 로 해석.
        val category = commonChipIds(ChipType.CATEGORY)
        val weather = commonChipIds(ChipType.WEATHER)
        val emotion = commonChipIds(ChipType.EMOTION)

        // 인물 3~5명: 관계유형·태그·취향·생일(연도 유무 섞음)·처음/마지막 만난 날 다양하게.
        val seoyeon = personRepository.save(
            Person(
                ownerId = ownerId,
                name = "김서연",
                affiliationChipId = affiliationIds.getValue("학교 > 대학교"),
                gender = PersonGender.FEMALE,
                birthYear = 1995, birthMonth = 4, birthDay = 12,
                firstMetDate = today.minusYears(3),
                lastMetDate = today.minusDays(3),
                favorite = true,
            ).apply {
                replaceLikes(listOf("카페 투어", "산책"))
                replaceCautions(listOf("매운 음식"))
            },
        )
        saveRelationTags(seoyeon.id!!, tagIds(relationTagIds, "친구", "대학동기"))
        val junho = personRepository.save(
            Person(
                ownerId = ownerId,
                name = "이준호",
                affiliationChipId = affiliationIds.getValue("직장"),
                gender = PersonGender.MALE,
                // 생일 연도 생략(월·일만) — 연도-선택 케이스 데모.
                birthMonth = 9,
                birthDay = 23,
                firstMetDate = today.minusMonths(14),
                lastMetDate = today.minusMonths(1),
            ).apply {
                replaceLikes(listOf("커피", "러닝"))
            },
        )
        saveRelationTags(junho.id!!, tagIds(relationTagIds, "직장"))
        val minji = personRepository.save(
            Person(
                ownerId = ownerId,
                name = "박민지",
                affiliationChipId = affiliationIds.getValue("가족"),
                gender = PersonGender.FEMALE,
                birthYear = 2000,
                birthMonth = 11,
                birthDay = 5,
                // 가족이라 처음 만난 날은 비워 둠(선택 필드) — lastMet 만 있는 케이스.
                lastMetDate = today.minusMonths(2),
                favorite = true,
            ),
        )
        saveRelationTags(minji.id!!, tagIds(relationTagIds, "가족"))
        val yunseo = personRepository.save(
            Person(
                ownerId = ownerId,
                name = "최윤서",
                affiliationChipId = affiliationIds.getValue("동네"),
                gender = PersonGender.FEMALE,
                // 생일 없음.
                firstMetDate = today.minusYears(1).minusMonths(2),
                lastMetDate = today.minusDays(10),
            ).apply {
                replaceLikes(listOf("떡볶이"))
                replaceCautions(listOf("늦은 약속"))
            },
        )
        saveRelationTags(yunseo.id!!, tagIds(relationTagIds, "동네", "친구"))
        val hajun = personRepository.save(
            Person(
                ownerId = ownerId,
                name = "정하준",
                affiliationChipId = affiliationIds.getValue("학교 > 대학교"),
                gender = PersonGender.MALE,
                birthYear = 1998,
                birthMonth = 7,
                birthDay = 30,
                firstMetDate = today.minusYears(2),
                lastMetDate = today.minusMonths(10),
            ),
        )
        saveRelationTags(hajun.id!!, tagIds(relationTagIds, "대학동기", "친구"))

        // 기록 8건: 만남/연락/기념일 섞고 감정·날씨·메모 다양하게, 과거 여러 달에 분산.
        // '정확히 1년 전 오늘' 1건 포함(1년 전 오늘·활동흐름·친밀도 데모 성립 조건, #13).
        seedEvent(ownerId, today.minusYears(1), category["만남"]!!, weather["맑음"], listOf(hajun.id!!), emotionIds(emotion, "반가움", "즐거움")) {
            memo = "오랜만에 얼굴 보고 싶어서\n한강 피크닉"
        }
        seedEvent(ownerId, today.minusDays(3), category["만남"]!!, weather["흐림"], listOf(seoyeon.id!!), emotionIds(emotion, "편안", "고마움")) {
            occurredTime = LocalTime.of(15, 0)
            title = "서연이랑 카페"
            memo = "시험 끝나고 기분전환\n홍대 카페에서 수다"
        }
        seedEvent(ownerId, today.minusDays(10), category["만남"]!!, weather["더움"], listOf(yunseo.id!!), emotionIds(emotion, "즐거움")) {
            memo = "동네 저녁 산책"
        }
        seedEvent(ownerId, today.minusMonths(1), category["연락"]!!, null, listOf(junho.id!!), emotionIds(emotion, "그냥")) {
            memo = "문득 생각나서\n오랜만에 안부 전화"
        }
        seedEvent(ownerId, today.minusMonths(2), category["만남"]!!, weather["맑음"], listOf(minji.id!!, seoyeon.id!!), emotionIds(emotion, "반가움", "편안", "즐거움")) {
            memo = "엄마 생신\n가족 모임 겸 저녁"
        }
        seedEvent(ownerId, today.minusMonths(4), category["기념일"]!!, weather["쌀쌀"], listOf(seoyeon.id!!), emotionIds(emotion, "뭉클", "고마움")) {
            title = "서연 생일"
            memo = "10년지기 생일\n생일 축하 저녁"
        }
        // 하준: 1년 전 → 10개월 전 두 번 만난 뒤 오래 지나 평소 주기(2개월)의 2배를 넘긴 DISTANT 사례.
        seedEvent(ownerId, today.minusMonths(10), category["만남"]!!, weather["비"], listOf(hajun.id!!, yunseo.id!!), emotionIds(emotion, "즐거움", "그냥")) {
            memo = "동아리 번개 모임"
        }
        seedEvent(ownerId, today.minusMonths(9), category["연락"]!!, null, listOf(junho.id!!), emotionIds(emotion, "그냥")) {
            memo = "협업 논의\n프로젝트 관련 메시지"
        }
        user.markDemoSeeded()
    }

    /** 현재 사용자 관계태그 조인 행을 순서대로 심는다. */
    private fun saveRelationTags(personId: Long, chipIds: List<Long>) {
        chipIds.forEachIndexed { order, chipId ->
            personRelationTagRepository.save(PersonRelationTag(personId = personId, chipId = chipId, displayOrder = order))
        }
    }

    /** 현재 사용자 개인 관계태그 칩을 라벨로 보장(있으면 재사용)하고 라벨→id 를 돌려준다. */
    private fun ensureRelationTags(ownerId: UUID, tags: List<Pair<String, String>>): Map<String, Long> {
        val existing = chipRepository
            .findByTypeAndOwnerIdAndDeletedAtIsNullOrderByDisplayOrderAsc(ChipType.RELATION_TAG, ownerId)
            .associateBy { it.label }
        var order = existing.values.maxOfOrNull { it.displayOrder }?.plus(1) ?: 0
        return tags.associate { (label, color) ->
            val chip = existing[label]?.apply { changeColor(color) } ?: chipRepository.save(
                Chip(type = ChipType.RELATION_TAG, ownerId = ownerId, label = label, color = color, displayOrder = order++),
            )
            label to chip.id!!
        }
    }

    /** 소속 시드 한 줄. children 은 이 소속 아래 1단계 하위 소속 라벨(색은 루트만 갖는다). */
    private data class AffiliationSeed(
        val label: String,
        val color: String,
        val children: List<String> = emptyList(),
    )

    /**
     * 현재 사용자 개인 소속 칩을 라벨로 보장하고 `라벨→id` 를 돌려준다.
     * 하위 소속의 키는 `"루트 > 하위"` — 라벨만으로는 다른 루트의 동명 하위와 구분되지 않기 때문.
     */
    private fun ensureAffiliations(ownerId: UUID, seeds: List<AffiliationSeed>): Map<String, Long> {
        val existing = chipRepository
            .findByTypeAndOwnerIdAndDeletedAtIsNullOrderByDisplayOrderAsc(ChipType.AFFILIATION, ownerId)
        var order = existing.maxOfOrNull { it.displayOrder }?.plus(1) ?: 0
        val ids = mutableMapOf<String, Long>()

        seeds.forEach { seed ->
            val root = existing.firstOrNull { it.root && it.label == seed.label }?.apply { changeColor(seed.color) }
                ?: chipRepository.save(
                    Chip(type = ChipType.AFFILIATION, ownerId = ownerId, label = seed.label, color = seed.color, displayOrder = order++),
                )
            ids[seed.label] = root.id!!
            seed.children.forEach { childLabel ->
                val child = existing.firstOrNull { it.parentId == root.id && it.label == childLabel }
                    ?: chipRepository.save(
                        Chip(type = ChipType.AFFILIATION, ownerId = ownerId, label = childLabel, displayOrder = order++, parentId = root.id),
                    )
                ids["${seed.label} > $childLabel"] = child.id!!
            }
        }
        return ids
    }

    private fun commonChipIds(type: ChipType): Map<String, Long> = chipRepository
        .findByTypeAndOwnerIdIsNullAndDeletedAtIsNullOrderByDisplayOrderAsc(type)
        .associate { it.label to it.id!! }

    private fun tagIds(all: Map<String, Long>, vararg labels: String): List<Long> = labels.map { all.getValue(it) }

    private fun emotionIds(all: Map<String, Long>, vararg labels: String): List<Long> = labels.map { all.getValue(it) }

    /** 기록 1건을 저장하고 연결 인물·감정 조인 행을 순서대로 심는다(대표 인물 = personIds 첫 번째). */
    private fun seedEvent(
        ownerId: UUID,
        date: LocalDate,
        categoryChipId: Long,
        weatherChipId: Long?,
        personIds: List<Long>,
        emotionChipIds: List<Long>,
        configure: Event.() -> Unit,
    ) {
        val event = eventRepository.save(
            Event(
                ownerId = ownerId,
                occurredDate = date,
                categoryChipId = categoryChipId,
                weatherChipId = weatherChipId,
            ).apply(configure),
        )
        val eventId = event.id!!
        personIds.forEachIndexed { order, personId ->
            eventPersonRepository.save(EventPerson(eventId = eventId, personId = personId, displayOrder = order))
        }
        emotionChipIds.forEachIndexed { order, chipId ->
            eventEmotionRepository.save(EventEmotion(eventId = eventId, chipId = chipId, displayOrder = order))
        }
    }
}
