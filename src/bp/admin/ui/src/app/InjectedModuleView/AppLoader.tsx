import React, { useEffect, FC } from 'react'
import { connect, ConnectedProps } from 'react-redux'
import { RouteComponentProps } from 'react-router'

import { setWorkspaceAppBotId } from '~/workspace/bots/reducer'
import PageContainer from '../common/PageContainer'
import { AppState } from '../rootReducer'
import InjectedModuleView from '.'

type Props = ConnectedProps<typeof connector> & RouteComponentProps<{ botId?: string; appName: string }>

const AppLoader: FC<Props> = props => {
  const { botId, appName } = props.match.params

  useEffect(() => {
    props.setWorkspaceAppBotId(botId)

    return () => {
      props.setWorkspaceAppBotId(undefined)
    }
  }, [botId])

  return (
    <PageContainer title={appName} noWrapper>
      <InjectedModuleView moduleName={appName} extraProps={{ botId, contentLang: props.contentLang }} />
    </PageContainer>
  )
}

const mapStateToProps = (state: AppState) => ({
  contentLang: state.ui.contentLang
})

const connector = connect(mapStateToProps, { setWorkspaceAppBotId })
export default connector(AppLoader)
