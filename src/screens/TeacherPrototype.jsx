import { useState, useRef, useEffect, useCallback } from 'react'

const ANTHROPIC_API_KEY = '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'

// ─── Numio Face ───────────────────────────────────────────────────────────────
function NumioFace({ state }) {
  const faces = {
    idle: {
      browL: 'rotate(0deg) translateY(0px)',
      browR: 'rotate(0deg) translateY(0px)',
      pupilL: 'translate(0px, 0px)',
      pupilR: 'translate(0px, 0px)',
      mouth: { width: 28, height: 14, radius: '0 0 20px 20px', marginTop: 0, flip: false },
    },
    talking: {
      browL: 'rotate(0deg) translateY(0px)',
      browR: 'rotate(0deg) translateY(0px)',
      pupilL: 'translate(0px, 0px)',
      pupilR: 'translate(0px, 0px)',
      mouth: { width: 28, height: 8, radius: '0 0 20px 20px', marginTop: 0, flip: false },
    },
    thinking: {
      browL: 'rotate(-12deg) translateY(-4px)',
      browR: 'rotate(8deg) translateY(-2px)',
      pupilL: 'translate(2px, -6px)',
      pupilR: 'translate(2px, -6px)',
      mouth: { width: 18, height: 8, radius: '0 0 12px 12px', marginTop: 0, flip: false },
    },
    listening: {
      browL: 'rotate(-4deg) translateY(-2px)',
      browR: 'rotate(4deg) translateY(-2px)',
      pupilL: 'translate(0px, 2px)',
      pupilR: 'translate(0px, 2px)',
      mouth: { width: 22, height: 10, radius: '50%', marginTop: 0, flip: false },
    },
    celebrate: {
      browL: 'rotate(-8deg) translateY(-6px)',
      browR: 'rotate(8deg) translateY(-6px)',
      pupilL: 'translate(0px, 2px)',
      pupilR: 'translate(0px, 2px)',
      mouth: { width: 34, height: 18, radius: '0 0 24px 24px', marginTop: 0, flip: false },
    },
    confused: {
      browL: 'rotate(12deg) translateY(-3px)',
      browR: 'rotate(-4deg) translateY(0px)',
      pupilL: 'translate(-3px, 2px)',
      pupilR: 'translate(3px, -2px)',
      mouth: { width: 22, height: 10, radius: '20px 20px 0 0', marginTop: 8, flip: true },
    },
  }

  const f = faces[state] || faces.idle
  const isTalking = state === 'talking'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes bounce { 0%,100%{transform:translateY(0) scale(1)} 30%{transform:translateY(-18px) scale(1.05)} 60%{transform:translateY(-6px) scale(0.98)} }
        @keyframes shake { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-5deg)} 75%{transform:rotate(5deg)} }
        @keyframes talkMouth { 0%,100%{height:8px} 50%{height:22px} }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.5);opacity:0} }
        .numio-idle { animation: float 3s ease-in-out infinite; }
        .numio-talking { animation: float 3s ease-in-out infinite; }
        .numio-thinking { animation: float 3s ease-in-out infinite; }
        .numio-listening { animation: float 2s ease-in-out infinite; }
        .numio-celebrate { animation: bounce 0.7s ease-in-out infinite; }
        .numio-confused { animation: shake 0.5s ease-in-out infinite; }
        .talk-mouth { animation: talkMouth 0.35s ease-in-out infinite; }
        .listen-ring { animation: pulse-ring 1.2s ease-out infinite; }
      `}</style>

      <div style={{ position: 'relative', display: 'inline-block' }}>
        {state === 'listening' && (
          <div className="listen-ring" style={{
            position: 'absolute', inset: -12, borderRadius: '28px',
            border: '3px solid #7c3aed', pointerEvents: 'none'
          }} />
        )}
        <div
          className={`numio-${state}`}
          style={{
            width: 140, height: 140, background: '#7c3aed',
            borderRadius: 28, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 0,
          }}
        >
          {/* Brows */}
          <div style={{ display: 'flex', gap: 30, marginBottom: 4 }}>
            <div style={{ width: 26, height: 5, background: '#1a1a1a', borderRadius: 3, transform: f.browL, transition: 'transform 0.3s ease' }} />
            <div style={{ width: 26, height: 5, background: '#1a1a1a', borderRadius: 3, transform: f.browR, transition: 'transform 0.3s ease' }} />
          </div>
          {/* Eyes */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
            {['L', 'R'].map(side => (
              <div key={side} style={{ width: 36, height: 42, background: 'white', borderRadius: '50%', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  width: 20, height: 26, background: '#1a1a1a', borderRadius: '50%',
                  position: 'absolute', top: 8, left: 8,
                  transform: side === 'L' ? f.pupilL : f.pupilR,
                  transition: 'transform 0.3s ease',
                }}>
                  <div style={{ width: 6, height: 6, background: 'white', borderRadius: '50%', position: 'absolute', top: 4, left: 4 }} />
                </div>
              </div>
            ))}
          </div>
          {/* Mouth */}
          <div style={{ width: f.mouth.width, height: f.mouth.height, background: '#1a1a1a', borderRadius: f.mouth.radius, marginTop: f.mouth.marginTop, transition: 'all 0.3s ease' }}
            className={isTalking ? 'talk-mouth' : ''} />
        </div>
      </div>
    </div>
  )
}

// ─── Highlighted Text ─────────────────────────────────────────────────────────
function HighlightedText({ text, highlightIndex, words }) {
  if (!words || words.length === 0) {
    return <p style={{ fontSize: 16, lineHeight: 1.8, color: '#1a1a2e', margin: 0 }}>{text}</p>
  }
  return (
    <p style={{ fontSize: 16, lineHeight: 1.8, color: '#1a1a2e', margin: 0 }}>
      {words.map((word, i) => (
        <span key={i} style={{
          background: i === highlightIndex ? '#fef08a' : 'transparent',
          borderRadius: 3, padding: '0 1px',
          transition: 'background 0.1s ease',
        }}>
          {word}{' '}
        </span>
      ))}
    </p>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TeacherPrototype() {
  const [phase, setPhase] = useState('upload') // upload | processing | lesson | done
  const [imageBase64, setImageBase64] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [lesson, setLesson] = useState(null) // { sections: [{title, content, example}], challenge }
  const [sectionIndex, setSectionIndex] = useState(0)
  const [numioState, setNumioState] = useState('idle')
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [words, setWords] = useState([])
  const [subPhase, setSubPhase] = useState('reading') // reading | asking | listening | responding | challenge
  const [transcript, setTranscript] = useState('')
  const [numioReply, setNumioReply] = useState('')
  const [error, setError] = useState(null)
  const [processingMsg, setProcessingMsg] = useState('Reading your page...')

  const utteranceRef = useRef(null)
  const recognitionRef = useRef(null)
  const isSpeakingRef = useRef(false)
  const fileInputRef = useRef(null)

  // ── Speech helpers ──
  const speak = useCallback((text, onEnd) => {
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate = 0.95
    utter.pitch = 1.05
    utter.lang = 'en-US'

    const w = text.split(' ')
    setWords(w)
    setHighlightIndex(-1)
    let wordIdx = 0

    utter.onboundary = (e) => {
      if (e.name === 'word') {
        setHighlightIndex(wordIdx)
        wordIdx++
      }
    }
    utter.onstart = () => { isSpeakingRef.current = true; setNumioState('talking') }
    utter.onend = () => {
      isSpeakingRef.current = false
      setHighlightIndex(-1)
      setNumioState('idle')
      onEnd?.()
    }
    utter.onerror = () => { isSpeakingRef.current = false; setNumioState('idle'); onEnd?.() }
    utteranceRef.current = utter
    window.speechSynthesis.speak(utter)
  }, [])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel()
    isSpeakingRef.current = false
    setNumioState('idle')
    setHighlightIndex(-1)
  }, [])

  const startListening = useCallback((onResult) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { onResult('I understand'); return }
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (e) => { onResult(e.results[0][0].transcript) }
    rec.onerror = () => { onResult('I understand') }
    rec.onend = () => {}
    recognitionRef.current = rec
    rec.start()
    setNumioState('listening')
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setNumioState('idle')
  }, [])

  // ── Image upload ──
  function handleImage(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target.result)
      const base64 = e.target.result.split(',')[1]
      setImageBase64(base64)
    }
    reader.readAsDataURL(file)
  }

  // ── Build lesson from image ──
  async function buildLesson() {
    if (!imageBase64) return
    setPhase('processing')
    setError(null)

    try {
      setProcessingMsg('Reading your page...')

      const transcriptRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
              { type: 'text', text: 'Transcribe all the text from this textbook page exactly as written. Return only the raw text, nothing else.' }
            ]
          }]
        })
      })
      const transcriptData = await transcriptRes.json()
      const rawText = transcriptData.content[0].text

      setProcessingMsg('Building your lesson...')

      const lessonRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: `You are Numio, a friendly AI tutor for kids aged 8-14. 
            
Take this textbook content and create a 5-minute spoken lesson. The lesson must:
- Be split into exactly 3-4 sections
- Each section takes about 60-90 seconds to read aloud
- Use simple language any kid can understand
- Include a real-world example in each section
- End with one short challenge question

Return ONLY valid JSON in this exact format, no markdown, no backticks:
{
  "sections": [
    {
      "title": "Section title",
      "content": "What Numio says to teach this part. Write it as if speaking directly to the kid. Keep it conversational, warm, and simple. About 80-100 words.",
      "example": "A simple real-world example to make it click."
    }
  ],
  "challenge": "One short question to test understanding of the whole lesson."
}

Textbook content:
${rawText}`
          }]
        })
      })

      const lessonData = await lessonRes.json()
      let lessonText = lessonData.content[0].text.trim()
      lessonText = lessonText.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(lessonText)
      setLesson(parsed)
      setPhase('lesson')
      setSectionIndex(0)
      setSubPhase('reading')
    } catch (e) {
      console.error(e)
      setError('Something went wrong. Check your image and try again.')
      setPhase('upload')
    }
  }

  // ── Lesson flow ──
  useEffect(() => {
    if (phase !== 'lesson' || !lesson) return
    const section = lesson.sections[sectionIndex]
    if (!section) return

    if (subPhase === 'reading') {
      setNumioReply('')
      setTranscript('')
      const fullText = `${section.content} For example: ${section.example}`
      speak(fullText, () => {
        setSubPhase('asking')
      })
    }

    if (subPhase === 'asking') {
      speak('Did you get that? Tell me in your own words, or just say yes if you understood!', () => {
        setSubPhase('listening')
      })
    }

    if (subPhase === 'listening') {
      startListening((result) => {
        setTranscript(result)
        setSubPhase('responding')
      })
    }

    if (subPhase === 'challenge') {
      speak(lesson.challenge, () => {
        startListening((result) => {
          setTranscript(result)
          setNumioState('celebrate')
          setTimeout(() => {
            speak("Amazing work! You just completed a full lesson. I'm proud of you!", () => {
              setPhase('done')
            })
          }, 500)
        })
      })
    }
  }, [phase, subPhase, sectionIndex, lesson])

  useEffect(() => {
    if (subPhase !== 'responding' || !transcript) return

    const section = lesson.sections[sectionIndex]
    setNumioState('thinking')

    const isLastSection = sectionIndex === lesson.sections.length - 1

    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: `You are Numio, a warm friendly tutor for kids. The kid just said: "${transcript}"
          
The section was about: "${section.title}"

Reply in 1-2 short encouraging sentences. If they understood, validate and get them excited for the next part. If they seem confused, give one simple clarification. Keep it under 40 words. Speak directly to the kid.`
        }]
      })
    })
      .then(r => r.json())
      .then(d => {
        const reply = d.content[0].text
        setNumioReply(reply)
        speak(reply, () => {
          if (isLastSection) {
            setSubPhase('challenge')
          } else {
            setSectionIndex(i => i + 1)
            setSubPhase('reading')
          }
        })
      })
      .catch(() => {
        const fallback = isLastSection ? "Great job! Let's do the final challenge!" : "Awesome! Let's keep going!"
        setNumioReply(fallback)
        speak(fallback, () => {
          if (isLastSection) setSubPhase('challenge')
          else { setSectionIndex(i => i + 1); setSubPhase('reading') }
        })
      })
  }, [subPhase, transcript])

  // ── Interrupt handler ──
  function handleInterrupt() {
    stopSpeaking()
    stopListening()
    setSubPhase('listening')
    speak("Sure! What's your question?", () => {
      startListening((result) => {
        setTranscript(result)
        setSubPhase('responding')
      })
    })
  }

  // ── UI ──
  const section = lesson?.sections?.[sectionIndex]

  return (
    <div style={{ minHeight: '100dvh', background: '#f8f7ff', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, alignSelf: 'flex-start' }}>
        <div style={{ width: 36, height: 36, background: '#7c3aed', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 18 }}>🌸</span>
        </div>
        <span style={{ fontWeight: 700, fontSize: 18, color: '#1a1a2e' }}>Numio Teacher</span>
        <span style={{ fontSize: 11, background: '#ede9fe', color: '#7c3aed', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>PROTOTYPE</span>
      </div>

      {/* ── Upload phase ── */}
      {phase === 'upload' && (
        <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <NumioFace state="idle" />
          <p style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', textAlign: 'center', margin: 0 }}>
            Hi! I'm Numio 👋<br />Show me your textbook page
          </p>

          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%', border: '2px dashed #c4b5fd', borderRadius: 16,
              padding: '32px 24px', textAlign: 'center', cursor: 'pointer',
              background: imagePreview ? '#fff' : '#faf5ff',
              transition: 'background 0.2s',
            }}
          >
            {imagePreview
              ? <img src={imagePreview} alt="preview" style={{ width: '100%', borderRadius: 8, maxHeight: 280, objectFit: 'contain' }} />
              : <>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
                <p style={{ margin: 0, color: '#7c3aed', fontWeight: 600 }}>Tap to upload a photo</p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>Any textbook page works</p>
              </>
            }
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
            onChange={e => handleImage(e.target.files[0])} />

          {error && <p style={{ color: '#ef4444', fontSize: 14, textAlign: 'center', margin: 0 }}>{error}</p>}

          {imagePreview && (
            <button onClick={buildLesson} style={{
              width: '100%', padding: '14px', background: '#7c3aed', color: 'white',
              border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer',
            }}>
              Start lesson ✨
            </button>
          )}
        </div>
      )}

      {/* ── Processing phase ── */}
      {phase === 'processing' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, marginTop: 40 }}>
          <NumioFace state="thinking" />
          <p style={{ fontSize: 18, fontWeight: 600, color: '#1a1a2e', textAlign: 'center' }}>{processingMsg}</p>
          <div style={{ width: 48, height: 48, border: '4px solid #ede9fe', borderTop: '4px solid #7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* ── Lesson phase ── */}
      {phase === 'lesson' && lesson && section && (
        <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Progress */}
          <div style={{ display: 'flex', gap: 6 }}>
            {lesson.sections.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= sectionIndex ? '#7c3aed' : '#e9d5ff', transition: 'background 0.3s' }} />
            ))}
          </div>

          {/* Numio */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <NumioFace state={numioState} />
            <div style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
              {subPhase === 'reading' && 'Teaching...'}
              {subPhase === 'asking' && 'Checking in...'}
              {subPhase === 'listening' && '🎙 Listening...'}
              {subPhase === 'responding' && 'Thinking...'}
              {subPhase === 'challenge' && '⚡ Challenge!'}
            </div>
          </div>

          {/* Section title */}
          <div style={{ background: '#7c3aed', borderRadius: 12, padding: '10px 16px' }}>
            <p style={{ margin: 0, color: 'white', fontWeight: 700, fontSize: 15 }}>
              Section {sectionIndex + 1} — {section.title}
            </p>
          </div>

          {/* Text with highlight */}
          <div style={{ background: 'white', borderRadius: 16, padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <HighlightedText
              text={`${section.content} For example: ${section.example}`}
              highlightIndex={highlightIndex}
              words={words}
            />
          </div>

          {/* Kid transcript */}
          {transcript && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 16px' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#15803d', fontWeight: 500 }}>You said: "{transcript}"</p>
            </div>
          )}

          {/* Numio reply */}
          {numioReply && (
            <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 12, padding: '12px 16px' }}>
              <p style={{ margin: 0, fontSize: 14, color: '#6d28d9' }}>💬 {numioReply}</p>
            </div>
          )}

          {/* Interrupt button */}
          {(subPhase === 'reading' || subPhase === 'asking') && (
            <button onClick={handleInterrupt} style={{
              width: '100%', padding: '12px', background: 'white',
              border: '1.5px solid #c4b5fd', borderRadius: 14,
              fontSize: 15, fontWeight: 600, color: '#7c3aed', cursor: 'pointer',
            }}>
              ✋ Wait, I have a question
            </button>
          )}
        </div>
      )}

      {/* ── Done phase ── */}
      {phase === 'done' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, marginTop: 32, textAlign: 'center' }}>
          <NumioFace state="celebrate" />
          <p style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', margin: 0 }}>Lesson complete! 🎉</p>
          <p style={{ fontSize: 15, color: '#6b7280', margin: 0 }}>You just learned something new. Keep it up!</p>
          <button onClick={() => {
            setPhase('upload')
            setImageBase64(null)
            setImagePreview(null)
            setLesson(null)
            setSectionIndex(0)
            setSubPhase('reading')
            setTranscript('')
            setNumioReply('')
            setWords([])
            setHighlightIndex(-1)
            stopSpeaking()
          }} style={{
            padding: '14px 32px', background: '#7c3aed', color: 'white',
            border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer',
          }}>
            Learn another page 📚
          </button>
        </div>
      )}
    </div>
  )
}
