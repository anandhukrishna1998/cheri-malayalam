import courseData from '../content/course.json'
import { autoHint, slug } from './hint'

export interface CourseItem {
  id: string
  manglish: string
  fr: string
  ml: string
  hint: string
  note?: string
  date?: string
  category?: string
}

export interface CourseVerb {
  inf: string
  pres: string
  past: string
  fut: string
  question: string
  imperative: string
  fr: string
}

export interface CourseSession {
  id: string
  date: string
  title: string
  emoji: string
  intro?: string
  items: CourseItem[]
}

export interface ComparisonItem {
  manglish: string
  fr: string
  ml: string
  explanation?: string
}

export interface ComparisonPair {
  aanu: ComparisonItem
  undu: ComparisonItem
}

export interface UndVsAanuGrammar {
  title: string
  ruleAanu: string
  ruleUndu: string
  pairs: ComparisonPair[]
}

export interface QuestionOGrammar {
  title: string
  rule: string
  examples: { manglish: string; fr: string; ml: string }[]
}

export interface CourseGrammar {
  undVsAanu: UndVsAanuGrammar
  questionO?: QuestionOGrammar
}

export interface CourseCustomItem {
  id?: string
  manglish: string
  fr: string
  ml?: string
  date?: string
  note?: string
}

export interface CourseData {
  sessions: CourseSession[]
  verbs: CourseVerb[]
  grammar: CourseGrammar
}

export function loadCourseData(): CourseData {
  return courseData as unknown as CourseData
}

export function getCourseSessions(): CourseSession[] {
  return loadCourseData().sessions
}

export function getAllCourseItems(): CourseItem[] {
  return getCourseSessions().flatMap(s => s.items)
}

export function getCombinedCourseItems(custom: CourseCustomItem[] = []): CourseItem[] {
  const preloaded = getAllCourseItems()
  const customItems: CourseItem[] = (custom || []).map(c => ({
    id: c.id || `custom-${slug(c.manglish)}`,
    manglish: c.manglish,
    fr: c.fr,
    ml: c.ml || '',
    hint: autoHint(c.manglish),
    note: c.note,
    date: c.date,
    category: 'Mes ajouts'
  }))
  return [...preloaded, ...customItems]
}
