import _ from 'lodash'
import * as NLUEngine from 'nlu/engine'

import { ContextPrediction, EntityPrediction, IntentPrediction, PredictOutput, SlotPrediction } from '../../typings_v1'

export interface BpPredictOutput {
  entities: NLUEngine.BpEntityPrediction[]
  contexts: _.Dictionary<NLUEngine.ContextPrediction>
  spellChecked: string
  detectedLanguage: string
  utterance: string
}

interface BpIntentPred {
  label: string
  confidence: number
  slots: _.Dictionary<NLUEngine.Slot>
  extractor: string
}

function mapEntity(entity: NLUEngine.BpEntityPrediction): EntityPrediction {
  const { data, type, meta, name } = entity
  const { unit, value } = data
  const { confidence, start, end, source } = meta

  return {
    name,
    type,
    start,
    end,
    confidence,
    source,
    value,
    unit
  }
}

function mapIntent(intent: BpIntentPred): IntentPrediction {
  const { confidence, slots, extractor, label } = intent

  return {
    name: label,
    confidence,
    extractor,
    slots: Object.values(slots).map(mapOutputSlot)
  }
}

function mapOutputSlot(slot: NLUEngine.Slot): SlotPrediction {
  const { confidence, start, end, value, source, name, entity } = slot

  return {
    confidence,
    start,
    end,
    entity: entity ? mapEntity(entity) : null,
    name,
    source,
    value
  }
}

function mapContext(context: NLUEngine.ContextPrediction, name: string): ContextPrediction {
  const { confidence, intents, oos } = context

  return {
    name,
    confidence,
    oos,
    intents: intents.map(mapIntent)
  }
}

const N_DIGITS = 3

const _roundConfidencesTo3Digits = (output: PredictOutput): PredictOutput => {
  const contexts = output.contexts.map(context => {
    context.confidence = _.round(context.confidence, N_DIGITS)
    context.oos = _.round(context.oos, N_DIGITS)
    context.intents = context.intents.map(i => {
      const slots = i.slots.map(s => ({ ...s, confidence: _.round(s.confidence, N_DIGITS) }))
      return { ...i, confidence: _.round(i.confidence, N_DIGITS), slots }
    })
    return context
  })
  return { ...output, contexts }
}

export function mapPredictOutput(output: BpPredictOutput): PredictOutput {
  const { entities, contexts, utterance, detectedLanguage, spellChecked } = output

  const ret = {
    entities: entities.map(mapEntity),
    contexts: Object.entries(contexts).map(([name, ctx]) => mapContext(ctx, name)),
    detectedLanguage,
    spellChecked,
    utterance
  }
  return _roundConfidencesTo3Digits(ret)
}
