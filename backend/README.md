# mongle-backend

관계도감(mongle) 백엔드 — Spring Boot + Kotlin, 레이어드 아키텍처(`controller → service → repository` + `domain`).

- **실행·운영·배포:** [docs/runbook](docs/runbook/) (도커 로컬 실행 = MySQL+backend compose)
- **도메인 불변식:** [docs/mustpass](docs/mustpass/) (테스트 코드 없음 — [테스트 정책](.claude/rules/testing.md))
- **코드 컨벤션:** [.claude/rules/conventions.md](.claude/rules/conventions.md) (id-only 참조·조인 엔티티·네이밍·JWT·스웨거 규칙)
- **제품 스펙(SSOT):** [../docs/prd](../docs/prd/)

## API 문서 (Swagger)

서버 기동 후 (→ [runbook/local.md](docs/runbook/local.md)):

| 경로                     | 내용                                                         |
| ------------------------ | ------------------------------------------------------------ |
| `/swagger-ui/index.html` | Swagger UI — 우상단 **Authorize**에 Bearer 토큰 입력 후 호출 |
| `/v3/api-docs`           | OpenAPI 3 JSON                                               |

- 두 경로는 무인증. 나머지 `/api/v1/`**는 JWT 필요 — 토큰 발급은 `POST /api/v1/auth/token` `{"userId":"UUID","username":"이름"}`.
- 로컬 기본 주소: [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)

### 화면 ↔ API 연계 매핑

Swagger SSOT: [http://localhost:18081/swagger-ui/index.html](http://localhost:18081/swagger-ui/index.html) (로컬 compose 기본 호스트 포트 `18081`)

| 화면 (프론트 라우트)                     | API                                                  | 클라이언트                   | 연동                                       |
| ---------------------------------------- | ---------------------------------------------------- | ---------------------------- | ------------------------------------------ |
| **앱 부트** (`main.tsx`)                 | `POST /api/v1/auth/token` · `POST /api/v1/seed`      | `authenticateUser`           | ✅                                         |
| **홈** `/`                               | `GET /api/v1/home/relation-map`                      | `fetchRelationMap`           | ✅                                         |
|                                          | `GET /api/v1/zones`                                  | `getZones`                   | ✅ (홈 우주 = 존별 인물 묶음)              |
|                                          | `GET /api/v1/home/throwback`                         | `fetchThrowback`             | ✅ (204 → 카드 숨김)                       |
| **사람 목록** `/people`                  | `GET /api/v1/persons?sort=&query=`                   | `fetchPersons`               | ✅                                         |
| **인연 추가** `/people/new`              | `POST /api/v1/persons`                               | `createPerson`               | ✅                                         |
|                                          | `GET /api/v1/chips?type=RELATION_TAG`                | `fetchChips`                 | ✅                                         |
|                                          | `POST /api/v1/chips` (RELATION_TAG)                  | `createChip`                 | ✅                                         |
|                                          | `POST /api/v1/images/upload-permission`              | Vercel Blob 함수             | ✅ (업로드 전 JWT 확인)                    |
| **프로필** `/people/$id`                 | `GET /api/v1/persons/{id}`                           | `fetchPerson`                | ✅                                         |
|                                          | `PATCH /api/v1/persons/{id}/favorite`                | `togglePersonFavorite`       | ✅                                         |
|                                          | `GET /api/v1/persons/{id}/timeline`                  | `fetchPersonTimeline`        | ✅ (최근 3건 미리보기)                     |
| **프로필 수정** `/people/$id/edit`       | `PUT /api/v1/persons/{id}`                           | `updatePerson`               | ✅                                         |
|                                          | `DELETE /api/v1/persons/{id}`                        | `deletePerson`               | ✅                                         |
| **인물 타임라인** `/people/$id/timeline` | `GET /api/v1/persons/{id}/timeline?categoryChipIds=` | `fetchPersonTimeline`        | ✅                                         |
|                                          | `GET /api/v1/persons/{id}/activity-flow`             | `fetchActivityFlow`          | ✅                                         |
|                                          | `GET /api/v1/chips?type=CATEGORY`                    | `fetchChips`                 | ✅                                         |
| **기록 작성** `/record`                  | `POST /api/v1/events`                                | `createEvent`                | ✅                                         |
|                                          | `GET·PUT /api/v1/events/{id}`                        | `fetchEvent` · `updateEvent` | ✅ (`?eventId=` 수정 모드)                 |
|                                          | `GET /api/v1/persons`                                | `fetchPersons`               | ✅                                         |
|                                          | `GET /api/v1/chips` (CATEGORY·EMOTION·WEATHER)       | `fetchChips`                 | ✅                                         |
|                                          | `POST /api/v1/images/upload-permission`              | Vercel Blob 함수             | ✅ (업로드 전 JWT 확인)                    |
| **전체 타임라인** `/timeline`            | `GET /api/v1/timeline?categoryChipIds=&personIds=`   | `fetchMyTimeline`            | ✅                                         |
|                                          | 카드 탭 → `/record?eventId=`                         | —                            | ✅                                         |
| **설정** `/settings`                     | `GET /api/v1/chips`                                  | `fetchChips`                 | ✅                                         |
|                                          | `POST /api/v1/chips`                                 | `createChip`                 | ✅ (CATEGORY·RELATION_TAG·EMOTION·WEATHER) |
|                                          | `PATCH /api/v1/chips/{id}`                           | `renameChip`                 | ✅ (개인 칩만)                             |
|                                          | `DELETE /api/v1/chips/{id}`                          | `deleteChip`                 | ✅ (개인 칩만)                             |
|                                          | `GET·POST /api/v1/zones`                             | `getZones` · `createZone`    | ✅ (존 관리)                               |
|                                          | `PATCH·DELETE /api/v1/zones/{id}`                    | `updateZone` · `deleteZone`  | ✅                                         |
|                                          | `PUT /api/v1/zones/{id}/persons`                     | `replaceZonePersons`         | ✅ (인물 전체 교체)                        |
| **인물관계도** `/relation-graph`         | `GET /api/v1/relation-graph`                         | `getRelationGraph`           | ✅ (영역 + 노드 좌표 + 인물↔인물 연결)     |
|                                          | `PUT /api/v1/relation-graph`                         | `replaceRelationGraph`       | ✅ (전체 교체, 저장 버튼으로만)            |

PRD ↔ 화면 대응은 [../docs/prd](../docs/prd/) 참조. 세부 스키마·에러 코드는 Swagger가 SSOT다.

## 스택

| 구분             | 버전                                      |
| ---------------- | ----------------------------------------- |
| Kotlin           | 2.1.10                                    |
| Spring Boot      | 3.5.0                                     |
| Java (toolchain) | 21                                        |
| Build            | Gradle 9.4 (Kotlin DSL + Version Catalog) |
| DB               | MySQL 8.4(도커) / H2 파일(비도커 bootRun) |
| Lint             | ktlint                                    |

의존성/플러그인 버전은 `[gradle/libs.versions.toml](gradle/libs.versions.toml)` 한 곳에서 관리한다.

## 프로젝트 구조

```
src/main/kotlin/com/mongle
├── Application.kt        # 진입점
├── config/               # JPA 감사, WebMvc(리졸버·정적 이미지), OpenAPI
├── controller/           # REST + dto/ (Auth·Chip·Event·Home·Person·Timeline)
├── service/              # 비즈니스 로직 (Validator·Seeder·Calculator 포함)
├── repository/           # Spring Data JPA
├── domain/               # 엔티티 — id-only 참조, 다대다는 조인 엔티티
└── common/               # 예외·검증 한도·JWT 컨텍스트(@AuthUser)·이미지 저장
```

## 자주 쓰는 명령

```bash
./gradlew bootRun        # 비도커 실행 (H2)
./gradlew ktlintFormat   # 린트 자동 수정 (커밋 전 필수)
./gradlew compileKotlin  # 컴파일 확인
```

도커 실행·중지·리셋은 [runbook/local.md](docs/runbook/local.md) 참조. 모노레포이므로 gradle 명령은 `backend/` 안에서 실행한다.
