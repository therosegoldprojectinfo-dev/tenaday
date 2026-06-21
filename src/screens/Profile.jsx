/** Placeholder — real content (kid name display, progress summary, parent
 *  dashboard access per spec §10) comes in a later build phase along with
 *  the PIN login / kid-profile system. This just establishes the nav
 *  destination exists and reads as "coming soon," not broken. */
export default function Profile() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 gap-4 text-center">
      <img
        src="/nav-icons/profile-flower.png"
        alt=""
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        className="w-20 h-20 object-contain select-none pointer-events-none"
      />
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-900 mb-1">Profile</h1>
        <p className="font-body text-sm text-gray-400 max-w-xs">
          Coming soon — your name, your progress, and your stats will all live here.
        </p>
      </div>
    </div>
  )
}
