import type { ReactNode } from "react"

export function VoxelGameEnvironment({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] bg-sky-400 px-3 py-8 sm:px-6 sm:py-12" data-voxel-game-environment>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-5 left-[8%] h-10 w-32 bg-sky-100/80 shadow-[32px_10px_0_0_rgb(224_242_254_/_0.8)]" />
        <div className="absolute top-8 right-[12%] h-8 w-24 bg-sky-100/80 shadow-[24px_8px_0_0_rgb(224_242_254_/_0.8)]" />
        <div className="absolute bottom-0 left-0 h-28 w-[42%] bg-emerald-500 [clip-path:polygon(0_30%,20%_0,68%_12%,100%_100%,0_100%)] shadow-[0_20px_0_0_rgb(120_53_15)]" />
        <div className="absolute bottom-0 right-0 h-32 w-[45%] bg-green-400 [clip-path:polygon(0_58%,35%_0,100%_22%,100%_100%,0_100%)] shadow-[0_24px_0_0_rgb(120_53_15)]" />
        <div className="absolute bottom-8 left-[10%] h-20 w-8 bg-amber-900 [clip-path:polygon(25%_0,75%_0,100%_100%,0_100%)]" />
        <div className="absolute bottom-24 left-[7%] size-20 bg-emerald-600 [clip-path:polygon(50%_0,100%_40%,78%_100%,20%_100%,0_40%)]" />
      </div>
      <div className="relative z-10 mx-auto max-w-6xl">{children}</div>
    </div>
  )
}
