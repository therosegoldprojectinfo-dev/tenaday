import { useState } from 'react'

const SLIDES = [
  {
    img: '/ob-slide1.png',
    dotColor: '#58cc02',
    isLast: false,
  },
  {
    img: '/ob-slide2.png',
    dotColor: '#FFB700',
    isLast: false,
  },
  {
    img: '/ob-slide3.png',
    dotColor: '#ef4444',
    isLast: false,
  },
  {
    img: '/ob-slide4.png',
    dotColor: '#1CB0F6',
    isLast: true,
  },
]

export default function Onboarding({ onDone }) {
  const [current, setCurrent] = useState(0)
  const [sliding, setSliding] = useState(false)

  const slide = SLIDES[current]

  function handleNext() {
    if (sliding) return
    if (slide.isLast) { onDone(); return }
    setSliding(true)
    setTimeout(() => {
      setCurrent(c => c + 1)
      setSliding(false)
    }, 220)
  }

  return (
    <div
      className="min-h-screen bg-white flex flex-col items-center justify-center"
      style={{ transition: 'opacity 0.2s ease', opacity: sliding ? 0 : 1 }}
    >
      {/* Slide image — fills most of the screen */}
      <div className="flex-1 flex items-center justify-center w-full max-w-sm px-4 pt-6">
        <img
          key={current}
          src={slide.img}
          alt={`Onboarding slide ${current + 1}`}
          className="w-full object-contain"
          style={{
            maxHeight: 'calc(100vh - 180px)',
            borderRadius: 24,
            animation: 'slideIn 0.3s ease forwards',
          }}
          draggable={false}
        />
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-5 mb-4">
        {SLIDES.map((s, i) => (
          <div key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === current ? 24 : 8,
              height: 8,
              backgroundColor: i === current ? slide.dotColor : '#E5E7EB',
            }}
          />
        ))}
      </div>

      {/* Button */}
      <div className="w-full max-w-sm px-6 pb-10">
        <button
          onClick={handleNext}
          className="w-full py-4 rounded-2xl font-body font-bold text-lg tracking-widest text-white transition-all active:scale-95"
          style={{
            backgroundColor: '#58cc02',
            boxShadow: '0 4px 0 0 #46a302',
          }}
        >
          {slide.isLast ? 'GET STARTED →' : 'CONTINUE →'}
        </button>
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
