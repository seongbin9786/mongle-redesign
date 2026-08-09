package com.mongle.service

import com.mongle.domain.Chip
import com.mongle.domain.ChipType
import com.mongle.repository.ChipRepository
import com.mongle.repository.PersonRepository
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationRunner
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * 소속 도입 이전의 자유 텍스트 `Person.relationType` 을 AFFILIATION 칩으로 승격하는 1회성 백필.
 *
 * 같은 사용자 안에서 같은 문자열은 하나의 루트 소속 칩으로 모은다(계층 없음 — 중첩은 사용자가 나중에 손으로 짠다).
 * 승격 후 `relation_type` 을 비우므로 다음 기동에는 대상이 0건이라 아무 일도 하지 않는다(멱등).
 *
 * ChipSeeder(@Order(1)) 다음에 돌아야 칩 테이블이 준비된 뒤 실행된다.
 */
@Order(2)
@Component
class AffiliationBackfill(
    private val personRepository: PersonRepository,
    private val chipRepository: ChipRepository,
) : ApplicationRunner {
    private val log = LoggerFactory.getLogger(javaClass)

    @Transactional
    override fun run(args: org.springframework.boot.ApplicationArguments?) {
        val pending = personRepository.findAll()
            .filter { it.deletedAt == null && it.affiliationChipId == null && !it.relationType.isNullOrBlank() }
        if (pending.isEmpty()) return

        pending.groupBy { it.ownerId }.forEach { (ownerId, persons) ->
            val chipsByLabel = existingAffiliations(ownerId).toMutableMap()
            var nextOrder = chipsByLabel.size
            persons.forEach { person ->
                val label = requireNotNull(person.relationType).trim()
                val chip = chipsByLabel.getOrPut(label) {
                    val created = chipRepository.save(
                        Chip(
                            type = ChipType.AFFILIATION,
                            ownerId = ownerId,
                            label = label,
                            // 팔레트를 순환해 사용자마다 소속들이 서로 구분되는 ring 색을 갖게 한다.
                            color = PALETTE[nextOrder % PALETTE.size],
                            displayOrder = nextOrder,
                        ),
                    )
                    nextOrder += 1
                    created
                }
                person.affiliationChipId = chip.id
                person.relationType = null
            }
        }
        log.info("소속 백필: 인물 {}명의 관계 유형을 AFFILIATION 칩으로 승격했습니다.", pending.size)
    }

    private fun existingAffiliations(ownerId: UUID): Map<String, Chip> = chipRepository
        .findByTypeAndOwnerIdAndDeletedAtIsNullOrderByDisplayOrderAsc(ChipType.AFFILIATION, ownerId)
        .filter { it.root }
        .associateBy { it.label }

    companion object {
        // 관계태그 시드 색(ChipSeeder)과 같은 계열 — 프론트 relation-tag-colors.ts 팔레트의 부분집합.
        private val PALETTE = listOf(
            "#0EA5E9",
            "#22A06B",
            "#8B5CF6",
            "#F97316",
            "#E85D75",
            "#14B8A6",
            "#DB2777",
            "#65A30D",
        )
    }
}
