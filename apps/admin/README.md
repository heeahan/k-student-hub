# Admin console boundary

The MVP database already supports `admin_roles`, report queues, moderation actions, official source metadata, source versions, and audit timestamps. Build the internal console only behind authenticated admin roles; never expose the Supabase service-role key to a browser.

First screens:

1. Open/reviewing reports, with post context and hide/dismiss actions.
2. Official source registry, including issuer, canonical URL, effective date, last checked date, license review, OpenAI file ID, and active status.
3. Source freshness queue, sorted by the oldest `checked_at` value.

Until this console is implemented, use the Supabase dashboard with the same role and audit rules. This folder is intentionally not presented as a completed admin product.
