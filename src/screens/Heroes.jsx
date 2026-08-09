import { useState } from 'react'
import { useLang } from '../lib/LangContext'

const LEVELS = [
  { id: 'wood',     days: 7,   label: 'Wood Hero',     labelAr: 'بطل الخشب',     badge: '/badge-wood.png',     color: '#c8894a', bg: '#fdf3e7' },
  { id: 'silver',   days: 14,  label: 'Silver Hero',   labelAr: 'البطل الفضي',   badge: '/badge-silver.png',   color: '#9ba8b5', bg: '#f0f2f5' },
  { id: 'gold',     days: 30,  label: 'Gold Hero',     labelAr: 'البطل الذهبي',  badge: '/badge-gold.png',     color: '#f5a623', bg: '#fffbeb' },
  { id: 'platinum', days: 60,  label: 'Platinum Hero', labelAr: 'البطل البلاتيني', badge: '/badge-platinum.png', color: '#7b9cc4', bg: '#eff6ff' },
  { id: 'diamond',  days: 100, label: 'Diamond Hero',  labelAr: 'البطل الماسي',  badge: '/badge-diamond.png',  color: '#38b2f8', bg: '#e0f2fe' },
  { id: 'legend',   days: 300, label: 'Numio Legend',  labelAr: 'أسطورة Numio',  badge: '/badge-legend.png',   color: '#e879a0', bg: '#fdf2f8' },
]

function getLevelIndex(totalDays) {
  let idx = -1
  for (let i = 0; i < LEVELS.length; i++) {
    if (totalDays >= LEVELS[i].days) idx = i
  }
  return idx
}

// Placeholder leaderboard data
const PLACEHOLDER_HEROES = {
  wood:     [
    { name: 'Emma',   country: '🇨🇦', days: 9,  points: 320 },
    { name: 'Adam',   country: '🇲🇦', days: 8,  points: 280 },
    { name: 'Lina',   country: '🇸🇦', days: 7,  points: 240 },
    { name: 'Noah',   country: '🇫🇷', days: 7,  points: 210 },
  ],
  silver:   [
    { name: 'Sara',   country: '🇸🇦', days: 20, points: 780 },
    { name: 'Yusuf',  country: '🇦🇪', days: 17, points: 650 },
    { name: 'Chloe',  country: '🇨🇦', days: 15, points: 590 },
  ],
  gold:     [
    { name: 'Oliver', country: '🇦🇺', days: 41, points: 1590 },
    { name: 'Fatima', country: '🇲🇦', days: 35, points: 1340 },
    { name: 'Lucas',  country: '🇧🇷', days: 30, points: 1180 },
  ],
  platinum: [
    { name: 'Amir',   country: '🇸🇦', days: 72, points: 2800 },
    { name: 'Lea',    country: '🇫🇷', days: 65, points: 2450 },
  ],
  diamond:  [
    { name: 'Mia',    country: '🇺🇸', days: 120, points: 4800 },
    { name: 'Khalid', country: '🇸🇦', days: 105, points: 4100 },
  ],
  legend:   [
    { name: 'Zara',   country: '🇬🇧', days: 310, points: 12400 },
  ],
}

function BadgeModal({ level, earned, daysLeft, onClose, lang }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(10,10,20,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col items-center gap-4 text-center">
        <img src={level.badge} alt={level.label}
          className="w-32 h-auto"
          style={{ filter: earned ? 'none' : 'grayscale(1) opacity(0.4)' }} />
        <div>
          <p className="font-display font-extrabold text-2xl text-ink">{lang === 'ar' ? level.labelAr : level.label}</p>
          {earned ? (
            <p className="font-body text-sm mt-1" style={{ color: level.color }}>
              {lang === 'ar' ? 'لقد حصلت على هذا الشارة!' : 'You earned this badge!'}
            </p>
          ) : (
            <p className="font-body text-sm text-muted mt-1">
              {lang === 'ar'
                ? `${daysLeft} يوم متبقٍ للحصول على هذه الشارة`
                : `${daysLeft} more days to unlock this badge`}
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

export default function Heroes({ totalDays = 5, onBack }) {
  const lang = useLang()
  const [tab, setTab] = useState('leaderboard')
  const [selectedBadge, setSelectedBadge] = useState(null)
  const [leaderboardLevel, setLeaderboardLevel] = useState('wood')

  const currentLevelIdx = getLevelIndex(totalDays)
  const currentLevel    = currentLevelIdx >= 0 ? LEVELS[currentLevelIdx] : null
  const nextLevel       = LEVELS[currentLevelIdx + 1] || null
  const daysToNext      = nextLevel ? nextLevel.days - totalDays : 0
  const progressPct     = nextLevel
    ? ((totalDays - (currentLevel?.days ?? 0)) / (nextLevel.days - (currentLevel?.days ?? 0))) * 100
    : 100

  return (
    <div className="bg-white flex flex-col" style={{ height: '100dvh' }}>
      <div className="flex-1 overflow-y-auto pb-10">
        <div className="w-full max-w-lg mx-auto px-5">

          {/* Back */}
          <button onClick={onBack} className="flex items-center gap-1 text-muted font-body font-bold text-sm mt-12 mb-6 active:opacity-60">
            ← {lang === 'ar' ? 'رجوع' : 'Back'}
          </button>

          {/* Header */}
          <div className="mb-6">
            <h1 className="font-display font-extrabold text-3xl text-ink">
              {lang === 'ar' ? 'أبطال Numio' : 'Numio Heroes'}
            </h1>
            <p className="font-body text-sm text-muted mt-1">
              {lang === 'ar' ? 'تعلّم يومياً وكن بطلاً!' : 'Learn daily and become a hero!'}
            </p>
          </div>

          {/* Progress card — next level */}
          <div className="rounded-3xl p-5 mb-6"
            style={{ background: nextLevel ? nextLevel.bg : '#f5f3ff', boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
            <div className="flex items-center gap-4 mb-4">
              <img src={nextLevel ? nextLevel.badge : LEVELS[0].badge} alt=""
                className="w-16 h-auto flex-shrink-0"
                style={{ filter: nextLevel ? 'none' : 'none' }} />
              <div className="flex-1 min-w-0">
                <p className="font-body text-xs font-bold uppercase tracking-widest text-muted mb-0.5">
                  {lang === 'ar' ? 'المستوى التالي' : 'Next level'}
                </p>
                <p className="font-display font-extrabold text-xl text-ink">
                  {nextLevel ? (lang === 'ar' ? nextLevel.labelAr : nextLevel.label) : (lang === 'ar' ? 'أسطورة Numio' : 'Numio Legend')}
                </p>
                {nextLevel && (
                  <p className="font-body text-sm mt-0.5" style={{ color: nextLevel.color }}>
                    {lang === 'ar' ? `${daysToNext} يوم متبقٍ` : `${daysToNext} days to go`}
                  </p>
                )}
                {!nextLevel && (
                  <p className="font-body text-sm mt-0.5" style={{ color: '#e879a0' }}>
                    {lang === 'ar' ? 'لقد وصلت للقمة!' : 'You reached the top!'}
                  </p>
                )}
              </div>
            </div>

            {/* Progress bar */}
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
              { id: 'badges',      label: lang === 'ar' ? 'شاراتي' : 'My Badges'  },
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

          {/* ── LEADERBOARD TAB ── */}
          {tab === 'leaderboard' && (
            <div>
              {/* Level selector */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                {LEVELS.map(lvl => (
                  <button key={lvl.id} onClick={() => setLeaderboardLevel(lvl.id)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-body font-bold text-xs transition-all active:scale-95"
                    style={{
                      background: leaderboardLevel === lvl.id ? lvl.color : '#f3f4f6',
                      color: leaderboardLevel === lvl.id ? 'white' : '#AFAFAF',
                    }}>
                    <img src={lvl.badge} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                    {lang === 'ar' ? lvl.labelAr : lvl.label}
                  </button>
                ))}
              </div>

              {/* Hero cards */}
              <div className="flex flex-col gap-3">
                {(PLACEHOLDER_HEROES[leaderboardLevel] || []).map((hero, i) => {
                  const lvl = LEVELS.find(l => l.id === leaderboardLevel)
                  return (
                    <div key={i} className="flex items-center gap-4 rounded-2xl px-4 py-3"
                      style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                      {/* Rank */}
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center font-display font-extrabold text-sm flex-shrink-0"
                        style={{ background: i === 0 ? '#fef9c3' : i === 1 ? '#f3f4f6' : '#fdf3e7', color: i === 0 ? '#ca8a04' : i === 1 ? '#6b7280' : '#c8894a' }}>
                        {i + 1}
                      </div>
                      {/* Badge */}
                      <img src={lvl.badge} alt="" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-base text-ink">
                          {hero.country} {hero.name}
                        </p>
                        <p className="font-body text-xs text-muted">
                          {hero.days} {lang === 'ar' ? 'يوم' : 'days'} · {hero.points} {lang === 'ar' ? 'نقطة' : 'pts'}
                        </p>
                      </div>
                      {/* Hero badge */}
                      <span className="font-display font-bold text-xs px-2 py-1 rounded-lg flex-shrink-0"
                        style={{ background: lvl.bg, color: lvl.color }}>
                        🦸
                      </span>
                    </div>
                  )
                })}
              </div>

              <p className="text-center font-body text-xs text-muted mt-4 px-4">
                {lang === 'ar' ? '🚧 قادم قريباً: بيانات حقيقية من أطفال حول العالم!' : '🚧 Coming soon: real data from kids around the world!'}
              </p>
            </div>
          )}

          {/* ── BADGES TAB ── */}
          {tab === 'badges' && (
            <div className="grid grid-cols-3 gap-4">
              {LEVELS.map(lvl => {
                const earned   = totalDays >= lvl.days
                const daysLeft = Math.max(0, lvl.days - totalDays)
                return (
                  <button key={lvl.id} onClick={() => setSelectedBadge({ level: lvl, earned, daysLeft })}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all active:scale-95"
                    style={{ background: earned ? lvl.bg : '#f9fafb', boxShadow: earned ? `0 4px 16px ${lvl.color}22` : '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <img src={lvl.badge} alt={lvl.label}
                      className="w-16 h-auto"
                      style={{ filter: earned ? 'none' : 'grayscale(1) opacity(0.35)' }} />
                    <p className="font-display font-bold text-xs text-center leading-tight"
                      style={{ color: earned ? lvl.color : '#AFAFAF' }}>
                      {lang === 'ar' ? lvl.labelAr : lvl.label}
                    </p>
                    {earned ? (
                      <span className="text-xs font-bold" style={{ color: lvl.color }}>✓</span>
                    ) : (
                      <span className="font-body text-xs text-muted">{daysLeft}d left</span>
                    )}
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
