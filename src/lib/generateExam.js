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

export async function generateExam(files) {
  // Accept single file or array
  const fileArray = Array.isArray(files) ? files : [files]

  console.log(`📁 Processing ${fileArray.length} image(s)`)

  const images = await Promise.all(
    fileArray.map(async (file) => ({
      data: await fileToBase64(file),
      mediaType: file.type || 'image/jpeg',
    }))
  )

  // Get current user for tracking
  const { data: { user } } = await supabase.auth.getUser()

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({
      images,
      user_id: user?.id,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || 'Failed to generate exam')
  }

  return response.json()
}
