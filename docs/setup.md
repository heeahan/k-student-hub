# 개발 및 외부 서비스 설정

## 1. Supabase

1. 새 Supabase 프로젝트를 생성합니다.
2. `supabase/migrations/202608310001_initial_schema.sql`을 적용합니다.
3. `supabase/migrations/202609010001_official_info_upgrade.sql`을 적용합니다.
4. `supabase/seed.sql`을 적용합니다.
5. 프로젝트 URL과 publishable key를 `apps/mobile/.env`에 입력합니다.
6. `EXPO_PUBLIC_USE_DEMO_DATA=false`로 변경합니다.
7. Auth URL 설정에 앱 scheme `kstudenthub://`를 등록합니다.

모바일 앱에 service role key를 넣지 마세요. 모든 exposed table에는 RLS가 켜져 있어야 합니다.

## 2. OpenAI

서버 함수 비밀값으로만 다음 값을 설정합니다.

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_VECTOR_STORE_ID`
- `RAG_MIN_SCORE` (선택, 기본값 `0.45`)

`pnpm.cmd sources:check`로 출처 레지스트리를 확인한 뒤, 현행성과 이용허락을 사람이 승인한 문서만 `pnpm.cmd sources:ingest`로 Vector Store에 올립니다. 자세한 절차는 `docs/source-ingestion.md`에 있습니다.

## 3. Edge Functions

```bash
supabase functions deploy official-answer
supabase functions deploy moderate-content
supabase functions deploy delete-account
```

## 4. Expo/EAS

`apps/mobile/app.json`의 다음 값을 실제 소유한 식별자로 교체합니다.

- `expo.ios.bundleIdentifier`
- `expo.android.package`
- `expo.owner`
- `expo.extra.eas.projectId`

개발 빌드에서는 원격 푸시를 테스트할 수 있지만 Android Expo Go에서는 원격 푸시가 지원되지 않으므로 EAS development build를 사용합니다.
