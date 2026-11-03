import { getAccessToken } from './firebaseAuth';

/**
 * Helper to ensure a valid Google Workspace Access Token is available
 */
async function requireToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Você precisa estar conectado à sua Conta Google para usar os serviços do Workspace.');
  }
  return token;
}

// ==========================================
// GOOGLE DRIVE API INTEGRATION
// ==========================================

export interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  createdTime?: string;
}

/**
 * Upload a text, DXF, or base64 file to Google Drive using multipart upload
 */
export async function uploadFileToDrive(
  fileName: string,
  content: string | Blob,
  mimeType: string = 'text/plain'
): Promise<DriveFileInfo> {
  const token = await requireToken();

  const metadata = {
    name: fileName,
    mimeType: mimeType,
    description: 'Gerado automaticamente pelo MarcenariaPro',
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );

  if (typeof content === 'string') {
    form.append('file', new Blob([content], { type: mimeType }));
  } else {
    form.append('file', content);
  }

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Erro ${response.status} ao enviar arquivo para o Google Drive`
    );
  }

  return response.json();
}

/**
 * List files uploaded to Google Drive
 */
export async function listDriveFiles(): Promise<DriveFileInfo[]> {
  const token = await requireToken();

  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files?pageSize=20&fields=files(id,name,mimeType,webViewLink,createdTime)&orderBy=createdTime%20desc',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao listar arquivos do Google Drive');
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Delete a file from Google Drive (Requires explicit user confirmation)
 */
export async function deleteDriveFile(fileId: string, fileName: string): Promise<boolean> {
  const confirmed = window.confirm(
    `Tem certeza que deseja excluir o arquivo "${fileName}" do seu Google Drive? Esta ação é irreversível.`
  );
  if (!confirmed) return false;

  const token = await requireToken();

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao excluir arquivo do Google Drive');
  }

  return true;
}

// ==========================================
// GOOGLE CALENDAR API INTEGRATION
// ==========================================

export interface CalendarEventData {
  summary: string;
  description: string;
  location?: string;
  startDateTime: string; // ISO 8601
  endDateTime: string;   // ISO 8601
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

/**
 * Create a new event on Google Calendar
 */
export async function createCalendarEvent(event: CalendarEventData): Promise<GoogleCalendarEvent> {
  const token = await requireToken();

  const body = {
    summary: event.summary,
    description: event.description,
    location: event.location || '',
    start: {
      dateTime: event.startDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: event.endDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },
        { method: 'popup', minutes: 1440 }, // 1 day before
      ],
    },
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao agendar evento no Google Calendar');
  }

  return response.json();
}

/**
 * List upcoming calendar events
 */
export async function listUpcomingCalendarEvents(): Promise<GoogleCalendarEvent[]> {
  const token = await requireToken();

  const now = new Date().toISOString();
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
      now
    )}&maxResults=15&singleEvents=true&orderBy=startTime`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao carregar agenda do Google Calendar');
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Delete a calendar event with user confirmation
 */
export async function deleteCalendarEvent(eventId: string, eventTitle: string): Promise<boolean> {
  const confirmed = window.confirm(
    `Tem certeza que deseja cancelar o agendamento "${eventTitle}" no seu Google Calendar?`
  );
  if (!confirmed) return false;

  const token = await requireToken();

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok && response.status !== 204) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao excluir agendamento do Google Calendar');
  }

  return true;
}

// ==========================================
// GOOGLE DOCS API INTEGRATION
// ==========================================

export interface CreatedDocInfo {
  documentId: string;
  title: string;
  url: string;
}

/**
 * Create a formal Carpentry Contract / Specification Document in Google Docs
 */
export async function createGoogleContractDoc(
  projectTitle: string,
  clientName: string,
  contractText: string
): Promise<CreatedDocInfo> {
  const token = await requireToken();

  // Step 1: Create empty document
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `Contrato de Marcenaria - ${projectTitle} (${clientName})`,
    }),
  });

  if (!createRes.ok) {
    const errorData = await createRes.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao criar documento no Google Docs');
  }

  const docData = await createRes.json();
  const documentId = docData.documentId;

  // Step 2: Insert contract content
  const updateRes = await fetch(
    `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: contractText,
            },
          },
        ],
      }),
    }
  );

  if (!updateRes.ok) {
    console.warn('Document created but failed to populate batchUpdate');
  }

  return {
    documentId,
    title: docData.title || `Contrato - ${projectTitle}`,
    url: `https://docs.google.com/document/d/${documentId}/edit`,
  };
}

// ==========================================
// GOOGLE FORMS API INTEGRATION
// ==========================================

export interface CreatedFormInfo {
  formId: string;
  responderUri: string;
  editUri: string;
  title: string;
}

/**
 * Create a Client Project Briefing form using Google Forms API
 */
export async function createProjectIntakeForm(
  clientName: string,
  projectName: string
): Promise<CreatedFormInfo> {
  const token = await requireToken();

  // Create form
  const res = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      info: {
        title: `Questionário de Projeto - ${projectName}`,
        documentTitle: `Briefing Marcenaria - ${clientName}`,
      },
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao criar formulário no Google Forms');
  }

  const formData = await res.json();
  const formId = encodeURIComponent(formData.formId.trim());

  // Add questions to the form
  await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          createItem: {
            item: {
              title: 'Qual é o estilo de acabamento desejado para os móveis?',
              description: 'Ex: Madeira Natural, Laca Fosca, Grafite Matt, Portas Ripadas',
              questionItem: {
                question: {
                  required: true,
                  choiceQuestion: {
                    type: 'RADIO',
                    options: [
                      { value: 'Madeira Clara / Freijó / Carvalho' },
                      { value: 'Branco Minimalista com Puxador Oculto' },
                      { value: 'Industrial / Cinza Grafite e Serralheria' },
                      { value: 'Portas Ripadas com Iluminação LED' },
                    ],
                  },
                },
              },
            },
            location: { index: 0 },
          },
        },
        {
          createItem: {
            item: {
              title: 'Qual tipo de puxador você prefere nos armários e gavetas?',
              questionItem: {
                question: {
                  required: true,
                  choiceQuestion: {
                    type: 'RADIO',
                    options: [
                      { value: 'Perfil Gola em Alumínio (Oculto)' },
                      { value: 'Cava na própria madeira (Usinado)' },
                      { value: 'Sistema Fecho Toque (Push-Open)' },
                      { value: 'Puxador Tradicional de Sobrepor' },
                    ],
                  },
                },
              },
            },
            location: { index: 1 },
          },
        },
        {
          createItem: {
            item: {
              title: 'Há eletrodomésticos que precisam ser embutidos?',
              description: 'Indique se há lava-louças, forno de embutir, micro-ondas, cooktop ou geladeira side-by-side.',
              questionItem: {
                question: {
                  required: false,
                  textQuestion: {
                    paragraph: true,
                  },
                },
              },
            },
            location: { index: 2 },
          },
        },
      ],
    }),
  }).catch((err) => console.warn('Form batchUpdate notice:', err));

  return {
    formId: formData.formId,
    responderUri: formData.responderUri || `https://docs.google.com/forms/d/e/${formData.formId}/viewform`,
    editUri: `https://docs.google.com/forms/d/${formData.formId}/edit`,
    title: formData.info?.title || `Briefing - ${projectName}`,
  };
}
