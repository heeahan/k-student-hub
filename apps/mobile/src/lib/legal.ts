import type { LegalDocumentKey } from '@/types/domain';

type LegalSection = {
  title: string;
  paragraphs: string[];
};

export type LegalDocument = {
  key: LegalDocumentKey;
  title: string;
  shortTitle: string;
  version: string;
  effectiveDate: string;
  summary: string;
  sections: LegalSection[];
};

export const LEGAL_DOCUMENTS: Record<LegalDocumentKey, LegalDocument> = {
  terms: {
    key: 'terms',
    title: 'K-Student Hub 이용약관',
    shortTitle: '이용약관',
    version: '2026.09.02',
    effectiveDate: '2026-09-02',
    summary: '서비스의 역할, 이용자 책임, 금지행위, 콘텐츠 운영과 계정 종료 기준을 안내합니다.',
    sections: [
      { title: '1. 서비스의 역할', paragraphs: ['K-Student Hub는 외국인 유학생의 생활 정보 교류와 공식 출처 탐색을 돕는 서비스입니다.', '공식정보 AI의 답변은 일반적인 정보 안내이며 법률 상담이나 행정기관의 최종 판단을 대신하지 않습니다.'] },
      { title: '2. 이용자 책임', paragraphs: ['이용자는 본인의 상황과 공식 원문을 확인한 뒤 중요한 신청과 결정을 진행해야 합니다.', '게시글과 댓글에 타인의 개인정보, 불법 거래, 사기, 혐오·괴롭힘 또는 권리를 침해하는 내용을 올려서는 안 됩니다.'] },
      { title: '3. 콘텐츠와 안전조치', paragraphs: ['이용자는 자신이 작성한 콘텐츠에 대한 책임을 지며, 서비스는 안전한 운영을 위해 신고된 콘텐츠를 검토하고 숨김·제한·삭제 등의 조치를 할 수 있습니다.', '중대한 위험이나 반복 위반이 확인되면 계정 이용이 제한될 수 있습니다.'] },
      { title: '4. 계정 종료와 변경', paragraphs: ['이용자는 앱에서 계정 삭제를 요청할 수 있습니다. 법령상 보존 의무가 있는 자료를 제외한 계정 데이터는 운영정책에 따라 삭제 또는 익명화됩니다.', '중요한 약관 변경 시 앱 내 공지와 재동의 절차를 제공합니다.'] },
    ],
  },
  privacy: {
    key: 'privacy',
    title: 'K-Student Hub 개인정보 처리방침',
    shortTitle: '개인정보 처리방침',
    version: '2026.09.02',
    effectiveDate: '2026-09-02',
    summary: '수집하는 정보, 이용 목적, 보관, 이용자 권리와 안전조치를 안내합니다.',
    sections: [
      { title: '1. 처리하는 정보', paragraphs: ['계정 이메일, 닉네임, 학교, 선호 언어, 체류자격, 작성한 글·댓글, 신고·차단 기록, 개인 일정과 알림 설정을 처리할 수 있습니다.', '여권번호와 외국인등록번호는 가입에 요구하지 않으며, 게시글·문의·AI 질문에도 입력하지 않도록 안내하고 탐지 가능한 패턴은 차단합니다.'] },
      { title: '2. 이용 목적', paragraphs: ['로그인과 소속 설정, 맞춤 일정, 커뮤니티 운영, 공식정보 답변, 신고 처리, 고객지원과 서비스 보안을 위해 필요한 범위에서 사용합니다.'] },
      { title: '3. 보관과 삭제', paragraphs: ['계정 정보와 이용 기록은 서비스 제공에 필요한 기간 동안 보관하고 계정 삭제 요청 시 관련 법령과 운영정책에 따라 삭제 또는 익명화합니다.', '최종 보유기간, 처리위탁, 국외이전, 운영주체와 개인정보 보호책임자 정보는 실제 인프라와 법률 검토 후 출시 문서에 확정해야 합니다.'] },
      { title: '4. 이용자 권리와 보호', paragraphs: ['이용자는 프로필 수정, 콘텐츠 삭제, 차단, 데모 데이터 초기화와 계정 삭제를 요청할 수 있습니다.', '서버 비밀키는 모바일 앱에 저장하지 않고, 운영 데이터는 사용자별 접근정책과 최소 권한 원칙으로 보호합니다.'] },
    ],
  },
  community: {
    key: 'community',
    title: 'K-Student Hub 커뮤니티 운영정책',
    shortTitle: '커뮤니티 운영정책',
    version: '2026.09.02',
    effectiveDate: '2026-09-02',
    summary: '커뮤니티에서 허용되지 않는 행동과 신고·차단·운영조치 기준을 안내합니다.',
    sections: [
      { title: '1. 서로를 존중해 주세요', paragraphs: ['국적, 인종, 언어, 성별, 종교, 장애, 체류자격 등을 이유로 한 혐오·괴롭힘·협박을 허용하지 않습니다.', '타인의 연락처, 신분증, 주소, 계좌정보 등 개인정보를 동의 없이 공개해서는 안 됩니다.'] },
      { title: '2. 안전한 정보 교류', paragraphs: ['사기, 불법 고용, 불법 거래, 성적 착취, 스팸과 위험한 만남 유도는 금지됩니다.', '비자와 행정 관련 개인 경험은 공식 규정과 다를 수 있으므로 경험과 공식정보를 구분해 표현해야 합니다.'] },
      { title: '3. 신고와 운영조치', paragraphs: ['이용자는 게시글·댓글을 신고하고 작성자를 차단할 수 있습니다.', '운영자는 신고를 검토해 콘텐츠 숨김, 경고, 이용 제한, 계정 정지 등의 조치를 하고 처리 기록을 남깁니다.'] },
    ],
  },
};

export const REQUIRED_LEGAL_KEYS: LegalDocumentKey[] = ['terms', 'privacy', 'community'];
