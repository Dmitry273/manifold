import clsx from 'clsx'
import { Notification, ReactionNotificationTypes } from 'common/notification'
import { PrivateUser } from 'common/user'
import { sortBy } from 'lodash'
import { useRouter } from 'next/router'
import React, { Fragment, ReactNode, useEffect, useMemo, useState } from 'react'
import { Col } from 'web/components/layout/col'
import { Page } from 'web/components/layout/page'
import { Row } from 'web/components/layout/row'
import { ControlledTabs } from 'web/components/layout/tabs'
import { NotificationSettings } from 'web/components/notification-settings'
import { combineAndSumIncomeNotifications } from 'web/components/notifications/income-summary-notifications'
import {
  combineReactionNotifications,
  NOTIFICATIONS_PER_PAGE,
  NUM_SUMMARY_LINES,
  ParentNotificationHeader,
  PARENT_NOTIFICATION_STYLE,
  QuestionOrGroupLink,
} from 'web/components/notifications/notification-helpers'
import { markAllNotificationsAsSeen } from 'web/lib/firebase/notifications'
import { NotificationItem } from 'web/components/notifications/notification-types'
import { PushNotificationsModal } from 'web/components/push-notifications-modal'
import { SEO } from 'web/components/SEO'
import { ShowMoreLessButton } from 'web/components/widgets/collapsible-content'
import { LoadingIndicator } from 'web/components/widgets/loading-indicator'
import { Pagination } from 'web/components/widgets/pagination'
import { Title } from 'web/components/widgets/title'
import {
  NotificationGroup,
  useGroupedNotifications,
} from 'web/hooks/use-notifications'
import { useIsPageVisible } from 'web/hooks/use-page-visible'
import { useRedirectIfSignedOut } from 'web/hooks/use-redirect-if-signed-out'
import { usePrivateUser } from 'web/hooks/use-user'
import { XIcon } from '@heroicons/react/outline'
import { updatePrivateUser } from 'web/lib/firebase/users'
import { getNativePlatform } from 'web/lib/native/is-native'
import { AppBadgesOrGetAppButton } from 'web/components/buttons/app-badges-or-get-app-button'

export default function Notifications() {
  const privateUser = usePrivateUser()
  const router = useRouter()
  const [navigateToSection, setNavigateToSection] = useState<string>()
  const [activeIndex, setActiveIndex] = useState(0)
  const { isNative } = getNativePlatform()
  useRedirectIfSignedOut()

  useEffect(() => {
    const query = { ...router.query }
    if (query.tab === 'settings') {
      setActiveIndex(1)
    }
    if (query.section) {
      setNavigateToSection(query.section as string)
    }
  }, [router.query])

  return (
    <Page>
      <div className={'px-2 pt-4 sm:px-4 lg:pt-0'}>
        <Row className={clsx('hidden w-full justify-between lg:block')}>
          <Title text={'Notifications'} className="grow" />
        </Row>
        <SEO title="Notifications" description="Manifold user notifications" />
        {isNative ? (
          <div />
        ) : (
          privateUser &&
          !privateUser.hasSeenAppBannerInNotificationsOn && (
            <Row className="relative rounded-md bg-blue-50 p-2">
              <XIcon
                onClick={() =>
                  updatePrivateUser(privateUser.id, {
                    hasSeenAppBannerInNotificationsOn: Date.now(),
                  })
                }
                className={
                  'absolute -top-1 -right-1 h-4 w-4 cursor-pointer rounded-full bg-gray-100 sm:p-0.5'
                }
              />
              <span className={'text-sm sm:text-base'}>
                <Row className={'items-center'}>
                  We have a mobile app! Get the Manifold icon on your home
                  screen and push notifications (if you want 'em).
                  <Col
                    className={
                      'min-w-fit items-center justify-center p-2 md:flex-row'
                    }
                  >
                    <AppBadgesOrGetAppButton />
                  </Col>
                </Row>
              </span>
            </Row>
          )
        )}

        {privateUser && router.isReady && (
          <div className="relative h-full w-full">
            <div className="relative">
              <ControlledTabs
                currentPageForAnalytics={'notifications'}
                labelClassName={'pb-2 pt-1 '}
                className={'mb-0 sm:mb-2'}
                activeIndex={activeIndex}
                onClick={(title, i) => {
                  router.replace(
                    {
                      query: {
                        ...router.query,
                        tab: title.toLowerCase(),
                        section: '',
                      },
                    },
                    undefined,
                    { shallow: true }
                  )
                  setActiveIndex(i)
                }}
                tabs={[
                  {
                    title: 'Notifications',
                    content: <NotificationsList privateUser={privateUser} />,
                  },
                  {
                    title: 'Settings',
                    content: (
                      <NotificationSettings
                        navigateToSection={navigateToSection}
                        privateUser={privateUser}
                      />
                    ),
                  },
                ]}
              />
            </div>
          </div>
        )}
      </div>
    </Page>
  )
}

function RenderNotificationGroups(props: {
  notificationGroups: NotificationGroup[]
}) {
  const { notificationGroups } = props

  const grayLine = (
    <div className="mx-auto h-[1.5px] w-[calc(100%-1rem)] bg-gray-300" />
  )
  return (
    <>
      {notificationGroups.map((notification) => (
        <Fragment key={notification.groupedById + notification.timePeriod}>
          {notification.notifications.length === 1 ? (
            <>
              <NotificationItem
                notification={notification.notifications[0]}
                key={notification.notifications[0].id}
              />
              {grayLine}
            </>
          ) : (
            <>
              <NotificationGroupItem
                notificationGroup={notification}
                key={notification.groupedById + notification.timePeriod}
              />
              {grayLine}
            </>
          )}
        </Fragment>
      ))}
    </>
  )
}

function NotificationsList(props: { privateUser: PrivateUser }) {
  const { privateUser } = props
  const allGroupedNotifications = useGroupedNotifications(privateUser)

  const [page, setPage] = useState(0)

  const paginatedGroupedNotifications = useMemo(() => {
    if (!allGroupedNotifications) return undefined

    const start = page * NOTIFICATIONS_PER_PAGE
    const end = start + NOTIFICATIONS_PER_PAGE
    return allGroupedNotifications.slice(start, end)
  }, [allGroupedNotifications, page])

  const isPageVisible = useIsPageVisible()

  // Mark all notifications as seen.
  useEffect(() => {
    if (isPageVisible && allGroupedNotifications) {
      markAllNotificationsAsSeen(privateUser.id)
    }
  }, [privateUser.id, isPageVisible, allGroupedNotifications])

  if (!paginatedGroupedNotifications || !allGroupedNotifications)
    return <LoadingIndicator />

  return (
    <Col className={'min-h-[100vh] gap-0 text-sm'}>
      {paginatedGroupedNotifications.length === 0 && (
        <div className={'mt-2'}>
          You don't have any notifications. Try changing your settings to see
          more.
        </div>
      )}
      <PushNotificationsModal
        privateUser={privateUser}
        totalNotifications={
          allGroupedNotifications.map((ng) => ng.notifications).flat().length
        }
      />

      <RenderNotificationGroups
        notificationGroups={paginatedGroupedNotifications}
      />
      {paginatedGroupedNotifications.length > 0 &&
        allGroupedNotifications.length > NOTIFICATIONS_PER_PAGE && (
          <Pagination
            page={page}
            itemsPerPage={NOTIFICATIONS_PER_PAGE}
            totalItems={allGroupedNotifications.length}
            setPage={setPage}
            scrollToTop
            savePageToQuery={true}
          />
        )}
    </Col>
  )
}

function NotificationGroupItem(props: {
  notificationGroup: NotificationGroup
  className?: string
}) {
  const { notificationGroup } = props
  const { notifications } = notificationGroup
  const groupHighlighted = notifications.some((n) => !n.isSeen)
  const { sourceTitle, sourceContractTitle } = notifications[0]
  const incomeTypesToSum = ['bonus', 'tip', 'tip_and_like']
  const combinedNotifs = sortBy(
    combineReactionNotifications(
      notifications.filter((n) =>
        ReactionNotificationTypes.includes(n.sourceType)
      )
    )
      .concat(
        notifications.filter(
          (n) =>
            !ReactionNotificationTypes.includes(n.sourceType) &&
            !incomeTypesToSum.includes(n.sourceType)
        )
      )
      .concat(
        combineAndSumIncomeNotifications(
          notifications.filter((n) => incomeTypesToSum.includes(n.sourceType))
        )
      ),

    'createdTime'
  ).reverse()
  const header = (
    <ParentNotificationHeader
      header={
        sourceTitle || sourceContractTitle ? (
          <>
            Activity on{' '}
            <QuestionOrGroupLink
              notification={notifications[0]}
              truncatedLength={'xl'}
            />
          </>
        ) : (
          <span>Other Activity</span>
        )
      }
      highlighted={groupHighlighted}
    />
  )

  return (
    <NotificationGroupItemComponent
      notifications={combinedNotifs}
      header={header}
    />
  )
}

export function NotificationGroupItemComponent(props: {
  notifications: Notification[]
  header: ReactNode
  className?: string
}) {
  const { notifications, className, header } = props
  const numNotifications = notifications.length

  const needsExpanding = numNotifications > NUM_SUMMARY_LINES
  const [expanded, setExpanded] = useState(false)
  const onExpandHandler = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey) return
    setExpanded(!expanded)
  }

  const shownNotifications = expanded
    ? notifications
    : notifications.slice(0, NUM_SUMMARY_LINES)
  return (
    <div className={clsx(PARENT_NOTIFICATION_STYLE, className)}>
      {header}
      <div className={clsx(' whitespace-pre-line')}>
        {shownNotifications.map((notification) => {
          return (
            <NotificationItem
              notification={notification}
              key={notification.id}
              isChildOfGroup={true}
            />
          )
        })}
        {needsExpanding && (
          <Row className={clsx('w-full items-center justify-end gap-1')}>
            <ShowMoreLessButton
              onClick={onExpandHandler}
              isCollapsed={!expanded}
              howManyMore={numNotifications - NUM_SUMMARY_LINES}
            />
          </Row>
        )}
      </div>
    </div>
  )
}
