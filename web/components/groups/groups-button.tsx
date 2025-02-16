import { UserAddIcon, UserRemoveIcon } from '@heroicons/react/solid'
import clsx from 'clsx'
import { Group } from 'common/group'
import { User } from 'common/user'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { TextButton } from 'web/components/buttons/text-button'
import { Col } from 'web/components/layout/col'
import { Modal } from 'web/components/layout/modal'
import { Row } from 'web/components/layout/row'
import { useMemberGroupsSubscription } from 'web/hooks/use-group'
import { useUser } from 'web/hooks/use-user'
import { joinGroup, leaveGroup } from 'web/lib/firebase/groups'
import { firebaseLogin } from 'web/lib/firebase/users'
import { withTracking } from 'web/lib/service/analytics'
import { groupButtonClass } from 'web/pages/group/[...slugs]'
import { GroupLinkItem } from 'web/pages/groups'
import { Button } from '../buttons/button'

export function GroupsButton(props: { user: User; className?: string }) {
  const { user, className } = props
  const [isOpen, setIsOpen] = useState(false)
  const groups = useMemberGroupsSubscription(user)

  return (
    <>
      <TextButton onClick={() => setIsOpen(true)} className={className}>
        <span className="font-semibold">{groups?.length ?? ''}</span> Groups
      </TextButton>

      <GroupsDialog
        user={user}
        groups={groups ?? []}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      />
    </>
  )
}

function GroupsDialog(props: {
  user: User
  groups: Group[]
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}) {
  const { user, groups, isOpen, setIsOpen } = props
  const currentUser = useUser()
  const isCurrentUser = currentUser?.id === user.id

  return (
    <Modal open={isOpen} setOpen={setIsOpen}>
      <Col className="rounded bg-white p-6">
        <div className="p-2 pb-1 text-xl">{user.name}</div>
        <div className="p-2 pt-0 text-sm text-gray-500">@{user.username}</div>
        <Col className="gap-2">
          {groups.length === 0 && (
            <div className="text-gray-500">No groups yet...</div>
          )}
          {groups
            .sort((group1, group2) => group2.createdTime - group1.createdTime)
            .map((group) => (
              <Row
                className={clsx('items-center justify-between gap-2 p-2')}
                key={group.id}
              >
                <Row className="line-clamp-1 items-center gap-2">
                  <GroupLinkItem group={group} />
                </Row>
                {isCurrentUser && (
                  <JoinOrLeaveGroupButton
                    group={group}
                    user={user}
                    isMember={true}
                  />
                )}
              </Row>
            ))}
        </Col>{' '}
      </Col>
    </Modal>
  )
}

export function JoinOrLeaveGroupButton(props: {
  group: Group
  isMember: boolean | undefined
  user: User | undefined | null
  className?: string
  isMobile?: boolean
  disabled?: boolean
}) {
  const { group, className, isMember, user, isMobile, disabled } = props

  if (!group.anyoneCanJoin) {
    return <></>
  }
  const unfollow = user
    ? withTracking(() => {
        leaveGroup(group, user.id).catch(() => {
          toast.error('Failed to leave group')
        })
      }, 'leave group')
    : firebaseLogin
  const follow = user
    ? withTracking(() => {
        joinGroup(group, user.id).catch(() => {
          toast.error('Failed to join group')
        })
      }, 'join group')
    : firebaseLogin

  if (isMember) {
    if (isMobile) {
      return (
        <button className={className} onClick={unfollow} disabled={disabled}>
          <UserRemoveIcon className={clsx('h-5 w-5', groupButtonClass)} />
        </button>
      )
    }
    return (
      <Button color="dark-gray" className={className} onClick={unfollow}>
        <Row className="gap-1">
          <UserRemoveIcon className="h-5 w-5" />
          Unfollow
        </Row>
      </Button>
    )
  }

  if (isMobile) {
    return (
      <button className={className} onClick={follow} disabled={disabled}>
        <UserAddIcon className={clsx('h-5 w-5', groupButtonClass)} />
      </button>
    )
  }
  return (
    <Button color="indigo" className={className} onClick={follow}>
      <Row className="gap-1">
        <UserAddIcon className="h-5 w-5" />
        Follow
      </Row>
    </Button>
  )
}
