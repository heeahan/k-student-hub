# Architecture and trust boundaries

## Mobile app

Expo Router provides one React Native codebase for iOS, Android, and a static web preview. The app has four tabs: Today, Community, Official Info, and Profile. `AuthProvider` owns session and onboarding state; `CommunityProvider` owns the first community vertical slice.

Demo mode is deliberately explicit. It keeps data on the device and makes no claim that sample policy text is current. Production mode activates only when Supabase public configuration is present and `EXPO_PUBLIC_USE_DEMO_DATA=false`.

## Backend

Supabase Auth provides passwordless email sign-in. PostgreSQL stores profiles, universities, posts, comments, reactions, reports, blocks, tasks, chat history, source metadata, and moderation audit events. RLS limits personal records to their owner and administrative records to users in `admin_roles`.

The public feed never needs to read private profile rows. A post stores its already-approved public display name, or the literal anonymous label, while its real `author_id` remains available to RLS and moderators.

## Official information RAG

The `official-answer` Edge Function is the only AI answer path:

1. Authenticate the user.
2. Search the configured OpenAI Vector Store.
3. Drop low-scoring results.
4. Require every retained file ID to exist as an active `official_sources` record.
5. Ask the model for a strict JSON answer using only those excerpts.
6. Keep only citations whose file IDs were actually used.
7. Return `no_official_source` when any evidence requirement fails.

The answer is informational and must not predict approval, invent exceptions, or replace advice from 1345 or the competent immigration office.

## Moderation

Client-side pattern checks stop common identity numbers, phone numbers, and account-like strings before submission. In production, `moderate-content` then runs the OpenAI Moderations endpoint before the database insert. Users can report a post and block its author from the detail screen. Database policies also hide blocked authors on reads.

## Secrets

Only Supabase URL and publishable key are public mobile configuration. OpenAI keys and the Supabase service-role key belong in Edge Function secrets. No service-role or OpenAI key may be committed or prefixed with `EXPO_PUBLIC_`.
