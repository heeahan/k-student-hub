# Official source ingestion runbook

Only ingest material from an authoritative issuer such as Korea Immigration Service, Hi Korea, the Ministry of Justice, or an explicitly approved university international office.

For each version:

1. Record issuer, canonical URL, document type, publication/effective dates, applicable visa codes, language, and license or reuse basis.
2. Capture the checksum and internal object path in `source_versions`.
3. Convert tables and headings without changing legal meaning; preserve section labels in the chunk text.
4. Upload the reviewed file to the configured OpenAI Vector Store.
5. Store the returned file ID in `official_sources.openai_file_id`.
6. Test representative questions, no-answer questions, conflicting-version questions, and expired-rule questions.
7. Set `active=true` only after a human source editor approves the citations.

When a policy changes, add a new version and deactivate or end-date the superseded source. Never silently overwrite a version already cited in chat history. A scheduled freshness job should flag old `checked_at` values for review; it must not automatically declare an unchanged webpage current.
