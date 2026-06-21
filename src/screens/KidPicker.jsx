import { useEffect, useState } from 'react'
import { listKidsForParent } from '../lib/parentAuth'

const AVATAR_COLORS = ['#FF9600', '#9B59B6', '#E74C3C', '#00B4D8', '#58cc02', '#1CB0F6']

function avatarColorFor(kidId) {
  let hash = 0
  for (let i = 0; i < kidId.length; i++) hash = (hash * 31 + kidId.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function PlusIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function LogOutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  )
}

function KidAvatar({ kid }) {
  const initial = kid.name?.trim()?.[0]?.toUpperCase() || '?'
  return (
    <div
      className="w-full aspect-square rounded-3xl flex items-center justify-center"
      style={{ backgroundColor: avatarColorFor(kid.id) }}
    >
      <span className="font-display font-extrabold text-5xl text-white">{initial}</span>
    </div>
  )
}

export default function KidPicker({ parentId, onSelectKid, onCreateKid, onLogOut }) {
  const [kids, setKids] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    listKidsForParent(parentId)
      .then(data => { if (!cancelled) setKids(data) })
      .catch(err => {
        console.error('Failed to load kid profiles:', err)
        if (!cancelled) setError(err)
      })
    return () => { cancelled = true }
  }, [parentId])

  if (kids === null && !error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="font-body text-gray-400">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6 text-center">
        <p className="font-body text-gray-500">
          Couldn't load profiles. Check your Supabase connection and .env file.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex justify-end px-4 pt-5">
        <button
          onClick={onLogOut}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-gray-400 font-body font-bold text-xs
                     transition-colors active:bg-gray-100"
        >
          <LogOutIcon />
          LOG OUT
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <h1 className="font-display font-bold text-3xl text-gray-900 text-center mb-8">
            Who's playing?
          </h1>

          <div className="grid grid-cols-3 gap-4">
            {kids.map(kid => (
              <button
                key={kid.id}
                onClick={() => onSelectKid(kid.id)}
                className="flex flex-col items-center gap-2 transition-transform active:scale-95"
              >
                <KidAvatar kid={kid} />
                <span className="font-body font-bold text-sm text-gray-700 truncate w-full text-center">
                  {kid.name}
                </span>
              </button>
            ))}

            <button
              onClick={onCreateKid}
              className="flex flex-col items-center gap-2 transition-transform active:scale-95"
            >
              <div className="w-full aspect-square rounded-3xl flex items-center justify-center border-2 border-dashed border-gray-300 text-gray-400">
                <PlusIcon />
              </div>
              <span className="font-body font-bold text-sm text-gray-400 text-center">Add kid</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
