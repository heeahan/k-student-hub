insert into public.universities (id, name_ko, name_en, region)
values
  ('11111111-1111-4111-8111-111111111111', '서울대학교', 'Seoul National University', 'Seoul'),
  ('22222222-2222-4222-8222-222222222222', '연세대학교', 'Yonsei University', 'Seoul'),
  ('33333333-3333-4333-8333-333333333333', '고려대학교', 'Korea University', 'Seoul')
on conflict (id) do nothing;

insert into public.university_email_domains (university_id, domain)
values
  ('11111111-1111-4111-8111-111111111111', 'snu.ac.kr'),
  ('22222222-2222-4222-8222-222222222222', 'yonsei.ac.kr'),
  ('33333333-3333-4333-8333-333333333333', 'korea.ac.kr')
on conflict (domain) do nothing;

insert into public.official_sources (
  id, issuer, title, url, document_type, visa_codes, language, active, license_type, version
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Korea Immigration Service',
  'Hi Korea official immigration information',
  'https://www.hikorea.go.kr/Main.pt',
  'faq',
  array['D-2', 'D-4'],
  'ko',
  false,
  'Link metadata only; verify each document license before indexing',
  'seed-1'
)
on conflict (id) do nothing;

insert into public.timeline_rules (
  code, title_en, title_ko, description_en, description_ko,
  visa_codes, offset_days, anchor, source_id, reviewed_at
)
values
  (
    'visa-extension-prep',
    'Prepare for your stay extension',
    '체류기간 연장 준비',
    'Review the current official checklist before your visa expires.',
    '체류기간 만료 전에 최신 공식 준비서류를 확인하세요.',
    array['D-2', 'D-4'], -60, 'visa_expiry',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', timezone('utc', now())
  ),
  (
    'part-time-work-check',
    'Check part-time work permission',
    '시간제취업 허가 확인',
    'Confirm permission and school requirements before starting work.',
    '근무를 시작하기 전에 허가와 학교 절차를 확인하세요.',
    array['D-2', 'D-4'], -120, 'visa_expiry',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', timezone('utc', now())
  )
on conflict (code) do nothing;
