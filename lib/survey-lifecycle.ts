import type { Levantamento } from "@/lib/levantamentos";

export function assertSingleOpenSurvey(id: string, surveys: Pick<Levantamento, "id" | "status">[]) {
  if (surveys.some((survey) => survey.id !== id && survey.status === "em-preenchimento")) throw new Error("Já existe um levantamento em preenchimento. Conclua ou cancele o atual antes de iniciar outro.");
}
export function assertZeroCompleted(count: number) {
  if (count > 0) throw new Error("Somente levantamentos com zero pontos concluídos podem ser cancelados.");
}
