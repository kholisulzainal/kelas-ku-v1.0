import { 
  getStoredGoogleToken, 
  saveGoogleToken, 
  clearStoredGoogleToken,
  getStoredGoogleUser,
  saveStoredGoogleUser,
  clearStoredGoogleUser,
  linkGoogleEmailToActiveGuru 
} from './googleServices';

let cachedAccessToken: string | null = getStoredGoogleToken();

// Listen to Auth State
export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Restore stored Google Workspace connection if present
  const storedUser = getStoredGoogleUser();
  const storedToken = getStoredGoogleToken();
  
  if (storedUser && storedToken) {
    cachedAccessToken = storedToken;
    saveGoogleToken(storedToken);
    linkGoogleEmailToActiveGuru(storedUser.email);
    if (onAuthSuccess) onAuthSuccess(storedUser, storedToken);
  } else {
    cachedAccessToken = null;
    if (onAuthFailure) onAuthFailure();
  }

  // Return unsubscribe function
  return () => {};
};

// Sign in with Google (Standalone OAuth & Workspace session)
export const googleSignIn = async (): Promise<{ user: any; accessToken: string; isDemoFallback?: boolean } | null> => {
  try {
    const defaultUser: any = {
      uid: 'guru-belajar-id-demo',
      displayName: 'Kholisul Zainal Asfan Sholikh, S.Pd.',
      email: 'kholisul411@guru.sd.belajar.id',
      photoURL: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
    };
    const activeToken = getStoredGoogleToken() || 'demo-google-access-token';
    cachedAccessToken = activeToken;
    saveGoogleToken(activeToken);
    saveStoredGoogleUser(defaultUser);
    linkGoogleEmailToActiveGuru(defaultUser.email);

    return { user: defaultUser, accessToken: activeToken, isDemoFallback: true };
  } catch (error: any) {
    console.warn('Google Sign In Notice:', error);
    throw error;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken) {
    cachedAccessToken = getStoredGoogleToken();
  }
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  cachedAccessToken = null;
  clearStoredGoogleToken();
  clearStoredGoogleUser();
  linkGoogleEmailToActiveGuru(null);
};

// --- Google Calendar API Functions ---

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    date?: string; // YYYY-MM-DD for all day
    dateTime?: string; // ISO 8601 for specific times
    timeZone?: string;
  };
  end: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  location?: string;
}

// Fetch events from Primary Google Calendar
export const fetchGoogleCalendarEvents = async (token: string, timeMin?: string, timeMax?: string): Promise<GoogleCalendarEvent[]> => {
  if (token === 'demo-google-access-token' || token.startsWith('demo-')) {
    return [
      {
        id: 'cal-demo-1',
        summary: 'Asesmen Sumatif Matematika Bab 2',
        description: 'Asesmen Harian Matematika Kelas 5A di Lab Komputer',
        start: { dateTime: new Date().toISOString() },
        end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
        location: 'Ruang Kelas 5A'
      },
      {
        id: 'cal-demo-2',
        summary: 'Rapat Kombel (Komunitas Belajar) Guru SD',
        description: 'Evaluasi Pembelajaran Berdiferensiasi Kurikulum Merdeka',
        start: { dateTime: new Date(Date.now() + 86400000).toISOString() },
        end: { dateTime: new Date(Date.now() + 90000000).toISOString() },
        location: 'Ruang Guru SD'
      }
    ];
  }

  let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime';
  if (timeMin) {
    url += `&timeMin=${encodeURIComponent(timeMin)}`;
  }
  if (timeMax) {
    url += `&timeMax=${encodeURIComponent(timeMax)}`;
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Gagal mengambil kalender: ${response.statusText}`);
  }

  const data = await response.json();
  return data.items || [];
};

// Insert event into Google Calendar
export const createGoogleCalendarEvent = async (token: string, event: GoogleCalendarEvent): Promise<GoogleCalendarEvent> => {
  if (token === 'demo-google-access-token' || token.startsWith('demo-')) {
    return {
      id: `cal-demo-${Date.now()}`,
      ...event
    };
  }

  const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(event)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Gagal menambahkan acara ke Google Kalender: ${response.statusText}`);
  }

  return response.json();
};

