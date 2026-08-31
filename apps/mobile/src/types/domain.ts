export type LanguageCode = 'ko' | 'en' | 'zh' | 'vi' | 'ja';

export type PostCategory = 'campus' | 'visa' | 'housing' | 'work' | 'life' | 'friends';

export type University = {
  id: string;
  nameKo: string;
  nameEn: string;
};

export type UserProfile = {
  id: string;
  nickname: string;
  email: string;
  universityId: string;
  universityName: string;
  visaType: 'D-2' | 'D-4';
  language: LanguageCode;
  onboardingComplete: boolean;
};

export type CommunityPost = {
  id: string;
  authorId: string;
  authorName: string;
  universityId: string | null;
  universityName: string | null;
  category: PostCategory;
  title: string;
  body: string;
  language: LanguageCode;
  likes: number;
  comments: number;
  createdAt: string;
  isAnonymous: boolean;
  isLiked?: boolean;
  isBookmarked?: boolean;
};

export type TimelineTask = {
  id: string;
  title: string;
  description: string;
  dueLabel: string;
  tone: 'urgent' | 'soon' | 'normal';
  completed: boolean;
};

export type ChatCitation = {
  title: string;
  url: string;
  updatedAt: string;
};

export type ChatAnswer = {
  answer: string;
  checklist: string[];
  citations: ChatCitation[];
  status: 'answered' | 'no_official_source';
};
