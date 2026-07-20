import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Cartão tipo shadcn para álbum na galeria (imagem + meta). */
export function GaleriaAlbumSkeletonCard() {
  return (
    <Card className="h-full overflow-hidden rounded-2xl border-0 py-0 shadow-card ring-1 ring-zinc-100 dark:ring-zinc-800">
      <CardContent className="p-0">
        <Skeleton className="aspect-[5/4] w-full max-h-72 rounded-none sm:max-h-80" />
      </CardContent>
      <CardHeader className="gap-2 border-0 px-2.5 pb-3 pt-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </CardHeader>
    </Card>
  );
}

export function GaleriaAlbumSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 pb-8 md:grid-cols-2">
      {Array.from({ length: count }, (_, i) => (
        <GaleriaAlbumSkeletonCard key={i} />
      ))}
    </div>
  );
}

export function RedesSociaisCardSkeleton() {
  return (
    <Card className="rounded-3xl border-0 py-0 shadow-card ring-1 ring-zinc-100 dark:ring-zinc-800">
      <CardHeader className="flex flex-row items-start justify-between gap-3 border-0 px-6 pb-2 pt-6">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-7 w-20 shrink-0 rounded-full" />
      </CardHeader>
      <CardContent className="space-y-4 px-6 pb-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl sm:col-span-2" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

export function RedesSociaisSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {Array.from({ length: count }, (_, i) => (
        <RedesSociaisCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function HistoricoTimelineSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="relative space-y-4">
      <div className="absolute left-6 top-0 h-full w-0.5 bg-zinc-200 dark:bg-zinc-700" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="relative pl-16">
          <Skeleton className="absolute left-4 top-6 h-5 w-5 rounded-full" />
          <Card className="rounded-2xl border-0 py-4 shadow-card ring-1 ring-zinc-100 dark:ring-zinc-800">
            <CardContent className="space-y-3 px-5">
              <div className="flex justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <div className="flex shrink-0 gap-1">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </div>
              <Skeleton className="h-3 w-full max-w-xl" />
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

function IndicadoresStatSkeleton() {
  return (
    <Card className="rounded-2xl border-0 shadow-card ring-1 ring-zinc-100 dark:ring-zinc-800">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-5 w-12" />
        </div>
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-36" />
      </CardContent>
    </Card>
  );
}

function IndicadoresTableBlockSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="rounded-3xl border-0 shadow-card ring-1 ring-zinc-100 dark:ring-zinc-800">
      <CardContent className="space-y-4 p-6">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-full max-w-lg" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-md" />
          {Array.from({ length: rows }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function IndicadoresChartSkeleton({ tall }: { tall?: boolean }) {
  return (
    <Card className="rounded-3xl border-0 shadow-card ring-1 ring-zinc-100 dark:ring-zinc-800">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
        <Skeleton className={tall ? "h-[280px] w-full rounded-xl" : "h-[200px] w-full rounded-xl"} />
      </CardContent>
    </Card>
  );
}

export function IndicadoresPageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <IndicadoresStatSkeleton key={i} />
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-7 w-80" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <IndicadoresStatSkeleton key={`kpi-${i}`} />
          ))}
        </div>
      </div>
      <div className="grid gap-6">
        <IndicadoresTableBlockSkeleton />
        <IndicadoresTableBlockSkeleton />
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8">
          <IndicadoresChartSkeleton tall />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <IndicadoresChartSkeleton />
        </div>
        <div className="col-span-12 lg:col-span-6">
          <IndicadoresChartSkeleton />
        </div>
        <div className="col-span-12 lg:col-span-6">
          <IndicadoresChartSkeleton />
        </div>
      </div>
    </div>
  );
}
