import {
  TrainingSet,
  TrainingOptions,
  PredictOutput as BpPredictOutput,
  SlotDefinition as BpSlotDefinition,
  IntentDefinition as BpIntentDefinition,
  EntityDefinition
} from 'common/nlu/engine'

import _ from 'lodash'
import {
  TrainInput,
  PredictOutput as StanPredictOutput,
  ListEntityDefinition,
  PatternEntityDefinition,
  SlotDefinition as StanSlotDefinition,
  IntentDefinition as StanIntentDefinition
} from './typings'

export const isPatternEntity = (e: EntityDefinition) => {
  return e.type === 'pattern'
}

const mapInputSlot = (slot: BpSlotDefinition): StanSlotDefinition => {
  const { name, entities } = slot
  return {
    name,
    entities
  }
}

// const makeIntentMapper = (ctx: string, lang: string) => (intent: StanIntentDefinition): BpIntentDefinition => {
//   const { name, utterances, slots } = intent

//   return {
//     contexts: [ctx],
//     name,
//     utterances: {
//       [lang]: utterances
//     },
//     slots: slots.map(mapInputSlot)
//   }
// }

const makeIntentMapper = (lang: string) => (intent: BpIntentDefinition): StanIntentDefinition => {
  const { contexts, name, utterances, slots } = intent
  return {
    contexts,
    name,
    utterances: utterances[lang],
    slots: slots.map(mapInputSlot)
  }
}

// const mapList = (listDef: ListEntityDefinition): EntityDefinition => {
//   const { name, fuzzy, values } = listDef

//   return {
//     id: name,
//     name,
//     type: 'list',
//     fuzzy,
//     occurrences: values
//   }
// }

const mapList = (listDef: EntityDefinition): ListEntityDefinition => {
  const { name, fuzzy, occurrences, examples } = listDef

  return {
    name,
    type: 'list',
    fuzzy: fuzzy!,
    values: occurrences!
  }
}

// const mapPattern = (patternDef: PatternEntityDefinition): EntityDefinition => {
//   const { name, regex, case_sensitive } = patternDef

//   return {
//     id: name,
//     name,
//     type: 'pattern',
//     pattern: regex,
//     matchCase: case_sensitive
//   }
// }

const mapPattern = (patternDef: EntityDefinition): PatternEntityDefinition => {
  const { name, pattern, matchCase } = patternDef

  return {
    name,
    type: 'pattern',
    regex: pattern!,
    case_sensitive: matchCase!
  }
}

export const mapTrainInput = (
  trainSet: TrainingSet,
  options: Partial<TrainingOptions>,
  password: string
): TrainInput => {
  const { intentDefs, entityDefs, languageCode, seed } = trainSet
  const contexts = _(intentDefs)
    .flatMap(i => i.contexts)
    .uniq()
    .value()

  const entities = entityDefs.map(e => (isPatternEntity(e) ? mapPattern(e) : mapList(e)))

  const intentMapper = makeIntentMapper(languageCode)

  const stanTrainInput: TrainInput = {
    contexts,
    entities,
    language: languageCode,
    password,
    seed,
    intents: intentDefs.map(intentMapper)
  }
  return stanTrainInput
}

export const mapPredictOutput = (predictOutput: StanPredictOutput): BpPredictOutput => {
  return {} as BpPredictOutput
}
