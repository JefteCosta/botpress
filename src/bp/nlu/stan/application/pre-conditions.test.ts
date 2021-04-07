import {
  IntentDefinition,
  ListEntityDefinition,
  PatternEntityDefinition,
  SlotDefinition,
  TrainInput
} from '../typings_v1'

import { assertTrainInput } from './pre-conditions'

/**
 * These unit tests don't cover all possible scenarios of training input, but they to more good than bad.
 * If we ever find a bug in train input validation, we'll just add some more tests.
 */

const CITY_ENUM: ListEntityDefinition = {
  name: 'city',
  type: 'list',
  fuzzy: 1,
  values: [
    { name: 'paris', synonyms: ['city of paris', 'la ville des lumières'] },
    { name: 'quebec', synonyms: [] }
  ]
}

const TICKET_PATTERN: PatternEntityDefinition = {
  name: 'ticket',
  type: 'pattern',
  case_sensitive: true,
  regex: '[A-Z]{3}-[0-9]{3}' // ABC-123
}

const VARIABLE_CITY_FROM: SlotDefinition = { name: 'city-from', entities: ['city'] }

const VARIABLE_TICKET_PROBLEM: SlotDefinition = { name: 'tick-with-problem', entities: ['ticket'] }

const FLY_INTENT: IntentDefinition = {
  name: 'fly',
  contexts: ['fly'],
  utterances: ['fly from $city-from to anywhere', 'book a flight'],
  slots: [VARIABLE_CITY_FROM]
}

const PROBLEM_INTENT: IntentDefinition = {
  name: 'problem',
  contexts: ['problem'],
  utterances: ['problem with ticket $tick-with-problem', 'problem with ticket'],
  slots: [VARIABLE_TICKET_PROBLEM]
}

const LANG = 'en'
const PW = 'Caput Draconis'

test('validate with correct format should pass', async () => {
  // arrange
  const trainInput: TrainInput = {
    intents: [FLY_INTENT],
    entities: [CITY_ENUM],
    contexts: ['fly'],
    language: LANG,
    password: PW,
    seed: 42
  }

  // act
  const validated = assertTrainInput(trainInput)

  // assert
  expect(validated).toStrictEqual(trainInput)
})

test('validate intent with unexisting context should fail', async () => {
  // arrange
  const trainInput: TrainInput = {
    intents: [FLY_INTENT],
    contexts: ['A'],
    entities: [CITY_ENUM],
    language: LANG,
    password: PW,
    seed: 42
  }

  // act & assert
  expect(() => assertTrainInput(trainInput)).toThrow()
})

test('validate with an unexisting referenced enum should throw', async () => {
  // arrange
  const trainInput: TrainInput = {
    intents: [FLY_INTENT],
    contexts: ['fly'],
    entities: [TICKET_PATTERN],
    language: LANG,
    password: PW,
    seed: 42
  }

  // act & assert
  expect(() => assertTrainInput(trainInput)).toThrow()
})

test('validate with an unexisting referenced pattern should throw', async () => {
  // arrange
  const trainInput: TrainInput = {
    intents: [PROBLEM_INTENT],
    contexts: ['problem'],
    entities: [CITY_ENUM],
    language: LANG,
    password: PW,
    seed: 42
  }

  // act & assert
  expect(() => assertTrainInput(trainInput)).toThrow()
})
