import { Construction } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

type ComingSoonRendererProps = { rendererKey: string; title: string }

export function ComingSoonRenderer({ rendererKey, title }: ComingSoonRendererProps) {
  return <Card className="border-dashed"><CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center"><Construction className="size-10 text-primary" aria-hidden="true" /><div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">Renderer “{rendererKey}” akan dilaksanakan dalam Phase 18B.</p></div></CardContent></Card>
}
