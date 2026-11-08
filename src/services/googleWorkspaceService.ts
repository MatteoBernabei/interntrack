// Google Workspace Client: Google Calendar & Google Tasks APIs
// Uses OAuth 2.0 Bearer tokens with client-side execution

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
  accountEmail?: string;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  due?: string; // RFC 3339 timestamp
  status: 'needsAction' | 'completed';
  completed?: string;
  accountEmail?: string;
}

// ==========================================
// GOOGLE CALENDAR API
// ==========================================

export async function fetchCalendarEvents(
  accessToken: string,
  calendarId = 'primary'
): Promise<GoogleCalendarEvent[]> {
  const timeMin = new Date().toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
    calendarId
  )}/events?timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime&maxResults=25`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Calendar API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const items = data.items || [];
  return items.map((item: any) => ({
    id: item.id,
    summary: item.summary || 'Senza titolo',
    description: item.description || '',
    start: item.start || {},
    end: item.end || {},
    htmlLink: item.htmlLink,
  }));
}

export async function createCalendarEvent(
  accessToken: string,
  event: {
    summary: string;
    description?: string;
    startDateTime: string; // ISO string
    endDateTime: string; // ISO string
  },
  calendarId = 'primary'
): Promise<GoogleCalendarEvent> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
    calendarId
  )}/events`;

  const payload = {
    summary: event.summary,
    description: event.description,
    start: { dateTime: event.startDateTime },
    end: { dateTime: event.endDateTime },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Calendar create error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// ==========================================
// GOOGLE TASKS API
// ==========================================

export async function fetchGoogleTasks(
  accessToken: string,
  taskListId = '@default'
): Promise<GoogleTaskItem[]> {
  const url = `https://tasks.googleapis.com/tasks/v1/users/@me/lists/${encodeURIComponent(
    taskListId
  )}/tasks?showCompleted=true&maxResults=30`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Tasks API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const items = data.items || [];
  return items.map((item: any) => ({
    id: item.id,
    title: item.title || 'Attività senza nome',
    notes: item.notes || '',
    due: item.due,
    status: item.status || 'needsAction',
    completed: item.completed,
  }));
}

export async function createGoogleTask(
  accessToken: string,
  task: {
    title: string;
    notes?: string;
    due?: string; // RFC 3339 date string (e.g. 2026-11-08T00:00:00.000Z)
  },
  taskListId = '@default'
): Promise<GoogleTaskItem> {
  const url = `https://tasks.googleapis.com/tasks/v1/users/@me/lists/${encodeURIComponent(
    taskListId
  )}/tasks`;

  const payload: Record<string, any> = {
    title: task.title,
    notes: task.notes,
  };
  if (task.due) {
    payload.due = task.due;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Tasks create error (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function markGoogleTaskComplete(
  accessToken: string,
  taskId: string,
  taskListId = '@default'
): Promise<void> {
  const url = `https://tasks.googleapis.com/tasks/v1/users/@me/lists/${encodeURIComponent(
    taskListId
  )}/tasks/${encodeURIComponent(taskId)}`;

  const payload = {
    id: taskId,
    status: 'completed',
  };

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Tasks complete error (${response.status}): ${errorText}`);
  }
}

export async function deleteGoogleTask(
  accessToken: string,
  taskId: string,
  taskListId = '@default'
): Promise<void> {
  const url = `https://tasks.googleapis.com/tasks/v1/users/@me/lists/${encodeURIComponent(
    taskListId
  )}/tasks/${encodeURIComponent(taskId)}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    const errorText = await response.text();
    throw new Error(`Google Tasks delete error (${response.status}): ${errorText}`);
  }
}

/**
 * Safely format an arbitrary date string or 'Oggi' / 'Domani' to an RFC 3339 timestamp required by Google Tasks.
 */
export function formatToRfc3339(dateStr?: string): string {
  const now = new Date();
  if (!dateStr || dateStr.toLowerCase().includes('oggi')) {
    now.setHours(23, 59, 59, 0);
    return now.toISOString();
  }
  if (dateStr.toLowerCase().includes('domani')) {
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(23, 59, 59, 0);
    return tomorrow.toISOString();
  }
  // Try standard parse
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  // Fallback to today
  now.setHours(23, 59, 59, 0);
  return now.toISOString();
}

