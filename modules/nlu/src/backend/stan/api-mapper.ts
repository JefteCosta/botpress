import {
  TrainingSet,
  TrainingOptions,
  PredictOutput as BpPredictOutput,
  SlotDefinition as BpSlotDefinition,
  IntentDefinition as BpIntentDefinition,
  EntityDefinition,
  ContextPrediction as BpContextPrediction,
  Slot as BpSlotPrediction,
  Entity as BpEntity
} from 'common/nlu/engine'

import _ from 'lodash'
import {
  TrainInput,
  PredictOutput as StanPredictOutput,
  ListEntityDefinition,
  PatternEntityDefinition,
  SlotDefinition as StanSlotDefinition,
  IntentDefinition as StanIntentDefinition,
  IntentPrediction as StanIntentPrediction,
  SlotPrediction as StanSlotPrediction,
  ContextPrediction as StanContextPrediction,
  EntityPrediction as StanEntityPrediction
} from './typings'

/**
 * ################
 * ### Training ###
 * ################
 */

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

const makeIntentMapper = (lang: string) => (intent: BpIntentDefinition): StanIntentDefinition => {
  const { contexts, name, utterances, slots } = intent
  return {
    contexts,
    name,
    utterances: utterances[lang],
    slots: slots.map(mapInputSlot)
  }
}

const mapList = (listDef: EntityDefinition): ListEntityDefinition => {
  const { name, fuzzy, occurrences, examples } = listDef

  return {
    name,
    type: 'list',
    fuzzy: fuzzy!,
    values: occurrences!
  }
}

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

/**
 * ##################
 * ### Prediction ###
 * ##################
 */

function mapEntity(entity: StanEntityPrediction): BpEntity {
  const { name, type, start, end, confidence, source, value, unit } = entity

  return {
    name,
    type,
    meta: {
      confidence,
      start,
      end,
      sensitive: false,
      source
    },
    data: {
      unit: unit!,
      value
    }
  }
}

function mapIntent(intent: StanIntentPrediction): BpContextPrediction['intents'][0] {
  const { confidence, slots, extractor, name } = intent
  return {
    label: name,
    confidence,
    extractor,
    slots: _(slots)
      .map(mapOutputSlot)
      .keyBy(s => s.name)
      .value()
  }
}

function mapOutputSlot(slot: StanSlotPrediction): BpSlotPrediction {
  const { confidence, start, end, value, source, name, entity } = slot

  return {
    confidence,
    start,
    end,
    entity: mapEntity(entity!),
    name,
    source,
    value
  }
}

function mapContext(context: StanContextPrediction): BpContextPrediction {
  const { confidence, oos, intents } = context

  return {
    confidence,
    oos,
    intents: intents.map(mapIntent)
  }
}

export const mapPredictOutput = (predictOutput: StanPredictOutput): BpPredictOutput => {
  const { contexts, spellChecked, entities } = predictOutput
  return {
    predictions: _(contexts)
      .keyBy(c => c.name)
      .mapValues(mapContext)
      .value(),
    spellChecked,
    entities: entities.map(mapEntity)
  }
}
