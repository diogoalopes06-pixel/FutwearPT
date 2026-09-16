import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-40 h-11 w-11 grid place-items-center bg-brand-espresso text-brand-bone shadow-lg hover:bg-brand-red hover:-translate-y-1 transition-all duration-300 rounded-sm"
      aria-label="Voltar ao topo"
    >
      <ArrowUp size={18} />
    </button>
  );
}
