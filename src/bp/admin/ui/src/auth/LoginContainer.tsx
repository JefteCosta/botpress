import { Callout, Intent } from '@blueprintjs/core'
import { lang } from 'botpress/shared'
import cx from 'classnames'
import React, { FC } from 'react'

import logo from './media/nobg_white.png'
import style from './style.scss'

interface Props {
  title?: string
  subtitle?: React.ReactNode
  error?: string | null
  poweredBy?: boolean
  children: React.ReactNode
}

const LoginContainer: FC<Props> = props => {
  return (
    <div className={style.centered_container}>
      <div className={style.middle}>
        <div className={style.inner}>
          <img className={style.logo} src={logo} alt="loading" />
          <div className={cx(style.card, style.card_body)}>
            <div className={cx(style.card_body, style.login_box)}>
              <div>
                <div className={style.card_title}>
                  <strong>{props.title || 'Botpress'}</strong>
                </div>

                <div className={style.card_text}>{props.subtitle || ''}</div>

                {props.error && <Callout intent={Intent.DANGER}>{props.error}</Callout>}
                {props.children}
              </div>
            </div>
          </div>
          {props.poweredBy && (
            <div className={style.homepage}>
              <p>
                {lang.tr('admin.poweredBy')} <a href="https://botpress.com">Botpress</a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LoginContainer
