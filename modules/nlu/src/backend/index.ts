import 'bluebird-global'
import * as sdk from 'botpress/sdk'
import _ from 'lodash'

import { createApi } from '../api'
import en from '../translations/en.json'
import es from '../translations/es.json'
import fr from '../translations/fr.json'

import { registerRouter, removeRouter } from './api'
import { NLUApplication } from './application'
import { bootStrap } from './bootstrap'
import dialogConditions from './dialog-conditions'
import { registerMiddlewares, removeMiddlewares } from './middlewares'

let app: NLUApplication | undefined

const onServerStarted = async (bp: typeof sdk) => {
  app = await bootStrap(bp)
  registerMiddlewares(bp, app)
}

const onServerReady = async (bp: typeof sdk) => {
  await registerRouter(bp, app)
}

const onBotMount = async (bp: typeof sdk, botId: string) => {
  await app.mountBot(botId)
}

const onBotUnmount = async (bp: typeof sdk, botId: string) => {
  return app.unmountBot(botId)
}

const onModuleUnmount = async (bp: typeof sdk) => {
  removeMiddlewares(bp)
  removeRouter(bp)
  await app.teardown()
}

const onTopicChanged = async (bp: typeof sdk, botId: string, oldName?: string, newName?: string) => {
  const isRenaming = !!(oldName && newName)
  const isDeleting = !newName

  if (!isRenaming && !isDeleting) {
    return
  }

  const api = await createApi(bp, botId)
  const intentDefs = await api.fetchIntentsWithQNAs()

  for (const intentDef of intentDefs) {
    const ctxIdx = intentDef.contexts.indexOf(oldName as string)
    if (ctxIdx !== -1) {
      intentDef.contexts.splice(ctxIdx, 1)

      if (isRenaming) {
        intentDef.contexts.push(newName!)
      }

      await api.updateIntent(intentDef.name, intentDef)
    }
  }
}

const entryPoint: sdk.ModuleEntryPoint = {
  onServerStarted,
  onServerReady,
  onBotMount,
  onBotUnmount,
  onModuleUnmount,
  dialogConditions,
  onTopicChanged,
  translations: { en, fr, es },
  definition: {
    name: 'nlu',
    moduleView: {
      stretched: true
    },
    menuIcon: 'translate',
    menuText: 'NLU',
    fullName: 'NLU',
    homepage: 'https://botpress.com'
  }
}

export default entryPoint
