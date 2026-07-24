'use client'

import { useEffect, useState } from 'react'
import { getSingaporeNow, toSingaporeISOString } from '@/lib/timezone'

type NotificationItem = {
  todoId: number
  title: string
  dueDate: string
}

type NotificationsResponse = {
  notifications: NotificationItem[]
}

async function fetchNotifications(): Promise<NotificationItem[]> {
  const response = await fetch('/api/notifications/check', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  })

  if (!response.ok) {
    return []
  }

  const payload = (await response.json()) as NotificationsResponse
  return payload.notifications
}

async function acknowledgeNotification(todoId: number): Promise<void> {
  await fetch(`/api/todos/${todoId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      last_notification_sent: toSingaporeISOString(getSingaporeNow()),
    }),
  })
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  async function requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied'
    }

    if (Notification.permission === 'granted') {
      return 'granted'
    }

    return Notification.requestPermission()
  }

  useEffect(() => {
    let cancelled = false

    async function pollNotifications() {
      const nextNotifications = await fetchNotifications()

      if (cancelled || nextNotifications.length === 0) {
        return
      }

      setNotifications(nextNotifications)

      if (!(typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted')) {
        return
      }

      for (const notification of nextNotifications) {
        new Notification(`Reminder: ${notification.title}`, {
          body: `Due at ${notification.dueDate}`,
        })

        await acknowledgeNotification(notification.todoId)
      }
    }

    void pollNotifications()
    const intervalId = window.setInterval(() => {
      void pollNotifications()
    }, 30_000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [])

  return {
    notifications,
    requestPermission,
  }
}