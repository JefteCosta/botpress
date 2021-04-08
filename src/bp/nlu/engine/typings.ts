import { TrainSet, Specifications, ModelId, Health, Model } from 'nlu/typings_v1'

export interface Config extends LanguageConfig {
  modelCacheSize: string
  legacyElection: boolean
}

export interface LanguageConfig {
  ducklingURL: string
  ducklingEnabled: boolean
  languageSources: LanguageSource[]
}

export interface LanguageSource {
  endpoint: string
  authToken?: string
}

export interface Logger {
  debug: (msg: string) => void
  info: (msg: string) => void
  warning: (msg: string, err?: Error) => void
  error: (msg: string, err?: Error) => void
}

export interface ModelIdArgs extends TrainSet {
  specifications: Specifications
}

export interface TrainingOptions {
  progressCallback: (x: number) => void
  previousModel: ModelId | undefined
}

export interface Engine {
  getHealth: () => Health
  getLanguages: () => string[]
  getSpecifications: () => Specifications

  loadModel: (model: Model) => Promise<void>
  unloadModel: (modelId: ModelId) => void
  hasModel: (modelId: ModelId) => boolean

  train: (trainSessionId: string, trainSet: TrainSet, options?: Partial<TrainingOptions>) => Promise<Model>
  cancelTraining: (trainSessionId: string) => Promise<void>

  detectLanguage: (text: string, modelByLang: { [key: string]: ModelId }) => Promise<string>
  predict: (text: string, modelId: ModelId) => Promise<PredictOutput>
}

export interface ModelIdService {
  toString: (modelId: ModelId) => string // to use ModelId as a key
  fromString: (stringId: string) => ModelId // to parse information from a key
  isId: (m: string) => boolean
  makeId: (factors: ModelIdArgs) => ModelId
  briefId: (factors: Partial<ModelIdArgs>) => Partial<ModelId> // makes incomplete Id from incomplete information
}

export interface Intent {
  name: string
  confidence: number
  context: string
}

export interface BpEntityPrediction {
  name: string
  type: string
  meta: EntityMeta
  data: EntityBody
}

export interface EntityBody {
  extras?: any
  value: any
  unit: string
}

export interface EntityMeta {
  sensitive: boolean
  confidence: number
  provider?: string
  source: string
  start: number
  end: number
  raw?: any
}

export interface Slot {
  name: string
  value: any
  source: any
  entity: BpEntityPrediction
  confidence: number
  start: number
  end: number
}

export interface SlotCollection {
  [key: string]: Slot
}

export interface Predictions {
  [context: string]: ContextPrediction
}

export interface ContextPrediction {
  confidence: number
  oos: number
  intents: {
    label: string
    confidence: number
    slots: SlotCollection
    extractor: string
  }[]
}

export interface PredictOutput {
  readonly entities: BpEntityPrediction[]
  readonly predictions: Predictions
  readonly spellChecked: string
}
