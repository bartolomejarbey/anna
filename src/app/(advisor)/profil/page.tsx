import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function ProfilPage() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-8 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold text-text-primary">Profil</h1>
      </div>

      <div className="max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Osobní údaje</CardTitle>
            <CardDescription>Informace o vašem účtu a síti.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label>Jméno</Label>
                <p className="text-[15px] text-text-primary">Karel Novák</p>
              </div>
              <div className="h-px bg-border-subtle" />
              <div className="flex flex-col gap-1.5">
                <Label>E-mail</Label>
                <p className="text-[15px] text-text-primary">karel.novak@4fin.cz</p>
              </div>
              <div className="h-px bg-border-subtle" />
              <div className="flex flex-col gap-1.5">
                <Label>Síť</Label>
                <p className="text-[15px] text-text-primary">4FIN HOLDING</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
