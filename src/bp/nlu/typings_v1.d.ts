// Typings for Stan's API v1

/**
 * ################################
 * ############ INPUTS ############
 * ################################
 */
export interface TrainInput {
  contexts: string[]
  intents: IntentDefinition[]
  entities: EntityDefinition[]
  language: string
  password: string
  seed?: number
}

export interface TrainSet {
  intents: IntentDefinition[]
  entities: EntityDefinition[]
  language: string
  seed: number
}

export type EntityDefinition = ListEntityDefinition | PatternEntityDefinition

export interface IntentDefinition {
  name: string
  contexts: string[]
  utterances: string[]
  slots: SlotDefinition[]
}

export interface SlotDefinition {
  name: string
  entities: string[]
}

export interface ListEntityDefinition {
  name: string
  type: 'list'
  values: { name: string; synonyms: string[] }[]
  fuzzy: number
  sensitive?: boolean
}

export interface PatternEntityDefinition {
  name: string
  type: 'pattern'
  regex: string
  case_sensitive: boolean
  sensitive?: boolean
}

export interface PredictInput {
  utterances: string[]
  password: string
}

/**
 * #################################
 * ############ OUTPUTS ############
 * #################################
 */
export interface PredictOutput {
  entities: EntityPrediction[]
  contexts: ContextPrediction[]
  utterance: string
  spellChecked: string
  detectedLanguage: string
}

export type EntityType = 'pattern' | 'list' | 'system'

export interface EntityPrediction {
  name: string
  type: string // ex: ['custom.list.fruits', 'system.time']
  value: string
  confidence: number
  source: string
  start: number
  end: number
  unit?: string
}

export interface ContextPrediction {
  name: string
  oos: number
  confidence: number
  intents: IntentPrediction[]
}

export interface IntentPrediction {
  name: string
  confidence: number
  slots: SlotPrediction[]
  extractor: string
}

export interface SlotPrediction {
  name: string
  value: string
  confidence: number
  source: string
  start: number
  end: number
  entity: EntityPrediction | null
}

/**
 * done : when a training is complete
 * training-pending : when a training was launched, but the training process is not started yet
 * training: when a chatbot is currently training
 * canceled: when a training was canceled
 * errored: when a chatbot failed to train
 */
export type TrainingStatus = 'done' | 'training-pending' | 'training' | 'canceled' | 'errored'

export interface TrainingSession {
  key: string // TODO: rm this
  status: TrainingStatus
  language: string // TODO: rm this
  progress: number
}

export interface Health {
  isEnabled: boolean
  validProvidersCount: number
  validLanguages: string[]
}

export interface Specifications {
  nluVersion: string // semver string
  languageServer: {
    dimensions: number
    domain: string
    version: string // semver string
  }
}

export interface EngineInfo {
  specs: Specifications
  languages: string[]
  health: Health
}

/**
 * ################################
 * ############ OTHERS ############
 * ################################
 */
export interface ModelId {
  specificationHash: string // represents the nlu engine that was used to train the model
  contentHash: string // represents the intent and entity definitions the model was trained with
  seed: number // number to seed the random number generators used during nlu training
  languageCode: string // language of the model
}

export interface Specifications {
  nluVersion: string // semver string
  languageServer: {
    dimensions: number
    domain: string
    version: string // semver string
  }
}

export interface Model {
  id: ModelId
  startedAt: Date
  finishedAt: Date
  data: {
    input: string
    output: string
  }
}

export interface Health {
  isEnabled: boolean
  validProvidersCount: number
  validLanguages: string[]
}
