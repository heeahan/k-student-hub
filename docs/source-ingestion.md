# 공식 출처 등록·색인 운영 가이드

공식정보 AI는 `config/official-sources.json`에 등록되고 사람이 검수한 자료만 사용합니다. 허용 도메인은 HiKorea, 법무부·출입국외국인정책본부, Study in Korea, 국가법령정보센터로 코드에 제한되어 있습니다.

## 1. 출처 검수

각 문서 버전마다 다음 항목을 확인합니다.

1. 발행기관, 원문 URL, 문서 종류, 언어, 적용 체류자격을 기록합니다.
2. 발행일·시행일·폐기일과 현재 최신본 여부를 확인합니다.
3. 원문을 내려받아 검색·요약하는 데 필요한 재이용 근거를 기록합니다.
4. 표, 별표, 예외 조항, 각주가 텍스트 변환 후에도 의미를 유지하는지 확인합니다.
5. `reviewStatus`를 `approved`, `active`를 `true`로 변경하고 `reuseBasis`를 채웁니다.

등록 파일의 기본값은 의도적으로 `needs_review`와 `active=false`입니다. URL이 정부 도메인이라는 이유만으로 현행성이나 재이용 가능성을 자동 승인하면 안 됩니다.

## 2. 설정 확인

```powershell
pnpm.cmd sources:check
```

이 명령은 네트워크 요청이나 업로드 없이 레지스트리 구조, 허용 도메인, 승인 상태를 확인합니다.

## 3. 서버 전용 환경변수

다음 값은 개발자 PC 또는 안전한 CI 비밀값에만 둡니다. 모바일 앱의 `EXPO_PUBLIC_*` 변수로 만들면 안 됩니다.

```text
OPENAI_API_KEY=
OPENAI_VECTOR_STORE_ID=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

업그레이드 마이그레이션 `supabase/migrations/202609010001_official_info_upgrade.sql`이 적용되어 있어야 합니다.

## 4. 승인 문서 색인

```powershell
pnpm.cmd sources:ingest
```

스크립트는 승인된 활성 문서에 대해 다음 작업을 수행합니다.

1. 허용된 HTTPS 정부 도메인에서 원문을 내려받습니다.
2. PDF 형식과 파일 크기를 검사하고, HTML은 불필요한 스크립트·스타일을 제거해 텍스트로 변환합니다.
3. 정확히 업로드한 내용의 SHA-256 체크섬을 계산합니다.
4. OpenAI Files에 업로드하고 Vector Store 색인 완료까지 확인합니다.
5. `official_sources`에 출처·검수일·버전·파일 ID를 연결합니다.
6. `source_versions`에 체크섬과 색인 위치를 보존합니다.

중간 실패 시 이미 업로드된 OpenAI 파일이 남을 수 있으므로 로그의 file ID를 확인해 정리한 뒤 다시 실행합니다.

## 5. 답변 회귀 테스트

운영 활성화 전 최소한 아래 질문군을 직접 확인합니다.

- D-2/D-4 시간제취업 절차와 제출서류
- 외국인등록, 체류지 변경, 체류기간 연장
- 근거가 없는 학교 내부 규정 질문
- 서로 다른 버전에서 내용이 충돌하는 질문
- 효력이 끝난 문서만 검색되는 질문
- 원문 안에 명령문처럼 보이는 텍스트가 들어간 프롬프트 인젝션 테스트

정책이 바뀌면 기존 버전을 덮어쓰지 말고 새 버전을 추가합니다. 구버전에는 `effective_to`를 기록하거나 `active=false`, `review_status=expired`로 변경합니다. `checked_at`이 오래된 문서는 자동으로 최신이라고 간주하지 말고 운영자 검수 대상으로 보내야 합니다.
