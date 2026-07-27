import { Puzzle } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

type UnsupportedRendererProps = { rendererKey: string }

export function UnsupportedRenderer({ rendererKey }: UnsupportedRendererProps) {
  return <Card><CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center"><Puzzle className="size-10 text-muted-foreground" aria-hidden="true" /><div><h2 className="font-semibold">Jenis aktiviti belum disokong</h2><p className="mt-1 text-sm text-muted-foreground">Renderer “{rendererKey}” belum didaftarkan dalam pemain aktiviti.</p></div></CardContent></Card>
}
