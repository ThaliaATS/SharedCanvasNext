import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Shared Canvas',
  description:
    'Editor canvas colaborativo em tempo real. Compartilhe ponteiro e edite a tela com outros usuários.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
