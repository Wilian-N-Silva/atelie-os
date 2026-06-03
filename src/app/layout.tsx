import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@/styles/components.css";
import "@/styles/shell.css";
import "@/styles/screens.css";
import "@/styles/extras.css";
import "@/styles/auth.css";
import "@/styles/manual.css";

export const metadata: Metadata = {
  title: "Atelie OS",
  description: "Backoffice artesanal white-label — catálogo, estoque, produção, cura, pedidos e etiquetas.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Apply saved theme/density before paint to avoid a flash of the wrong skin.
const PRE_HYDRATE = `
(function(){try{
  var d=document.documentElement;
  if(localStorage.getItem('atelie-theme')==='dark')d.classList.add('dark');
  d.setAttribute('data-density', localStorage.getItem('atelie-density')==='compact'?'compact':'comfortable');
}catch(e){}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PRE_HYDRATE }} />
      </head>
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
