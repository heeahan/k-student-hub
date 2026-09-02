import type { CommunityComment, CommunityPost, TimelineTask, University } from '@/types/domain';

export const UNIVERSITIES: University[] = [
  { id: '11111111-1111-4111-8111-111111111111', nameKo: '서울대학교', nameEn: 'Seoul National University' },
  { id: '22222222-2222-4222-8222-222222222222', nameKo: '연세대학교', nameEn: 'Yonsei University' },
  { id: '33333333-3333-4333-8333-333333333333', nameKo: '고려대학교', nameEn: 'Korea University' },
];

export const INITIAL_POSTS: CommunityPost[] = [
  {
    id: 'welcome-1',
    authorId: 'student-mina',
    authorName: 'Mina',
    universityId: '22222222-2222-4222-8222-222222222222',
    universityName: '연세대학교',
    category: 'life',
    title: '외국인등록증 수령 후 가장 먼저 한 일',
    body: '은행 계좌와 휴대폰 본인인증을 먼저 해결했어요. 학교 국제처에서 받은 재학증명서도 챙겨 가세요!',
    language: 'ko',
    likes: 24,
    comments: 3,
    createdAt: '2026-08-31T03:20:00.000Z',
    isAnonymous: false,
    visibility: 'university',
  },
  {
    id: 'welcome-2',
    authorId: 'student-alex',
    authorName: '익명 유학생',
    universityId: null,
    universityName: null,
    category: 'housing',
    title: 'How do you check a housing contract?',
    body: 'Before paying a deposit, ask for the registry document and confirm the landlord name matches the contract.',
    language: 'en',
    likes: 18,
    comments: 2,
    createdAt: '2026-08-30T12:10:00.000Z',
    isAnonymous: true,
    visibility: 'public',
  },
  {
    id: 'welcome-3',
    authorId: 'student-linh',
    authorName: 'Linh',
    universityId: '22222222-2222-4222-8222-222222222222',
    universityName: '연세대학교',
    category: 'campus',
    title: '한국어 발표 연습 같이 할 사람?',
    body: '금요일 오후에 신촌 근처 카페에서 1시간씩 한국어로 이야기해요. 초급도 환영합니다!',
    language: 'ko',
    likes: 11,
    comments: 2,
    createdAt: '2026-08-29T08:45:00.000Z',
    isAnonymous: false,
    visibility: 'university',
  },
];

export const INITIAL_COMMENTS: Record<string, CommunityComment[]> = {
  'welcome-1': [
    { id: 'comment-1', postId: 'welcome-1', authorId: 'student-linh', authorName: 'Linh', body: '휴대폰 개통할 때 여권도 같이 요청받았어요. 지점마다 준비서류를 먼저 확인하면 좋아요!', language: 'ko', createdAt: '2026-08-31T04:05:00.000Z', isAnonymous: false },
    { id: 'comment-2', postId: 'welcome-1', authorId: 'student-alex', authorName: '익명 유학생', body: '은행 방문예약을 하고 가니까 대기 시간이 훨씬 짧았습니다.', language: 'ko', createdAt: '2026-08-31T05:18:00.000Z', isAnonymous: true },
    { id: 'comment-3', postId: 'welcome-1', authorId: 'student-yuki', authorName: 'Yuki', body: '좋은 정보 고마워요! 학교 국제처 체크리스트도 같이 확인해 볼게요.', language: 'ko', createdAt: '2026-08-31T07:32:00.000Z', isAnonymous: false },
  ],
  'welcome-2': [
    { id: 'comment-4', postId: 'welcome-2', authorId: 'student-mina', authorName: 'Mina', body: 'I also ask the university housing office to review unclear clauses before signing.', language: 'en', createdAt: '2026-08-30T13:02:00.000Z', isAnonymous: false },
    { id: 'comment-5', postId: 'welcome-2', authorId: 'student-linh', authorName: 'Linh', body: 'Take photos of every existing defect before moving in and keep them with the contract.', language: 'en', createdAt: '2026-08-30T15:41:00.000Z', isAnonymous: false },
  ],
  'welcome-3': [
    { id: 'comment-6', postId: 'welcome-3', authorId: 'student-mina', authorName: 'Mina', body: '저 참여하고 싶어요! 발표 주제는 미리 정해서 연습하나요?', language: 'ko', createdAt: '2026-08-29T09:20:00.000Z', isAnonymous: false },
    { id: 'comment-7', postId: 'welcome-3', authorId: 'student-alex', authorName: '익명 유학생', body: '초급도 가능하다니 좋아요. 시간 정해지면 알려주세요.', language: 'ko', createdAt: '2026-08-29T10:11:00.000Z', isAnonymous: true },
  ],
};

export const INITIAL_TASKS: TimelineTask[] = [
  {
    id: 'task-1',
    title: '체류기간 확인하기',
    description: '하이코리아 또는 외국인등록증에서 만료일을 확인하세요.',
    dueLabel: 'D-21',
    tone: 'urgent',
    completed: false,
    source: 'suggested',
    dueOn: null,
    snoozedUntil: null,
  },
  {
    id: 'task-2',
    title: '재학증명서 준비',
    description: '학교 포털에서 최신 영문 또는 국문 증명서를 발급하세요.',
    dueLabel: '이번 주',
    tone: 'soon',
    completed: false,
    source: 'suggested',
    dueOn: null,
    snoozedUntil: null,
  },
  {
    id: 'task-3',
    title: '학기 중 주소 확인',
    description: '이사했다면 HiKorea에서 체류지 변경 신고 대상과 기한을 확인하세요.',
    dueLabel: '확인 필요',
    tone: 'normal',
    completed: false,
    source: 'suggested',
    dueOn: null,
    snoozedUntil: null,
  },
];
