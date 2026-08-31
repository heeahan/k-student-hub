# K-Student Hub

외국인 유학생이 공식 체류정보와 같은 학교 학생들의 경험을 함께 확인하는 iOS/Android 앱의 MVP입니다.

현재 구현된 수직 기능:

- 이메일 로그인 데모 또는 Supabase OTP 연결
- D-2/D-4 사용자 온보딩
- 학교/전체 커뮤니티 피드
- 게시글 작성
- 게시글 신고와 사용자 차단
- 개인 일정 타임라인
- 공식 출처가 표시되는 챗봇 데모와 서버 함수 경계
- Supabase 스키마, RLS, seed 데이터

## 빠른 실행

필수 조건은 Node.js와 pnpm입니다.

```bash
cd apps/mobile
cp ../../.env.example .env
pnpm install
pnpm start
```

Supabase가 아직 없다면 `EXPO_PUBLIC_USE_DEMO_DATA=true`로 실행합니다. 이 모드에서도 로그인, 온보딩, 게시, 신고, 차단 흐름을 기기에서 확인할 수 있습니다.

## 검증

```bash
pnpm typecheck
pnpm lint
pnpm export:web
```

백엔드 연결과 배포 절차는 [docs/setup.md](docs/setup.md)와 [docs/release-checklist.md](docs/release-checklist.md)를 참고하세요. 신뢰 경계와 RAG 구조는 [docs/architecture.md](docs/architecture.md), 공식 문서 등록 절차는 [docs/source-ingestion.md](docs/source-ingestion.md), 구현 상태는 [docs/mvp-status.md](docs/mvp-status.md)에 정리했습니다.

## 중요한 제한

- 현재 공식 정책 문서는 seed 메타데이터만 포함합니다. 상용 운영 전에 이용허락을 확인한 원문을 별도로 색인해야 합니다.
- 비자 승인 가능성을 판단하지 않습니다. 공식 근거가 부족하면 1345 또는 관할 출입국기관 확인으로 안내합니다.
- iOS/Android 실제 스토어 제출은 개발자 계정과 앱 식별자 확정 후 진행해야 합니다.
- 댓글 작성·실시간 알림·관리자 웹 콘솔은 DB 경계만 마련했으며 다음 구현 단계입니다.
