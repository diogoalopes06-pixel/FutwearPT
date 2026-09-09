import { useEffect, useMemo, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent || "");
}

export default function InstallAppBanner() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("dq_install_dismissed") === "1");
  const ios = useMemo(() => (typeof window !== "undefined" ? isIOS() : false), []);

  useEffect(() => {
    if (dismissed || isStandalone()) return;

    const handler = (event) => {
      event.preventDefault();
      setPromptEvent(event);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Safari/iPhone não dispara beforeinstallprompt, por isso mostramos dica manual.
    if (ios) {
      const t = setTimeout(() => setVisible(true), 2500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [dismissed, ios]);

  const close = () => {
    localStorage.setItem("dq_install_dismissed", "1");
    setDismissed(true);
    setVisible(false);
  };

  const install = async () => {
    if (!promptEvent) return;
    promptEvent.prompt();
    await promptEvent.userChoice.catch(() => null);
    setPromptEvent(null);
    close();
  };

  if (!visible || dismissed || isStandalone()) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl bg-brand-espresso text-brand-bone border border-brand-bone/20 shadow-2xl p-4 flex gap-3 items-start">
      <div className="w-10 h-10 shrink-0 grid place-items-center bg-brand-red text-white">
        <Smartphone size={18} />
      </div>
      <div className="flex-1">
        <p className="font-serif text-xl">Instalar app da loja</p>
        {ios ? (
          <p className="text-xs text-brand-bone/75 mt-1 leading-relaxed">
            No iPhone: toque no botão de partilha do Safari e escolha “Adicionar ao ecrã principal”.
          </p>
        ) : (
          <p className="text-xs text-brand-bone/75 mt-1 leading-relaxed">
            Instale o site como app para abrir mais rápido e receber melhor as notificações.
          </p>
        )}
        {!ios && promptEvent && (
          <button onClick={install} className="mt-3 px-4 py-2 bg-brand-red text-white text-xs uppercase tracking-[0.18em] inline-flex items-center gap-2">
            <Download size={14} /> Instalar
          </button>
        )}
      </div>
      <button onClick={close} className="p-1 text-brand-bone/70 hover:text-white" aria-label="Fechar aviso de instalação">
        <X size={18} />
      </button>
    </div>
  );
}
