"use client";

/**
 * Pixel da Meta e tag do Google Ads nas páginas de venda (landing, login,
 * cadastro, assinatura). Só liga com as envs:
 * - NEXT_PUBLIC_META_PIXEL_ID (ex.: 1234567890)
 * - NEXT_PUBLIC_GOOGLE_ADS_ID (ex.: AW-123456789)
 * - NEXT_PUBLIC_GOOGLE_ADS_CADASTRO (rótulo da conversão de cadastro, opcional)
 * O cadastro (/comecar) deixa o cookie "lashos_cadastro"; a primeira página
 * com este componente depois disso registra a conversão e apaga o cookie.
 */
import Script from "next/script";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const META = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const GOOGLE = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const GOOGLE_CADASTRO = process.env.NEXT_PUBLIC_GOOGLE_ADS_CADASTRO;

/** Só nas páginas de venda: dentro do app não rastreia nada. */
const PAGINAS = ["/", "/inicio", "/login", "/comecar", "/assinatura"];

type Janela = Window & {
  fbq?: (...args: unknown[]) => void;
  gtag?: (...args: unknown[]) => void;
};

export function Rastreamento() {
  const pathname = usePathname();
  const ativa = PAGINAS.includes(pathname);

  useEffect(() => {
    if (!ativa || !document.cookie.includes("lashos_cadastro=1")) return;
    const w = window as Janela;
    // Espera os scripts carregarem antes de registrar.
    const t = setTimeout(() => {
      w.fbq?.("track", "CompleteRegistration", { content_name: "Teste grátis" });
      if (GOOGLE && GOOGLE_CADASTRO) w.gtag?.("event", "conversion", { send_to: `${GOOGLE}/${GOOGLE_CADASTRO}` });
      document.cookie = "lashos_cadastro=; Max-Age=0; path=/";
    }, 1500);
    return () => clearTimeout(t);
  }, [ativa, pathname]);

  useEffect(() => {
    if (!ativa) return;
    const w = window as Janela;
    w.fbq?.("track", "PageView");
  }, [ativa, pathname]);

  if (!ativa || (!META && !GOOGLE)) return null;
  return (
    <>
      {META ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META}');`}
        </Script>
      ) : null}
      {GOOGLE ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE}`} strategy="afterInteractive" />
          <Script id="google-ads" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GOOGLE}');`}
          </Script>
        </>
      ) : null}
    </>
  );
}

/** Para botões: registra a intenção (clique em "Testar grátis"). */
export function registrarIntencao() {
  const w = window as Janela;
  w.fbq?.("track", "Lead");
}
