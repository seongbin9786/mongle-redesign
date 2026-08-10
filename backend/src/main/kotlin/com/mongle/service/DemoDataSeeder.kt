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
 *
 * 인물상: 서른 살, 사회생활 4년차 직장인의 관계망. 회사(현·전 직장)·대학·고등학교·가족·운동/모임이
 * 겹치지 않는 축으로 섞여 있고, 만남 주기가 사람마다 다르다 — 궤도 홈의 눈금 7개(7일~그 이전)와
 * 멀어진 관계(DISTANT) 판정이 한 화면에서 모두 관찰돼야 데모가 성립한다.
 *
 * **모든 인물에게 '만남' 카테고리 기록을 최소 2건 준다.** 궤도의 반경(마지막 만남 경과일)도
 * 친밀도 판정(평소 주기)도 만남 기록에서만 나오기 때문이다 — 수기 `lastMetDate`만 있고 만남 기록이
 * 없는 인물은 경과일이 null이라 전부 최외곽('그 이전') 눈금에 쌓여 기본 배율에서 화면 밖으로 나간다.
 * '그 이전' 눈금 데모는 그래서 홍세영 한 명(연락만 하는 사이)으로만 남긴다.
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
        val tag = ensureRelationTags(
            ownerId,
            listOf(
                "가족" to "#E85D75",
                "친구" to "#0EA5E9",
                "직장" to "#22A06B",
                "대학동기" to "#8B5CF6",
                "고등학교" to "#65A30D",
                "운동" to "#14B8A6",
                "동네" to "#F97316",
            ),
        )

        // 소속도 공통용이 없어 개인 칩으로 시드한다. '직장 > 같은 팀', '학교 > 대학교'로 1단계 중첩 케이스를
        // 함께 심어 목록의 하위 chip 표시(mustpass people-directory)가 데모에서 바로 검증된다.
        val at = ensureAffiliations(
            ownerId,
            listOf(
                AffiliationSeed("직장", "#22A06B", children = listOf("같은 팀", "다른 팀", "전 직장")),
                AffiliationSeed("학교", "#0EA5E9", children = listOf("대학교", "고등학교")),
                AffiliationSeed("가족", "#E85D75"),
                AffiliationSeed("모임", "#8B5CF6"),
                AffiliationSeed("동네", "#F97316"),
            ),
        )

        // 기록·인물이 참조할 공통 칩(감정·날씨·카테고리)을 라벨→id 로 해석.
        val category = commonChipIds(ChipType.CATEGORY)
        val weather = commonChipIds(ChipType.WEATHER)
        val emotion = commonChipIds(ChipType.EMOTION)

        val ctx = SeedContext(ownerId, today, category, weather, emotion, at, tag)

        // ── 회사 (4년차, 현 직장은 3년 전 이직) ──────────────────────────────
        val dohyeon = ctx.person("김도현", PersonGender.MALE, "직장 > 같은 팀", listOf("직장")) {
            birthYear = 1993
            birthMonth = 5
            birthDay = 8
            firstMetDate = today.minusDays(1090)
            replaceLikes(listOf("커피", "야구"))
        }
        val seojun = ctx.person("박서준", PersonGender.MALE, "직장 > 같은 팀", listOf("직장", "친구")) {
            birthYear = 1996
            birthMonth = 2
            birthDay = 19
            firstMetDate = today.minusDays(1090)
            replaceLikes(listOf("라멘", "게임"))
            favorite = true
        }
        val jieun = ctx.person("이지은", PersonGender.FEMALE, "직장 > 같은 팀", listOf("직장")) {
            birthYear = 1994
            birthMonth = 11
            birthDay = 2
            firstMetDate = today.minusDays(1090)
            replaceLikes(listOf("필라테스"))
        }
        val minseok = ctx.person("최민석", PersonGender.MALE, "직장 > 같은 팀", listOf("직장")) {
            birthYear = 1988
            birthMonth = 3
            birthDay = 27
            firstMetDate = today.minusDays(1090)
            replaceCautions(listOf("갑작스러운 회식"))
        }
        val hayeong = ctx.person("정하영", PersonGender.FEMALE, "직장 > 다른 팀", listOf("직장")) {
            birthYear = 1997
            birthMonth = 9
            birthDay = 14
            firstMetDate = today.minusDays(880)
            replaceLikes(listOf("디저트", "전시"))
        }
        val sohee = ctx.person("한소희", PersonGender.FEMALE, "직장 > 전 직장", listOf("직장")) {
            birthYear = 1995
            birthMonth = 7
            birthDay = 30
            firstMetDate = today.minusDays(1750)
        }
        val woojin = ctx.person("장우진", PersonGender.MALE, "직장 > 전 직장", listOf("직장")) {
            birthYear = 1991
            birthMonth = 10
            birthDay = 30
            firstMetDate = today.minusDays(1750)
            replaceLikes(listOf("등산"))
        }

        // ── 대학 ────────────────────────────────────────────────────────────
        val junyeong = ctx.person("오준영", PersonGender.MALE, "학교 > 대학교", listOf("대학동기", "친구")) {
            birthYear = 1996
            birthMonth = 6
            birthDay = 11
            firstMetDate = today.minusDays(2900)
            replaceLikes(listOf("등산", "위스키"))
            favorite = true
        }
        val chaewon = ctx.person("윤채원", PersonGender.FEMALE, "학교 > 대학교", listOf("대학동기")) {
            birthYear = 1996
            birthMonth = 1
            birthDay = 25
            firstMetDate = today.minusDays(2900)
            replaceLikes(listOf("영화"))
        }
        val taeyun = ctx.person("임태윤", PersonGender.MALE, "학교 > 대학교", listOf("대학동기")) {
            birthYear = 1994
            birthMonth = 4
            birthDay = 3
            firstMetDate = today.minusDays(2900)
        }
        val subin = ctx.person("강수빈", PersonGender.FEMALE, "학교 > 대학교", listOf("대학동기")) {
            birthYear = 1997
            birthMonth = 12
            birthDay = 8
            firstMetDate = today.minusDays(2400)
        }

        // ── 고등학교 ────────────────────────────────────────────────────────
        val jaehun = ctx.person("신재훈", PersonGender.MALE, "학교 > 고등학교", listOf("고등학교", "친구")) {
            birthYear = 1996
            birthMonth = 8
            birthDay = 22
            firstMetDate = today.minusDays(4800)
            replaceLikes(listOf("삼겹살", "여행"))
            favorite = true
        }
        val yujin = ctx.person("배유진", PersonGender.FEMALE, "학교 > 고등학교", listOf("고등학교")) {
            birthYear = 1996
            birthMonth = 3
            birthDay = 16
            firstMetDate = today.minusDays(4800)
        }
        val jiho = ctx.person("문지호", PersonGender.MALE, "학교 > 고등학교", listOf("고등학교")) {
            birthYear = 1996
            birthMonth = 10
            birthDay = 5
            firstMetDate = today.minusDays(4800)
        }
        val seyeong = ctx.person("홍세영", PersonGender.FEMALE, "학교 > 고등학교", listOf("고등학교")) {
            birthYear = 1995
            birthMonth = 5
            birthDay = 5
            firstMetDate = today.minusDays(4800)
        }

        // ── 가족 (처음 만난 날은 비워 둔다 — 선택 필드의 자연스러운 공백) ────
        val mom = ctx.person("김영주", PersonGender.FEMALE, "가족", listOf("가족")) {
            birthYear = 1966
            birthMonth = 9
            birthDay = 19
            replaceLikes(listOf("드라마", "화분"))
            replaceCautions(listOf("매운 음식"))
            favorite = true
        }
        val dad = ctx.person("김성호", PersonGender.MALE, "가족", listOf("가족")) {
            birthYear = 1963
            birthMonth = 1
            birthDay = 7
            replaceLikes(listOf("등산", "낚시"))
        }
        val sister = ctx.person("김도경", PersonGender.FEMALE, "가족", listOf("가족")) {
            birthYear = 2000
            birthMonth = 5
            birthDay = 23
        }

        // ── 운동·모임·동네 ──────────────────────────────────────────────────
        val yujinPt = ctx.person("노유진", PersonGender.FEMALE, "동네", listOf("운동", "동네")) {
            birthYear = 1993
            birthMonth = 6
            birthDay = 28
            firstMetDate = today.minusDays(17)
        }
        val jihun = ctx.person("서지훈", PersonGender.MALE, "모임", listOf("운동")) {
            birthYear = 1995
            birthMonth = 11
            birthDay = 13
            firstMetDate = today.minusDays(400)
            replaceLikes(listOf("러닝", "국수"))
        }
        val eunbi = ctx.person("조은비", PersonGender.FEMALE, "모임", listOf("운동", "친구")) {
            birthYear = 1998
            birthMonth = 4
            birthDay = 9
            firstMetDate = today.minusDays(400)
        }
        val minjae = ctx.person("황민재", PersonGender.MALE, "모임", listOf("운동")) {
            birthYear = 1992
            birthMonth = 2
            birthDay = 11
            firstMetDate = today.minusDays(790)
        }
        val nayeon = ctx.person("권나연", PersonGender.FEMALE, "모임", listOf("친구")) {
            birthYear = 1996
            birthMonth = 12
            birthDay = 2
            firstMetDate = today.minusDays(690)
        }
        // 생일 연도 생략(월·일만) — 아직 서로를 깊이 모르는 사이의 연도-선택 케이스.
        val harin = ctx.person("유하린", PersonGender.FEMALE, "동네", listOf("친구")) {
            birthMonth = 7
            birthDay = 21
            firstMetDate = today.minusDays(30)
            replaceLikes(listOf("산책", "고양이"))
        }

        // ── 만남 기록 ───────────────────────────────────────────────────────
        // 만남 주기를 사람마다 다르게 두되 최근 쪽에 몰지 않는다 — 한 주 안에 만난 사람이
        // 여럿이면 현실감도 떨어지고, 안쪽 눈금에 얼굴이 겹쳐 노드가 붐빔 보정으로 작아진다.
        // 한 기록에 여러 사람을 묶는 경우(본가, 팀 회식, 크루 정기런)를 섞어 다중 연결도 남긴다.

        // 회사: 사수와 입사 동기는 자주, 팀장과 옆 팀은 사건 단위로 뜸하게.
        ctx.meet(5, listOf(dohyeon), "즐거움", "편안", weatherLabel = "맑음") {
            memo = "퇴근하고 회사 앞에서 맥주 한 잔\n이직 고민 들어줬다"
        }
        ctx.meet(26, listOf(dohyeon), "그냥", weatherLabel = "흐림") { memo = "점심에 새로 생긴 국밥집" }
        ctx.meet(62, listOf(dohyeon), "즐거움", "반가움", weatherLabel = "더움") {
            title = "잠실 야구장"
            memo = "주말에 야구 보러\n9회말에 역전당했다"
        }

        ctx.meet(11, listOf(seojun), "즐거움", "편안") {
            occurredTime = LocalTime.of(19, 30)
            memo = "동기끼리 저녁\n연봉 얘기 반, 이직 얘기 반"
        }
        ctx.meet(38, listOf(seojun), "그냥", weatherLabel = "비") { memo = "회사 근처 라멘집" }
        ctx.meet(76, listOf(seojun), "즐거움") { memo = "주말 보드게임 카페" }

        ctx.meet(45, listOf(jieun, hayeong), "그냥", "아쉬움") {
            title = "팀 회식"
            memo = "분기 마감하고 회식\n2차는 도망쳤다"
        }
        ctx.meet(88, listOf(jieun), "편안") { memo = "점심 먹고 회사 뒷길 산책" }

        ctx.meet(110, listOf(minseok), "든든", "그냥") {
            memo = "팀장님이랑 1on1 겸 저녁\n내년 커리어 얘기"
        }
        ctx.meet(190, listOf(minseok, dohyeon, jieun), "즐거움") {
            title = "부서 워크숍"
            memo = "1박 2일 워크숍\n생각보다 재밌었다"
        }

        ctx.meet(30, listOf(hayeong), "편안") { memo = "점심 메이트\n회사 앞 파스타" }
        ctx.meet(58, listOf(hayeong), "편안", "고마움") { memo = "퇴근길에 카페에서 30분" }
        ctx.meet(95, listOf(hayeong), "설렘", "즐거움", weatherLabel = "맑음") {
            title = "전시 보고 온 날"
            memo = "주말에 성수 전시\n사진 많이 찍었다"
        }

        // 한소희: 평소 주기(넉 달 남짓)의 두 배를 넘겨 멀어진 관계(DISTANT)로 잡히는 사례.
        ctx.meet(430, listOf(sohee), "반가움", "아쉬움") { memo = "이직 축하 저녁" }
        ctx.meet(610, listOf(sohee), "서운") { memo = "퇴사 전 마지막 점심" }
        ctx.meet(700, listOf(sohee), "즐거움") { memo = "프로젝트 끝나고 회식" }

        // 장우진: 첫 회사 사수. '3년' 눈금에 앉는 오래된 관계.
        ctx.meet(980, listOf(woojin), "든든", "고마움") { memo = "첫 회사 사수님\n이직 상담 받았다" }
        ctx.meet(1180, listOf(woojin), "서운", "고마움") { memo = "퇴사 인사드리고 저녁" }

        // 대학: 절친만 이어서 보고 나머지는 동기 모임에서 한 번에 본다.
        ctx.meet(21, listOf(junyeong), "편안", "즐거움") { memo = "동네에서 늦게까지 수다" }
        ctx.meet(55, listOf(junyeong), "즐거움", weatherLabel = "맑음") {
            title = "북한산"
            memo = "오랜만에 등산\n내려와서 막걸리"
        }
        ctx.meet(96, listOf(junyeong), "설렘") { memo = "생일 겸 위스키바" }
        ctx.meet(210, listOf(junyeong, chaewon, taeyun), "반가움") {
            title = "과 동기 모임"
            memo = "학교 앞에서 모임\n다들 늙었다고 웃었다"
        }

        ctx.meet(130, listOf(chaewon), "즐거움") { memo = "영화 보고 저녁" }
        ctx.meet(320, listOf(chaewon), "뭉클", "고마움") { memo = "결혼 소식 듣고 축하 자리" }

        ctx.meet(165, listOf(taeyun), "고마움", "든든") { memo = "동아리 선배가 밥 사줬다" }
        ctx.meet(400, listOf(taeyun), "그냥") { memo = "학교 근처에서 한잔" }

        ctx.meet(300, listOf(subin), "든든") { memo = "취업 상담 겸 커피" }
        ctx.meet(520, listOf(subin), "뭉클", "즐거움") { memo = "졸업 축하 자리" }

        // 고등학교: 절친만 이어지고 나머지는 모임에서만 본다.
        ctx.meet(68, listOf(jaehun), "편안", "즐거움") { memo = "동네에서 삼겹살\n결국 새벽까지" }
        ctx.meet(140, listOf(jaehun), "설렘") { memo = "가을에 같이 갈 여행 계획 세웠다" }
        ctx.meet(260, listOf(jaehun, yujin), "반가움") {
            title = "고등학교 친구들"
            memo = "10년 넘게 보는 사이\n볼 때마다 그때 얘기"
        }

        ctx.meet(320, listOf(yujin), "반가움", "그냥") { memo = "동창회에서 오랜만에" }
        ctx.meet(560, listOf(yujin), "편안") { memo = "브런치 먹고 산책" }

        // 문지호: 만남이 3년 눈금에 남아 있고 주기의 두 배를 넘긴 사례.
        ctx.meet(730, listOf(jiho), "즐거움") { memo = "군대 얘기하다 새벽까지" }
        ctx.meet(1050, listOf(jiho), "반가움") { memo = "졸업하고 처음 본 날" }

        // 가족: 본가는 두어 달에 한 번, 엄마만 그 사이에 따로 본다.
        ctx.meet(18, listOf(mom), "뭉클") { memo = "엄마 병원 같이 다녀옴" }
        ctx.meet(52, listOf(mom, dad, sister), "고마움", "편안") {
            title = "본가"
            memo = "주말에 본가 다녀옴\n엄마가 반찬 싸줬다"
        }
        ctx.meet(120, listOf(mom, dad, sister), "편안") { memo = "본가에서 하루 자고 왔다" }
        ctx.meet(230, listOf(dad), "든든", "고마움", weatherLabel = "쌀쌀") { memo = "아빠랑 둘이 등산" }

        // 운동과 모임: PT만 주 단위로 잦고, 크루와 암장은 사건 단위.
        ctx.meet(3, listOf(yujinPt), "든든") { memo = "PT 6회차\n하체 하고 계단 못 내려감" }
        ctx.meet(10, listOf(yujinPt), "그냥") { memo = "PT" }
        ctx.meet(17, listOf(yujinPt), "설렘") { memo = "PT 등록하고 첫 인바디" }

        ctx.meet(26, listOf(jihun), "즐거움", weatherLabel = "쌀쌀") { memo = "한강 러닝 10km" }
        ctx.meet(47, listOf(jihun), "뭉클", "즐거움") { memo = "하프 마라톤 같이 뛴 날" }
        ctx.meet(80, listOf(jihun, eunbi), "그냥") {
            title = "크루 정기런"
            memo = "정기런\n끝나고 다 같이 국수"
        }
        ctx.meet(150, listOf(eunbi), "편안") { memo = "러닝 끝나고 국수" }

        ctx.meet(200, listOf(minjae), "즐거움") { memo = "클라이밍장에서 3시간" }
        ctx.meet(330, listOf(minjae), "설렘") { memo = "암장 등록한 날" }

        ctx.meet(345, listOf(nayeon), "편안") { memo = "스터디 끝나고 저녁" }
        ctx.meet(540, listOf(nayeon), "그냥") { memo = "스터디 첫 모임" }

        ctx.meet(6, listOf(harin), "설렘") { memo = "두 번째로 만난 날\n동네 파스타집" }
        ctx.meet(30, listOf(harin), "설렘", "반가움") { memo = "소개로 처음 만난 날" }

        // ── 연락·기념일 ─────────────────────────────────────────────────────
        // 홍세영: 만남 기록이 없어 '그 이전' 눈금에 앉는 유일한 사례(연락만 하는 사이).
        ctx.contact(45, listOf(seyeong), "그냥") { memo = "카톡으로 안부\n올해는 꼭 보자고 했다" }
        ctx.contact(200, listOf(sohee), "그냥") { memo = "잘 지내냐고 안부 전화" }

        // 정확히 1년 전 오늘 1건 — 회고(#43)·활동 흐름 데모의 성립 조건.
        ctx.anniversary(today.minusYears(1), listOf(jaehun), "뭉클", "고마움") {
            title = "재훈이 생일"
            memo = "매년 챙기는 생일\n올해도 케이크 들고 갔다"
        }

        user.markDemoSeeded()
    }

    /**
     * 시드 한 번 동안 바뀌지 않는 소유자·오늘·칩 해석 결과를 묶는다.
     * 인물·기록 한 줄마다 같은 인자 6개를 끌고 다니면 정작 데이터(누구를 언제 만났나)가 안 읽힌다.
     */
    private inner class SeedContext(
        val ownerId: UUID,
        val today: LocalDate,
        val category: Map<String, Long>,
        val weather: Map<String, Long>,
        val emotion: Map<String, Long>,
        val affiliation: Map<String, Long>,
        val relationTag: Map<String, Long>,
    ) {
        fun person(
            name: String,
            gender: PersonGender,
            affiliationLabel: String,
            tags: List<String>,
            configure: Person.() -> Unit,
        ): Long {
            val person = personRepository.save(
                Person(
                    ownerId = ownerId,
                    name = name,
                    gender = gender,
                    affiliationChipId = affiliation.getValue(affiliationLabel),
                ).apply(configure),
            )
            val personId = requireNotNull(person.id)
            tags.forEachIndexed { order, label ->
                personRelationTagRepository.save(
                    PersonRelationTag(personId = personId, chipId = relationTag.getValue(label), displayOrder = order),
                )
            }
            return personId
        }

        fun meet(
            daysAgo: Long,
            personIds: List<Long>,
            vararg emotions: String,
            weatherLabel: String? = null,
            configure: Event.() -> Unit,
        ) = event("만남", daysAgo, personIds, emotions, weatherLabel, configure)

        fun contact(
            daysAgo: Long,
            personIds: List<Long>,
            vararg emotions: String,
            configure: Event.() -> Unit,
        ) = event("연락", daysAgo, personIds, emotions, null, configure)

        fun anniversary(
            date: LocalDate,
            personIds: List<Long>,
            vararg emotions: String,
            configure: Event.() -> Unit,
        ) = save("기념일", date, personIds, emotions, null, configure)

        private fun event(
            categoryLabel: String,
            daysAgo: Long,
            personIds: List<Long>,
            emotions: Array<out String>,
            weatherLabel: String?,
            configure: Event.() -> Unit,
        ) = save(categoryLabel, today.minusDays(daysAgo), personIds, emotions, weatherLabel, configure)

        /** 기록 1건을 저장하고 연결 인물·감정 조인 행을 순서대로 심는다(대표 인물 = personIds 첫 번째). */
        private fun save(
            categoryLabel: String,
            date: LocalDate,
            personIds: List<Long>,
            emotions: Array<out String>,
            weatherLabel: String?,
            configure: Event.() -> Unit,
        ) {
            val event = eventRepository.save(
                Event(
                    ownerId = ownerId,
                    occurredDate = date,
                    categoryChipId = category.getValue(categoryLabel),
                    weatherChipId = weatherLabel?.let { weather.getValue(it) },
                ).apply(configure),
            )
            val eventId = requireNotNull(event.id)
            personIds.forEachIndexed { order, personId ->
                eventPersonRepository.save(EventPerson(eventId = eventId, personId = personId, displayOrder = order))
            }
            emotions.forEachIndexed { order, label ->
                eventEmotionRepository.save(EventEmotion(eventId = eventId, chipId = emotion.getValue(label), displayOrder = order))
            }
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
}
