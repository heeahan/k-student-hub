import { isDemoMode } from '@/lib/config';
import { getSupabase } from '@/lib/supabase';
import type { ChatAnswer, OfficialChatTurn } from '@/types/domain';

const studyInKoreaStayUrl = 'https://www.studyinkorea.go.kr/cmm/life/residenceAndStayInfo.do?tab=job-seeker-visa';
const studyInKoreaVisaUrl = 'https://www.studyinkorea.go.kr/mobe/plan/visaAndStay.do';
const hiKoreaUrl = 'https://www.hikorea.go.kr/Main.pt';

export async function askOfficialQuestion(
  question: string,
  visaType: string,
  language: string,
  history: OfficialChatTurn[] = [],
): Promise<ChatAnswer> {
  if (isDemoMode) {
    await new Promise((resolve) => setTimeout(resolve, 650));
    return getDemoAnswer(question, visaType);
  }

  const safeHistory = history
    .slice(-6)
    .map((turn) => ({ role: turn.role, text: turn.text.slice(0, 800) }));
  const { data, error } = await getSupabase()!.functions.invoke<ChatAnswer>('official-answer', {
    body: { question, visaType, language, history: safeHistory },
  });
  if (error) throw error;
  if (!data) throw new Error('답변을 받지 못했습니다.');
  return data;
}

function getDemoAnswer(question: string, visaType: string): ChatAnswer {
  const normalized = question.replaceAll(' ', '').toLowerCase();
  const common = {
    status: 'answered' as const,
    notice: '데모 모드의 예시 안내입니다. 실제 신청 전 원문과 1345에서 개인 조건을 다시 확인하세요.',
    model: 'demo-sample',
  };

  if (/아르바이트|시간제|취업|알바|근무/.test(normalized)) {
    return {
      ...common,
      answer: `${visaType} 유학생은 시간제취업을 시작하기 전에 학교 확인과 출입국의 허가 절차를 확인해야 합니다. Study in Korea의 공식 안내는 근로계약 체결, 학교 담당자의 확인서 서명, 신청·심사 순서를 제시합니다. 자격과 허용 범위는 체류자격, 과정, 한국어 능력 등에 따라 달라질 수 있으므로 허가가 확인되기 전에는 근무를 시작하지 마세요.`,
      checklist: ['학교 국제처에서 본인의 신청 가능 여부 확인', '근로계약서와 사업자등록증 사본 등 공식 안내의 제출서류 준비', '허가 결과 확인 후 근무 시작'],
      citations: [{
        issuer: '국립국제교육원 Study in Korea',
        title: '외국인 유학생 체류·시간제취업 안내',
        url: studyInKoreaStayUrl,
        updatedAt: '공식 웹페이지 · 2026-09-01 확인',
        documentType: '정부 웹페이지',
      }],
      followUpQuestions: ['시간제취업 신청 서류를 알려줘', '학교 확인은 어디에서 받아?', 'D-4도 바로 신청할 수 있어?'],
    };
  }

  if (/d-2|d2|d-4|d4|비자|사증|유학자격/.test(normalized)) {
    return {
      ...common,
      answer: '대한민국 정부의 Study in Korea 안내에서 D-2는 정규 학위과정 유학, D-4는 비학위 연수에 사용하는 체류자격으로 구분합니다. 필요한 사증과 서류는 과정과 재외공관의 심사 기준에 따라 달라질 수 있으므로 입학할 학교와 관할 대한민국 재외공관의 최신 안내를 함께 확인하세요.',
      checklist: ['입학 과정이 학위과정인지 연수과정인지 확인', '학교에서 표준입학허가서 등 입학서류 수령', '관할 대한민국 재외공관의 최신 제출서류 확인'],
      citations: [{
        issuer: '국립국제교육원 Study in Korea',
        title: 'Visa and Stay',
        url: studyInKoreaVisaUrl,
        updatedAt: '공식 웹페이지 · 2026-09-01 확인',
        documentType: '정부 웹페이지',
      }],
      followUpQuestions: ['D-2와 D-4 차이를 더 알려줘', '입국 후 외국인등록은 언제 해?', '체류기간 연장은 어떻게 신청해?'],
    };
  }

  if (/외국인등록|거소|체류지|주소|이사|등록증/.test(normalized)) {
    return {
      ...common,
      answer: '90일을 초과해 대한민국에 체류하려는 외국인은 입국일부터 90일 이내 외국인등록을 해야 한다는 정부 안내가 있습니다. 이사나 체류정보 변경은 사유와 신고기한이 항목별로 다를 수 있으므로 HiKorea 전자민원 또는 관할 기관에서 본인의 신고 항목과 필요서류를 확인하세요.',
      checklist: ['여권·체류카드 등 본인 확인서류 준비', 'HiKorea에서 해당 신고의 대상·기한·서류 확인', '온라인 또는 관할 출입국·행정복지센터의 접수 가능 여부 확인'],
      citations: [
        {
          issuer: '국립국제교육원 Study in Korea',
          title: '외국인등록 및 체류 안내',
          url: studyInKoreaStayUrl,
          updatedAt: '공식 웹페이지 · 2026-09-01 확인',
          documentType: '정부 웹페이지',
        },
        {
          issuer: '법무부 HiKorea',
          title: '외국인을 위한 전자정부',
          url: hiKoreaUrl,
          updatedAt: '공식 민원 포털',
          documentType: '정부 민원 포털',
        },
      ],
      followUpQuestions: ['외국인등록에 필요한 서류는?', '주소 변경 신고 방법을 알려줘', 'HiKorea 방문예약은 어떻게 해?'],
    };
  }

  if (/연장|만료|체류기간/.test(normalized)) {
    return {
      ...common,
      answer: '체류기간 연장은 현재 체류자격과 학적 상태에 따라 필요한 서류가 달라집니다. 만료일 전에 HiKorea의 체류기간 연장 민원을 확인하고, 학교 국제처에서 재학·등록금·성적 등 본인에게 필요한 학교 서류를 안내받는 것이 안전합니다.',
      checklist: ['체류카드에 표시된 만료일 확인', 'HiKorea 전자민원에서 본인 체류자격의 신청 가능 여부 확인', '학교 국제처에서 학적 관련 제출서류 확인'],
      citations: [{
        issuer: '법무부 HiKorea',
        title: '체류민원 안내 및 전자민원',
        url: hiKoreaUrl,
        updatedAt: '공식 민원 포털',
        documentType: '정부 민원 포털',
      }],
      followUpQuestions: ['온라인으로 연장할 수 있어?', '학교에서 어떤 서류를 받아야 해?', '만료일이 지났으면 어떻게 해야 해?'],
    };
  }

  return {
    status: 'no_official_source',
    answer: '현재 데모에 검수된 공식 근거가 충분하지 않아 답변을 만들지 않았습니다.',
    checklist: [],
    citations: [],
    notice: '질문에 체류자격, 신청 종류, 상황을 조금 더 구체적으로 적거나 외국인종합안내센터 1345에 문의하세요.',
    followUpQuestions: ['D-2 시간제취업 절차를 알려줘', '외국인등록은 언제 해야 해?', '체류기간 연장은 어떻게 신청해?'],
    model: 'demo-sample',
  };
}
