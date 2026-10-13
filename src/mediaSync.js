const PHOTO_PREFIX = 'satresq-breakdown-photo-v1:'
const VOICE_PREFIX = 'satresq-breakdown-voice-v1:'

function readItem(key) {
  try {
    return JSON.parse(
      localStorage.getItem(key) || 'null'
    )
  } catch {
    return null
  }
}

export function readLocalMedia(requestId) {
  return {
    photo: readItem(
      `${PHOTO_PREFIX}${requestId}`
    ),

    voice: readItem(
      `${VOICE_PREFIX}${requestId}`
    ),
  }
}

async function sendMedia(requestId, body) {
  const response = await fetch(
    `/api/requests/${encodeURIComponent(
      requestId
    )}/media`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify(body),
    }
  )

  const result = await response.json()

  if (!response.ok) {
    throw new Error(
      result.error ||
        'Media upload failed'
    )
  }

  return result
}

export async function uploadLocalMedia(
  requestId
) {
  const {
    photo,
    voice,
  } = readLocalMedia(requestId)

  const result = {
    photo: false,
    voice: false,
  }

  if (photo) {
    await sendMedia(
      requestId,
      {
        photo,
      }
    )

    result.photo = true
  }

  if (voice) {
    await sendMedia(
      requestId,
      {
        voice,
      }
    )

    result.voice = true
  }

  return result
}

export async function fetchRemoteMedia(
  requestId
) {
  const response = await fetch(
    `/api/requests/${encodeURIComponent(
      requestId
    )}/media`,
    {
      cache: 'no-store',
    }
  )

  const result = await response.json()

  if (!response.ok) {
    throw new Error(
      result.error ||
        'Could not load media'
    )
  }

  return result
}