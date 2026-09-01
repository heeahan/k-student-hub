# MVP implementation status

## Implemented and verified

- Expo React Native app for iOS, Android, and web preview
- Passwordless email boundary, secure native session storage, and working demo sign-in
- D-2/D-4 onboarding with university and preferred language
- Personalized Today checklist
- Searchable school/all/saved/my-post community feed with categories, latest/popular sorting, likes, bookmarks, and seeded content
- Post and anonymous-comment creation with audience, length limits, client-side sensitive-data detection, and demo-device persistence
- Post detail with comment list, post/comment deletion and reporting, author blocking, and production reaction/bookmark persistence
- Official-info messenger UI with right/left bubbles, conversation context, source cards, checklist, no-source state, and 1345 escalation
- Government-source registry plus human-approval, checksum, OpenAI upload, vector indexing, and Supabase metadata pipeline
- Supabase migration, seed, RLS, account deletion, moderation, and RAG Edge Functions
- Privacy, community guideline, architecture, source ingestion, setup, and release documents
- TypeScript check, ESLint check, Expo web export, and mobile-viewport interaction QA

## Requires service credentials or owner decisions

- Create the Supabase project and apply migration/seed
- Configure email templates, deep-link allowlist, and production redirect domains
- Create an OpenAI Vector Store and ingest human-reviewed, reusable official documents
- Replace example bundle/package IDs, icon artwork, support email, privacy URL, and store metadata
- Enroll in Apple Developer and Google Play Console and run EAS device builds

## Next product increment

1. Realtime comment subscriptions, pagination, and push notification delivery
2. University email verification and a larger university directory
3. Internal admin web console for report review and official-source freshness
4. Scheduled task materialization from visa expiry/arrival/graduation anchors
5. Automated RLS integration tests against a local Supabase instance
6. Accessibility, localization copy review, analytics/consent, crash reporting, and staged beta testing

The current artifact is a working first vertical slice and a production-oriented foundation, not a claim that unreviewed legal or immigration material is ready for public use.
