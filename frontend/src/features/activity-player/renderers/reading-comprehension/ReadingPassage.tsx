import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MediaViewer } from "../../components/MediaViewer"
import type { ReadingComprehensionConfiguration } from "./reading.types"

export function ReadingPassage({ configuration, onStartQuestions }: { configuration: ReadingComprehensionConfiguration; onStartQuestions: () => void }) {
  return <Card className="border-border/80 shadow-sm"><CardHeader className="space-y-2"><p className="text-sm font-semibold text-primary">Kefahaman Bacaan</p><CardTitle className="text-xl sm:text-2xl">{configuration.passage.title}</CardTitle></CardHeader><CardContent className="space-y-4"><p className="whitespace-pre-wrap text-base leading-7 text-foreground">{configuration.passage.content}</p>{configuration.passage.media.map((media) => <MediaViewer key={media.id} media={media} />)}<button type="button" className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground" onClick={onStartQuestions}>Mulakan Soalan</button></CardContent></Card>
}
