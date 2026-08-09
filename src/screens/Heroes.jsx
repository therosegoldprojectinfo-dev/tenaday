import { useState, useEffect } from 'react'
import { useLang } from '../lib/LangContext'
import { supabase } from '../lib/supabaseClient'

const LEVELS = [
  { id: 'wood',     days: 7,   label: 'Wood Star',     labelAr: 'نجمة الخشب',      badge: '/badge-wood.png',     color: '#c8894a', bg: '#fdf3e7' },
  { id: 'silver',   days: 14,  label: 'Silver Star',   labelAr: 'النجمة الفضية',   badge: '/badge-silver.png',   color: '#9ba8b5', bg: '#f0f2f5' },
  { id: 'gold',     days: 30,  label: 'Gold Star',     labelAr: 'النجمة الذهبية',  badge: '/badge-gold.png',     color: '#f5a623', bg: '#fffbeb' },
  { id: 'platinum', days: 60,  label: 'Platinum Star', labelAr: 'النجمة البلاتينية', badge: '/badge-platinum.png', color: '#7b9cc4', bg: '#eff6ff' },
  { id: 'diamond',  days: 100, label: 'Diamond Star',  labelAr: 'النجمة الماسية',  badge: '/badge-diamond.png',  color: '#38b2f8', bg: '#e0f2fe' },
  { id: 'legend',   days: 300, label: 'Numio Legend',  labelAr: 'أسطورة Numio',    badge: '/badge-legend.png',   color: '#e879a0', bg: '#fdf2f8' },
]

function getLevelIndex(totalDays) {
  let idx = -1
  for (let i = 0; i < LEVELS.length; i++) {
    if (totalDays >= LEVELS[i].days) idx = i
  }
  return idx
}

function BadgeModal({ level, earned, daysLeft, onClose, lang }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(10,10,20,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col items-center gap-4 text-center">
        <img src={level.badge} alt={level.label} className="w-32 h-auto"
          style={{ filter: earned ? 'none' : 'grayscale(1) opacity(0.4)' }} />
        <div>
          <p className="font-display font-extrabold text-2xl text-ink">{lang === 'ar' ? level.labelAr : level.label}</p>
          {earned ? (
            <p className="font-body text-sm mt-1" style={{ color: level.color }}>
              {lang === 'ar' ? 'لقد حصلت على هذه الشارة!' : 'You earned this badge!'}
            </p>
          ) : (
            <p className="font-body text-sm text-muted mt-1">
              {lang === 'ar' ? `${daysLeft} يوم متبقٍ` : `${daysLeft} more days to unlock`}
            </p>
          )}
          <p className="font-body text-xs text-muted mt-2">
            {lang === 'ar' ? `يتطلب ${level.days} يوماً` : `Requires ${level.days} days`}
          </p>
        </div>
        <button onClick={onClose}
          className="w-full py-3 rounded-2xl font-display font-bold text-base text-white transition-all active:scale-95"
          style={{ background: '#7c3aed', boxShadow: '0 3px 0 #5b21b6' }}>
          {lang === 'ar' ? 'حسناً' : 'Got it'}
        </button>
      </div>
    </div>
  )
}

function HeroCard({ hero, rank, lvl }) {
  const rankBg    = rank === 1 ? '#fef9c3' : rank === 2 ? '#f0f2f5' : '#fdf3e7'
  const rankColor = rank === 1 ? '#ca8a04' : rank === 2 ? '#6b7280' : '#c8894a'

  return (
    <div className="flex items-center gap-4 rounded-2xl px-4 py-3"
      style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      {/* Rank */}
      <div className="w-8 h-8 rounded-xl flex items-center justify-center font-display font-extrabold text-sm flex-shrink-0"
        style={{ background: rankBg, color: rankColor }}>
        {rank}
      </div>
      {/* Badge */}
      <img src={lvl.badge} alt="" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-base text-ink truncate">
          {hero.country_flag} {hero.display_name}
        </p>
        <p className="font-body text-xs text-muted">
          {hero.total_days} days · {hero.total_points} pts
        </p>
      </div>
    </div>
  )
}

export default function Heroes({ totalDays = 0, onBack }) {
  const lang = useLang()
  const [tab,              setTab]              = useState('leaderboard')
  const [selectedBadge,   setSelectedBadge]    = useState(null)
  const [leaderboardLevel, setLeaderboardLevel] = useState('wood')
  const [heroes,           setHeroes]           = useState([])
  const [loadingHeroes,   setLoadingHeroes]    = useState(false)

  const currentLevelIdx = getLevelIndex(totalDays)
  const currentLevel    = currentLevelIdx >= 0 ? LEVELS[currentLevelIdx] : null
  const nextLevel       = LEVELS[currentLevelIdx + 1] || null
  const daysToNext      = nextLevel ? nextLevel.days - totalDays : 0
  const progressPct     = nextLevel
    ? ((totalDays - (currentLevel?.days ?? 0)) / (nextLevel.days - (currentLevel?.days ?? 0))) * 100
    : 100

  useEffect(() => {
    if (tab === 'leaderboard') fetchHeroes(leaderboardLevel)
  }, [leaderboardLevel, tab])

  async function fetchHeroes(level) {
    setLoadingHeroes(true)
    try {
      const { data, error } = await supabase
        .from('heroes_leaderboard')
        .select('display_name, country_flag, total_days, total_points, rank_in_level')
        .eq('hero_level', level)
        .lte('rank_in_level', 50)
        .order('rank_in_level', { ascending: true })

      if (error) throw error
      setHeroes(data || [])
    } catch (e) {
      console.error('Failed to fetch heroes:', e)
      setHeroes([])
    } finally {
      setLoadingHeroes(false)
    }
  }

  const lvl = LEVELS.find(l => l.id === leaderboardLevel)

  return (
    <div className="bg-white flex flex-col" style={{ height: '100dvh' }}>
      <div className="flex-1 overflow-y-auto pb-10">
        <div className="w-full max-w-lg mx-auto px-5">

          {/* Back */}
          <button onClick={onBack} className="flex items-center gap-1 text-muted font-body font-bold text-sm mt-12 mb-6 active:opacity-60">
            {lang === 'ar' ? 'رجوع →' : '← Back'}
          </button>

          {/* Header */}
          <div className="mb-6">
            <h1 className="font-display font-extrabold text-3xl text-ink">
              {lang === 'ar' ? 'نجوم Numio' : 'Numio Stars'}
            </h1>
            <p className="font-body text-sm text-muted mt-1">
              {lang === 'ar' ? 'تعلّم يومياً واحصل على نجمتك!' : 'Learn daily and earn your star!'}
            </p>
          </div>

          {/* Progress card */}
          <div className="rounded-3xl p-5 mb-6"
            style={{ background: nextLevel ? nextLevel.bg : LEVELS[LEVELS.length - 1].bg, boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
            <div className="flex items-center gap-4 mb-4">
              <img src={nextLevel ? nextLevel.badge : LEVELS[LEVELS.length - 1].badge} alt=""
                className="w-16 h-auto flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-body text-xs font-bold uppercase tracking-widest text-muted mb-0.5">
                  {lang === 'ar' ? 'المستوى التالي' : 'Next level'}
                </p>
                <p className="font-display font-extrabold text-xl text-ink">
                  {nextLevel
                    ? (lang === 'ar' ? nextLevel.labelAr : nextLevel.label)
                    : (lang === 'ar' ? 'أسطورة Numio' : 'Numio Legend')}
                </p>
                {nextLevel ? (
                  <p className="font-body text-sm mt-0.5" style={{ color: nextLevel.color }}>
                    {lang === 'ar' ? `${daysToNext} يوم متبقٍ` : `${daysToNext} days to go`}
                  </p>
                ) : (
                  <p className="font-body text-sm mt-0.5" style={{ color: '#e879a0' }}>
                    {lang === 'ar' ? 'لقد وصلت للقمة!' : 'You reached the top!'}
                  </p>
                )}
              </div>
            </div>
            {nextLevel && (
              <div>
                <div className="flex justify-between font-body text-xs text-muted mb-1">
                  <span>{totalDays} {lang === 'ar' ? 'يوم' : 'days'}</span>
                  <span>{nextLevel.days} {lang === 'ar' ? 'يوم' : 'days'}</span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(progressPct, 100)}%`, background: nextLevel.color }} />
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-5 p-1 rounded-2xl" style={{ background: '#f5f3ff' }}>
            {[
              { id: 'leaderboard', label: lang === 'ar' ? 'المتصدرون' : 'Leaderboard' },
              { id: 'badges',      label: lang === 'ar' ? 'شاراتي'    : 'My Badges'   },
            ].map(({ id, label }) => (
              <button key={id} onClick={() => setTab(id)}
                className="flex-1 py-2.5 rounded-xl font-display font-bold text-sm transition-all"
                style={{
                  background: tab === id ? '#7c3aed' : 'transparent',
                  color: tab === id ? 'white' : '#AFAFAF',
                  boxShadow: tab === id ? '0 2px 8px rgba(124,58,237,0.3)' : 'none',
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* ── LEADERBOARD ── */}
          {tab === 'leaderboard' && (
            <div>
              {/* Level selector */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                {LEVELS.map(l => (
                  <button key={l.id} onClick={() => setLeaderboardLevel(l.id)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-body font-bold text-xs transition-all active:scale-95"
                    style={{
                      background: leaderboardLevel === l.id ? l.color : '#f3f4f6',
                      color: leaderboardLevel === l.id ? 'white' : '#AFAFAF',
                    }}>
                    <img src={l.badge} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                    {lang === 'ar' ? l.labelAr : l.label}
                  </button>
                ))}
              </div>

              {loadingHeroes ? (
                <div className="flex justify-center py-12">
                  <div className="w-10 h-10 rounded-full border-4 border-gray-100 animate-spin" style={{ borderTopColor: '#7c3aed' }} />
                </div>
              ) : heroes.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-16 text-center">
                  <img src={lvl.badge} alt="" className="w-20 h-auto" style={{ filter: 'grayscale(0.3) opacity(0.5)' }} />
                  <p className="font-display font-bold text-lg text-ink">
                    {lang === 'ar' ? 'لا يوجد أبطال بعد' : 'No stars yet'}
                  </p>
                  <p className="font-body text-sm text-muted max-w-xs">
                    {lang === 'ar'
                      ? 'كن أول من يصل لهذا المستوى!'
                      : 'Be the first to reach this level!'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {heroes.map((hero, i) => (
                    <HeroCard key={i} hero={hero} rank={hero.rank_in_level} lvl={lvl} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── BADGES ── */}
          {tab === 'badges' && (
            <div className="grid grid-cols-3 gap-4">
              {LEVELS.map(l => {
                const earned   = totalDays >= l.days
                const daysLeft = Math.max(0, l.days - totalDays)
                return (
                  <button key={l.id} onClick={() => setSelectedBadge({ level: l, earned, daysLeft })}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all active:scale-95"
                    style={{
                      background: earned ? l.bg : '#f9fafb',
                      boxShadow: earned ? `0 4px 16px ${l.color}22` : '0 2px 8px rgba(0,0,0,0.05)',
                    }}>
                    <img src={l.badge} alt={l.label} className="w-16 h-auto"
                      style={{ filter: earned ? 'none' : 'grayscale(1) opacity(0.35)' }} />
                    <p className="font-display font-bold text-xs text-center leading-tight"
                      style={{ color: earned ? l.color : '#AFAFAF' }}>
                      {lang === 'ar' ? l.labelAr : l.label}
                    </p>
                    {earned
                      ? <span className="font-bold text-xs" style={{ color: l.color }}>✓</span>
                      : <span className="font-body text-xs text-muted">{daysLeft}d left</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {selectedBadge && (
        <BadgeModal
          level={selectedBadge.level}
          earned={selectedBadge.earned}
          daysLeft={selectedBadge.daysLeft}
          lang={lang}
          onClose={() => setSelectedBadge(null)}
        />
      )}
    </div>
  )
}
