import { supabase } from './supabaseClient'

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-exam`
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function generateExam(files, { isTrial = false } = {}) {
  // Accept single file or array
  const fileArray = Array.isArray(files) ? files : [files]

  console.log(`📁 Processing ${fileArray.length} image(s)`)

  const images = await Promise.all(
    fileArray.map(async (file) => ({
      data: await fileToBase64(file),
      mediaType: file.type || 'image/jpeg',
    }))
  )

  // Get current user session JWT for auth
  const { data: { session } } = await supabase.auth.getSession()
  const jwt = session?.access_token

  if (!jwt) throw new Error('Not authenticated')

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`,
    },
    body: JSON.stringify({ images, is_trial: isTrial }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }))
    if (response.status === 429) {
      throw new Error('RATE_LIMIT')
    }
    throw new Error(err.error || 'Failed to generate exam')
  }

  return response.json()
}
