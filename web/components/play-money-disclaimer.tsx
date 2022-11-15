import { ManaSymbol } from './mana'
import { InfoBox } from './widgets/info-box'

export const PlayMoneyDisclaimer = () => (
  <InfoBox
    title="Play-money trading"
    className="mt-4"
    content={
      <>
        Mana (<ManaSymbol />) is the play-money used by our platform to keep
        track of your trades. It's completely free for you and your friends to
        get started!
      </>
    }
  />
)
