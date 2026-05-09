'use client';

import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { useAssistant } from '@/components/launchpad/assistant-context';

interface Customer {
  id: string;
  full_name: string;
}

interface RecentMeeting {
  id: string;
  created_at: string;
  customer_name: string | null;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
  recentMeetings: RecentMeeting[];
  showAdmin: boolean;
}

const BASE_TOOLS = [
  { label: 'Naslouchač', description: 'Nahrát novou schůzku', href: '/schuzky/nova' },
  { label: 'Zákazníci', description: 'Tvoje zákaznická síť', href: '/zakaznici' },
  { label: 'Schůzky', description: 'Všechny nahrané schůzky', href: '/schuzky' },
  { label: 'Nabídky', description: 'PDF nabídky', href: '/nabidky' },
  { label: 'Profil', description: 'Branding a kontakt', href: '/profil' },
];

const ADMIN_TOOL = { label: 'Admin', description: 'Statistiky a fine-tune data', href: '/admin' };

export function CommandPalette({ open, onClose, customers, recentMeetings, showAdmin }: CommandPaletteProps) {
  const router = useRouter();
  const { openAssistant } = useAssistant();

  const navigate = (href: string) => {
    onClose();
    router.push(href);
  };

  const askAnna = () => {
    onClose();
    openAssistant();
  };

  const tools = showAdmin ? [...BASE_TOOLS, ADMIN_TOOL] : BASE_TOOLS;

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      label="Hledat v Anně"
      overlayClassName="fixed inset-0 z-50 bg-black/15"
      contentClassName="fixed left-1/2 top-[15%] z-50 w-[640px] max-w-[calc(100vw-32px)] -translate-x-1/2"
      className="cmdk-palette anna-fade-scale-in flex flex-col overflow-hidden rounded-[16px] border border-border-default bg-surface"
    >
      <Command.Input placeholder="Co hledáš?" />
      <Command.List>
        <Command.Empty>Nic nenalezeno.</Command.Empty>

        <Command.Group heading="Nástroje">
          {tools.map((t) => (
            <Command.Item
              key={t.href}
              value={`tool ${t.label} ${t.description}`}
              onSelect={() => navigate(t.href)}
            >
              <span className="font-medium text-primary">{t.label}</span>
              <span className="ml-auto text-body-sm text-tertiary">{t.description}</span>
            </Command.Item>
          ))}
        </Command.Group>

        {customers.length > 0 && (
          <Command.Group heading="Zákazníci">
            {customers.map((c) => (
              <Command.Item
                key={c.id}
                value={`customer ${c.full_name}`}
                onSelect={() => navigate(`/zakaznici/${c.id}`)}
              >
                <span>{c.full_name}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {recentMeetings.length > 0 && (
          <Command.Group heading="Schůzky">
            {recentMeetings.map((m) => (
              <Command.Item
                key={m.id}
                value={`meeting ${m.customer_name ?? 'schuzka'} ${m.id}`}
                onSelect={() => navigate(`/schuzky/${m.id}`)}
              >
                <span>{m.customer_name ?? 'Schůzka'}</span>
                <span className="ml-auto text-body-sm text-tertiary">
                  {new Date(m.created_at).toLocaleDateString('cs-CZ', {
                    day: 'numeric',
                    month: 'long',
                  })}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        <Command.Group heading="AI Asistent">
          <Command.Item value="ask anna asistent" onSelect={askAnna}>
            <span className="font-medium text-primary">Zeptej se Anny</span>
            <span className="ml-auto text-body-sm text-tertiary">Otevřít asistenta</span>
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
