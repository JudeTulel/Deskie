import { beforeEach, describe, expect, it } from 'vitest'
import { installMockQvacApi, makeFlashcard, type MockQvacApi } from './helpers'
import { useStudyStore } from '../src/renderer/src/stores/studyStore'

const DAY = 24 * 60 * 60 * 1000
let api: MockQvacApi

beforeEach(() => {
  api = installMockQvacApi()
  useStudyStore.setState({
    subjects: [],
    documents: [],
    flashcards: [],
    quizzes: [],
    activities: [],
    ingestionQueue: [],
    loading: false
  })
})

describe('studyStore — SM-2 spaced repetition', () => {
  it('first successful review sets interval to 1 day, reps to 1, ease to 2.6 and schedules dueDate', async () => {
    const before = Date.now()
    useStudyStore.setState({ flashcards: [makeFlashcard()] })

    await useStudyStore.getState().reviewFlashcard('fc-test', 5)

    const card = useStudyStore.getState().flashcards[0]
    expect(card.reps).toBe(1)
    expect(card.interval).toBe(1)
    expect(card.ease).toBeCloseTo(2.6)
    expect(card.dueDate).toBeGreaterThanOrEqual(before + DAY)
    expect(card.dueDate).toBeLessThanOrEqual(Date.now() + DAY)
    expect(api.saveFlashcard).toHaveBeenCalledTimes(1)
  })

  it('second consecutive successful review sets interval to 6 days', async () => {
    useStudyStore.setState({
      flashcards: [makeFlashcard({ reps: 1, interval: 1, ease: 2.6 })]
    })

    await useStudyStore.getState().reviewFlashcard('fc-test', 5)

    const card = useStudyStore.getState().flashcards[0]
    expect(card.reps).toBe(2)
    expect(card.interval).toBe(6)
    expect(card.ease).toBeCloseTo(2.7)
  })

  it('third and later reviews use Math.ceil(interval * ease)', async () => {
    useStudyStore.setState({
      flashcards: [makeFlashcard({ reps: 2, interval: 6, ease: 2.5 })]
    })

    await useStudyStore.getState().reviewFlashcard('fc-test', 5)

    const card = useStudyStore.getState().flashcards[0]
    expect(card.interval).toBe(Math.ceil(6 * 2.5)) // 15
    expect(card.reps).toBe(3)
    expect(card.ease).toBeCloseTo(2.6)
  })

  it('clamps ease at the 1.3 floor when a low-ease card is failed', async () => {
    useStudyStore.setState({ flashcards: [makeFlashcard({ ease: 1.3 })] })

    await useStudyStore.getState().reviewFlashcard('fc-test', 1)

    // raw value would be 1.3 - 0.54 = 0.76, which must be floored to 1.3
    expect(useStudyStore.getState().flashcards[0].ease).toBe(1.3)
  })

  it('resets reps to 0 and interval to 1 when the rating is below 3', async () => {
    useStudyStore.setState({
      flashcards: [makeFlashcard({ reps: 5, interval: 30, ease: 2.5 })]
    })

    await useStudyStore.getState().reviewFlashcard('fc-test', 2)

    const card = useStudyStore.getState().flashcards[0]
    expect(card.reps).toBe(0)
    expect(card.interval).toBe(1)
    expect(card.ease).toBeCloseTo(2.18)
  })

  it('adjusts ease by rating: +0.1 at 5, no change at 4, -0.14 at 3', async () => {
    const cases = [
      { rating: 5, expectedEase: 2.6 },
      { rating: 4, expectedEase: 2.5 },
      { rating: 3, expectedEase: 2.36 }
    ]

    for (const { rating, expectedEase } of cases) {
      useStudyStore.setState({ flashcards: [makeFlashcard()] })
      await useStudyStore.getState().reviewFlashcard('fc-test', rating)
      expect(useStudyStore.getState().flashcards[0].ease).toBeCloseTo(expectedEase)
    }
  })

  it('is a no-op for an unknown flashcard id', async () => {
    useStudyStore.setState({ flashcards: [makeFlashcard()] })

    await useStudyStore.getState().reviewFlashcard('does-not-exist', 5)

    expect(api.saveFlashcard).not.toHaveBeenCalled()
    expect(api.saveActivity).not.toHaveBeenCalled()
    expect(useStudyStore.getState().flashcards[0].reps).toBe(0)
  })

  it('persists the reviewed card and logs the review as an activity', async () => {
    useStudyStore.setState({ flashcards: [makeFlashcard()] })

    await useStudyStore.getState().reviewFlashcard('fc-test', 4)

    expect(api.saveFlashcard).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'fc-test', interval: 1, reps: 1 })
    )
    expect(api.saveActivity).toHaveBeenCalledWith({
      action: 'Reviewed flashcard: Score 4/5.'
    })
    expect(useStudyStore.getState().activities[0].action).toContain('Reviewed flashcard')
  })
})

describe('studyStore — flashcard CRUD', () => {
  it('createFlashcard initializes SM-2 defaults and prepends the saved card', async () => {
    const before = Date.now()

    const card = await useStudyStore.getState().createFlashcard('subj-1', 'Q?', 'A', ['tag'])

    expect(card.interval).toBe(0)
    expect(card.ease).toBe(2.5)
    expect(card.reps).toBe(0)
    expect(card.tags).toEqual(['tag'])
    expect(card.dueDate).toBeGreaterThanOrEqual(before)
    expect(api.saveFlashcard).toHaveBeenCalledWith(
      expect.objectContaining({ front: 'Q?', back: 'A', subjectId: 'subj-1' })
    )
    expect(useStudyStore.getState().flashcards[0].id).toBe(card.id)
  })

  it('deleteFlashcard removes only the requested card', async () => {
    useStudyStore.setState({
      flashcards: [makeFlashcard({ id: 'fc-1' }), makeFlashcard({ id: 'fc-2' })]
    })

    await useStudyStore.getState().deleteFlashcard('fc-2')

    expect(api.deleteFlashcard).toHaveBeenCalledWith('fc-2')
    expect(useStudyStore.getState().flashcards.map((f) => f.id)).toEqual(['fc-1'])
  })
})
