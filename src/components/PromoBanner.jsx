import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useContent } from "../context/ContentContext";

const STORAGE_KEY = "dq_promo_dismissed";

export default function PromoBanner() {
  const { content } = useContent();
  const banner = content.promo_banner;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(STORAGE_KEY) === banner?.text);
  }, [banner?.text]);

  if (!banner?.active || !banner?.text || dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, banner.text);
    setDismissed(true);
  };

  const inner = (
    <span className="text-xs sm:text-sm font-medium tracking-wide">{banner.text}</span>
  );

  return (
    <div
      data-testid="promo-banner"
      className="fixed top-0 inset-x-0 z-[60] py-2.5 px-4 flex items-center justify-center gap-4"
      style={{ background: banner.bg_color, color: banner.text_color }}
    >
      {banner.link ? (
        <a href={banner.link} target={banner.link.startsWith("http") ? "_blank" : "_self"} rel="noreferrer" className="hover:underline">
          {inner}
        </a>
      ) : (
        inner
      )}
      <button onClick={dismiss} aria-label="Fechar" className="opacity-70 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}
