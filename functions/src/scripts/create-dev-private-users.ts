import * as admin from 'firebase-admin'

import { initAdmin } from './script-init'
initAdmin()

import { PrivateUser, User } from 'common/user'
import { getDefaultNotificationPreferences } from 'common/user-notification-preferences'
import { isProd } from 'functions/src/utils'

const firestore = admin.firestore()

async function main() {
  if (isProd())
    return console.log('This script is not allowed to run in production')
  const snap = await firestore.collection('users').get()
  const users = snap.docs.map((d) => d.data() as User)

  await Promise.all(
    users.map(async (user) => {
      const { username } = user

      const privateUser: PrivateUser = {
        id: user.id,
        username,
        notificationPreferences: getDefaultNotificationPreferences(true),
        blockedUserIds: [],
        blockedByUserIds: [],
        blockedContractIds: [],
        blockedGroupSlugs: [],
      }
      try {
        await firestore
          .collection('private-users')
          .doc(user.id)
          .set(privateUser)

        console.log('created private user for:', user.username)
      } catch (_) {
        // private user already created
      }
    })
  )
}

if (require.main === module) main().then(() => process.exit())
