# 배포

> **대상: Render(앱) + Supabase(Postgres) + Vercel Blob(이미지).**
> 로컬 개발(H2 파일)은 이 문서와 무관 — [local.md](./local.md) 참조.
> 배포는 `prod` 스프링 프로필로만 분기한다(`SPRING_PROFILES_ACTIVE=prod`).

## 왜 이 구조

- 진짜 VM(Oracle/Fly/GCP)은 전부 카드 등록 필요 → 카드-프리는 PaaS + 외부 관리형 스토리지가 유일.
- Render는 DB API만 제공한다. DB는 Supabase Postgres에 두고, 이미지는 브라우저에서 Vercel Blob으로 직접 업로드한다.
- 백엔드는 업로드 파일을 받지 않고 JWT 권한 확인과 Blob URL 저장만 담당한다.
- DB는 `application-prod.yml`의 데이터소스 env를 사용한다. 네이티브 쿼리·마이그레이션이 없어 `ddl-auto: update`로 스키마 자동 생성.

## 1. Supabase 준비 (한 번)

1. https://supabase.com → 프로젝트 생성(리전은 한국 대상이면 Seoul `ap-northeast-2`).
2. **DB 접속정보**: 대시보드 상단 **Connect** 버튼 → **Session pooler** 섹션.
    - ⚠️ **반드시 Session Pooler 주소**(`aws-X-<region>.pooler.supabase.com:5432`, user `postgres.<ref>`)를 쓴다.
      Direct 주소(`db.<ref>.supabase.co`)는 무료 티어에서 **IPv6 전용**이라 Render(IPv4만)에서 접속 불가.
    - JDBC URL 예: `jdbc:postgresql://aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres`

## 2. Render 배포 (Blueprint)

레포 루트 `render.yaml` 이 서비스를 선언한다.

1. https://render.com → New → **Blueprint** → 이 레포 연결.
2. 배포 시 아래 env 를 입력한다(`render.yaml` 에 `sync:false` 로 표시된 값):

    | 키                           | 값                                                                         |
    | ---------------------------- | -------------------------------------------------------------------------- |
    | `SPRING_DATASOURCE_URL`      | `jdbc:postgresql://<pooler-host>:5432/postgres` (Session Pooler — §1 참조) |
    | `SPRING_DATASOURCE_USERNAME` | `postgres.<project-ref>` (풀러는 유저명에 ref가 붙는다)                    |
    | `SPRING_DATASOURCE_PASSWORD` | Supabase DB 비밀번호                                                       |
    - `SPRING_PROFILES_ACTIVE=prod`, `MONGLE_JWT_SECRET` 자동 생성은 `render.yaml`에 이미 있음.

3. Apply → Docker 빌드(멀티스테이지, rootDir=backend) → 기동.

Health check: `GET /actuator/health` → `{"status":"UP"}`.

## 2-1. 릴리스 전 스키마 손보기 (칩 종류 추가 시 필수)

`ddl-auto: update` 는 **기존 컬럼의 enum 목록·CHECK 제약을 갱신하지 못한다.** 그래서 `ChipType` 에 값을
추가한 릴리스는 배포 전에 `chip.type` 컬럼을 한 번 넓혀야 하고, 안 하면 기동 시
`Data truncated for column 'type'`(MySQL) / `violates check constraint`(Postgres) 로 앱이 죽는다.

`AFFILIATION`(소속) 추가 릴리스에서 실제로 겪었고, 앞으로 종류를 더할 때도 같다.

```sql
-- Supabase(Postgres): Hibernate 가 만든 enum CHECK 제약을 떼어낸다(이름은 보통 chip_type_check).
ALTER TABLE chip DROP CONSTRAINT IF EXISTS chip_type_check;

-- 로컬 도커(MySQL 8.4): 네이티브 ENUM 컬럼을 문자열로 바꾼다.
ALTER TABLE chip MODIFY type VARCHAR(32) NOT NULL;
```

엔티티에는 `@Column(columnDefinition = "varchar(32)")` 를 박아 **새로 만드는 스키마**는 이 문제가
재발하지 않는다. 위 SQL 은 이미 만들어진 DB 를 따라오게 하는 1회성 작업이다.

## 3. 배포 검증

> 사용자 id와 `owner_id`가 bigint에서 UUID로 바뀌는 릴리스다. 기존 DB에는 자동 적용되지 않으므로 배포 전에 DB를 초기화하거나 명시적 타입 변환 마이그레이션을 수행한다.

```bash
BASE=https://mongle-backend.onrender.com   # 현재 배포 주소
curl -s $BASE/actuator/health                    # {"status":"UP"}
TOKEN=$(curl -s -X POST $BASE/api/v1/auth/token \
  -H 'Content-Type: application/json' \
  -d '{"userId":"8e0ca8f5-a713-4a90-9df1-15f0be0d843c","username":"smoke"}' \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
curl -s -X POST $BASE/api/v1/images/upload-permission \
  -H "Authorization: Bearer $TOKEN"
# → 200. 실제 파일 업로드는 Vercel의 /api/blob-upload 함수가 이 권한 확인 후 Blob에 직접 수행.
```

프론트엔드는 이 주소를 API 베이스로 물린다: `VITE_API_URL=https://mongle-backend.onrender.com/api`. Vercel 프로젝트에는 Public Blob Store를 연결해 `BLOB_READ_WRITE_TOKEN`을 생성한다.

## 반드시 지킬 것

- `prod` 프로필은 `MONGLE_JWT_SECRET`·DB 접속 env를 필수로 요구한다.
- `BLOB_READ_WRITE_TOKEN`은 Vercel 함수 환경에만 두고 클라이언트 번들에 노출하지 않는다.
- Blob Store는 Public으로 연결한다. 쓰기는 인증 후 발급되는 제한된 클라이언트 토큰만 사용한다.

## 참고: Render 무료 티어 한계

- 15분 무요청 시 슬립 → 다음 요청에 콜드스타트 ~50초. 데모용으로 수용.
- DB와 이미지는 각각 Supabase Postgres와 Vercel Blob에 있어 앱 재시작·재배포에도 보존됨.

## 롤백

- Render 대시보드 → 서비스 → Deploys → 이전 배포로 **Rollback**.
- 스키마는 `ddl-auto: update`(가산적)라 낮은 버전 코드로 돌아가도 대체로 안전. 컬럼 의미가 바뀐 릴리스는 Supabase DB 백업 후 진행.

## 대안: 단일 VM(도커 컴포즈)

카드 등록이 가능하면 Oracle Cloud Always Free 등 VM 에서 `docker-compose.yml`(MySQL+backend)을 그대로 띄우는 게
코드 변경 없이 MySQL과 backend를 실행할 수 있다. 이미지 업로드는 동일하게 Vercel Blob을 사용한다.

```bash
MONGLE_JWT_SECRET='<32바이트+ 랜덤>' MYSQL_PASSWORD='<랜덤>' MYSQL_ROOT_PASSWORD='<랜덤>' \
  docker compose up -d   # DB를 ./data/mysql 영속 경로에 마운트
```
