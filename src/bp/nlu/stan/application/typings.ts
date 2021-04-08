import { EngineInfo, TrainInput, TrainingSession, PredictOutput, ModelId } from '../../typings_v1'

export interface ModelPassword {
  modelId: ModelId
  password: string
}

export interface Stan {
  getInfo: () => EngineInfo

  startTraining: (trainInput: TrainInput) => ModelId
  getTrainingStatus: (modelId: ModelId, password: string) => Promise<TrainingSession>
  cancelTraining: (modelId: ModelId, password: string) => Promise<void>

  hasModel: (modelId: ModelId, password: string) => Promise<boolean>

  detectLanguage: (utterances: string[], models: ModelPassword[]) => Promise<string[]>
  predict: (utterances: string[], modelId: ModelId, password: string) => Promise<PredictOutput[]>
}
