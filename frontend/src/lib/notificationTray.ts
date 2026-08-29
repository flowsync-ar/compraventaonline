export type NotifKind = "sale" | "question" | "answered"

export type NotifTray = {
  closed: Record<NotifKind, string[]>
  deleted: Record<NotifKind, string[]>
}

const emptyKind = (): Record<NotifKind, string[]> => ({
  sale: [],
  question: [],
  answered: [],
})

export function emptyNotifTray(): NotifTray {
  return { closed: emptyKind(), deleted: emptyKind() }
}

function storageKey(sellerId: string) {
  return `cvo-notif-tray-${sellerId}`
}

export function loadNotifTray(sellerId: string): NotifTray {
  try {
    const raw = localStorage.getItem(storageKey(sellerId))
    if (!raw) return emptyNotifTray()
    const parsed = JSON.parse(raw) as NotifTray
    return {
      closed: { ...emptyKind(), ...parsed.closed },
      deleted: { ...emptyKind(), ...parsed.deleted },
    }
  } catch {
    return emptyNotifTray()
  }
}

export function saveNotifTray(sellerId: string, tray: NotifTray) {
  localStorage.setItem(storageKey(sellerId), JSON.stringify(tray))
}

export function isDeleted(tray: NotifTray, kind: NotifKind, id: string) {
  return tray.deleted[kind].includes(id)
}

export function isClosed(tray: NotifTray, kind: NotifKind, id: string) {
  return tray.closed[kind].includes(id)
}

export function isOutOfInbox(tray: NotifTray, kind: NotifKind, id: string) {
  return isClosed(tray, kind, id) || isDeleted(tray, kind, id)
}

export function closeNotif(tray: NotifTray, kind: NotifKind, id: string): NotifTray {
  if (isOutOfInbox(tray, kind, id)) return tray
  return {
    ...tray,
    closed: { ...tray.closed, [kind]: [...tray.closed[kind], id] },
  }
}

export function restoreNotif(tray: NotifTray, kind: NotifKind, id: string): NotifTray {
  return {
    ...tray,
    closed: { ...tray.closed, [kind]: tray.closed[kind].filter((x) => x !== id) },
  }
}

export function deleteNotif(tray: NotifTray, kind: NotifKind, id: string): NotifTray {
  return {
    closed: { ...tray.closed, [kind]: tray.closed[kind].filter((x) => x !== id) },
    deleted: {
      ...tray.deleted,
      [kind]: tray.deleted[kind].includes(id) ? tray.deleted[kind] : [...tray.deleted[kind], id],
    },
  }
}

export function emptyClosed(tray: NotifTray): NotifTray {
  const kinds: NotifKind[] = ["sale", "question", "answered"]
  const deleted = { ...tray.deleted }
  for (const kind of kinds) {
    const extra = tray.closed[kind].filter((id) => !deleted[kind].includes(id))
    deleted[kind] = [...deleted[kind], ...extra]
  }
  return { closed: emptyKind(), deleted }
}

export function closedCount(tray: NotifTray) {
  return tray.closed.sale.length + tray.closed.question.length + tray.closed.answered.length
}
