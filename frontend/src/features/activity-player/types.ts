export type ActivityMediaKind = "image" | "audio" | "video" | "pdf" | "animation" | "unknown"

export type ActivityMedia = {
  id: string
  mediaKey: string
  mediaRole: string
  mimeType: string | null
  label: string | null
  altText: string | null
  sequence: number
  isPrimary: boolean
  url: string | null
}

export type ActivityQuestion = {
  id: string
  sequence: number
  sectionKey: string | null
  isRequired: boolean
  marks: number | null
  configuration: unknown
  questionBankItem: {
    id: string
    type: string
    title: string | null
    content: string
    answerType: string
    correctAnswer: unknown
    metadata: unknown
    instructions: string | null
    explanation: string | null
    difficulty: string
    status: string
    programmeId: string
    answerOptions: ActivityAnswerOption[]
    mediaLinks: QuestionBankMedia[]
  }
}

export type QuestionBankMedia = {
  id: string
  key: string
  mediaKey: string
  url: string
  mimeType: string | null
  role: string
  mediaRole: string
  label: string | null
  originalName: string | null
  altText: string | null
  sequence: number
}

export type ActivityAnswerOption = {
  id: string
  label: string | null
  content: string
  sequence: number
  isCorrect: boolean
  feedback: string | null
  media: QuestionBankMedia[]
}

export type ActivityPreview = {
  id: string
  code: string
  title: string
  instructions: string
  difficulty: string
  scoringMode: string
  reviewMode: string
  totalMarks?: number | null
  attemptsAllowed: number | null
  timeLimitSeconds: number | null
  shuffleItems: boolean
  showImmediateFeedback: boolean
  allowRetry: boolean
  template: {
    code: string
    version: number
    rendererKey: string
  }
  configuration: unknown
  rewardConfiguration: unknown
  presentationSettings: unknown
  items: ActivityQuestion[]
  media: ActivityMedia[]
}

export type ActivityAnswerMap = Record<string, unknown>
export type ActivityTemporaryState = Record<string, unknown>

export type ActivityProgress = {
  current: number
  total: number
  completed: number
  percentage: number
  isComplete: boolean
}

export type ActivityTimerMode = "countup" | "countdown" | "disabled"

export type ActivityCompletionSummary = {
  totalQuestions: number
  completedQuestions: number
  correctQuestions: number
  incorrectQuestions: number
  totalAttempts: number
}
