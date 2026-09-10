import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Images } from "lucide-react";
import api from "../lib/api";
import { useSeo } from "../components/Seo";

export default function GalleryPage() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null); // index
  const [filter, setFilter] = useState("");
  useSeo({ title: "Galeria — FutWearPT" });

  useEffect(() => {
    api.get("/gallery")
      .then((r) => setPhotos(Array.isArray(r.data) ? r.data : []))
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = ["", ...new Set(photos.map((p) => p.category).filter(Boolean))];
  const filtered = filter ? photos.filter((p) => p.category === filter) : photos;

  const prev = () => setLightbox((i) => (i > 0 ? i - 1 : filtered.length - 1));
  const next = () => setLightbox((i) => (i < filtered.length - 1 ? i + 1 : 0));

  useEffect(() => {
    const onKey = (e) => {
      if (lightbox === null) return;
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="pt-32 pb-24 bg-brand-bone min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">

        {/* Header */}
        <div className="reveal relative overflow-hidden bg-white border border-brand-border p-6 sm:p-10 mb-10 shadow-sm">
          <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-brand-red/10" />
          <div className="absolute -left-16 -bottom-16 w-56 h-56 rounded-full bg-brand-cream" />
          <div className="relative flex items-end gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-brand-cream px-3 py-2 mb-4">
                <Images size={14} className="text-brand-red" />
                <p className="text-xs uppercase tracking-[0.25em] text-brand-red">A nossa história em imagens</p>
              </div>
              <h1 className="font-serif text-5xl md:text-7xl text-brand-espresso leading-none">Galeria</h1>
              <p className="mt-4 text-brand-muted max-w-2xl">Momentos, produtos e o dia-a-dia da nossa quintinha.</p>
            </div>
          </div>
        </div>

        {/* Filtros por categoria */}
        {categories.length > 1 && (
          <div className="reveal mb-8 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat || "all"}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 text-xs uppercase tracking-[0.16em] border transition-colors ${
                  filter === cat
                    ? "bg-brand-espresso text-brand-bone border-brand-espresso"
                    : "bg-white border-brand-border text-brand-espresso hover:border-brand-espresso"
                }`}
              >
                {cat || "Todas"}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="aspect-square bg-brand-cream animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-32 text-center text-brand-muted">
            <Images size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-serif text-3xl text-brand-espresso">Ainda não há fotos.</p>
            <p className="mt-2 text-sm">Em breve partilhamos momentos da nossa quintinha.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((photo, i) => (
              <button
                key={photo.id}
                onClick={() => setLightbox(i)}
                className="group relative aspect-square overflow-hidden bg-brand-cream border border-brand-border hover:border-brand-red transition-all hover:-translate-y-0.5"
              >
                <img
                  src={photo.url}
                  alt={photo.caption || "Galeria"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                {photo.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-brand-espresso/80 text-brand-bone text-xs px-3 py-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    {photo.caption}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && filtered[lightbox] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-brand-red transition-colors p-2">
            <ChevronLeft size={36} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-brand-red transition-colors p-2">
            <ChevronRight size={36} />
          </button>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white hover:text-brand-red transition-colors">
            <X size={28} />
          </button>
          <div className="max-w-4xl max-h-[85vh] px-16" onClick={(e) => e.stopPropagation()}>
            <img
              src={filtered[lightbox].url}
              alt={filtered[lightbox].caption || ""}
              className="max-w-full max-h-[75vh] object-contain mx-auto"
            />
            {filtered[lightbox].caption && (
              <p className="text-center text-brand-bone/80 text-sm mt-4">{filtered[lightbox].caption}</p>
            )}
            <p className="text-center text-brand-bone/40 text-xs mt-2">{lightbox + 1} / {filtered.length}</p>
          </div>
        </div>
      )}
    </div>
  );
}
