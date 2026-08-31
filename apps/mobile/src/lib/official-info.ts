import { isDemoMode } from '@/lib/config';
import { getSupabase } from '@/lib/supabase';
import type { ChatAnswer } from '@/types/domain';

export async function askOfficialQuestion(question: string, visaType: string, language: string): Promise<ChatAnswer> {
  if (isDemoMode) {
    await new Promise((resolve) => setTimeout(resolve, 650));
    return {
      status: 'answered',
      answer: `${visaType} 체류자격의 시간제취업은 근무를 시작하기 전에 학교 확인과 출입국 허가가 필요한 경우가 있습니다. 허용 시간과 제출서류는 학위과정, 한국어 능력, 학기 여부에 따라 달라질 수 있으므로 아래 공식 페이지에서 현재 기준을 확인하세요.`,
      checklist: ['학교 국제처에 교내 절차 확인', '근로계약서와 사업자등록증 사본 준비', '허가 완료 전 근무를 시작하지 않기'],
      citations: [{ title: '하이코리아 전자민원·체류 안내', url: 'https://www.hikorea.go.kr/Main.pt', updatedAt: '앱 등록 출처 · 실제 운영 전 검수 필요' }],
    };
  }
  const { data, error } = await getSupabase()!.functions.invoke<ChatAnswer>('official-answer', { body: { question, visaType, language } });
  if (error) throw error;
  if (!data) throw new Error('답변을 받지 못했습니다.');
  return data;
}
