// TODO: replace stub cards with real data queries in Phase 2 final
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-8 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold text-text-primary">Dnes</h1>
        <p className="mt-2 text-[15px] text-text-secondary">Dobrý den, Karle.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Příští schůzka</CardTitle>
            <CardDescription>
              Zatím žádná naplánovaná schůzka.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-[13px] text-text-tertiary">
              {/* TODO: load next meeting from DB */}
              Data se načtou po napojení na databázi.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Poslední nabídky</CardTitle>
            <CardDescription>
              Vygenerované PDF nabídky pro vaše zákazníky.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-[13px] text-text-tertiary">
              {/* TODO: load recent offers from DB */}
              Data se načtou po napojení na databázi.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Týdenní přehled</CardTitle>
            <CardDescription>
              Souhrn aktivity za posledních 7 dní.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-[13px] text-text-tertiary">
              {/* TODO: load weekly stats from DB */}
              Data se načtou po napojení na databázi.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
