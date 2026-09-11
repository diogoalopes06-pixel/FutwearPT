import { useState } from "react";
import { Shirt } from "lucide-react";

export function resolveImageUrl(src) {
  if (!src) return "";
  const value = String(src).trim();
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  const backend = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "");
  if (value.startsWith("/")) return backend ? `${backend}${value}` : value;
  return value;
}

export default function FwImage({ src, alt = "", className = "", fallback = "logo", ...props }) {
  const [failed, setFailed] = useState(false);
  const url = resolveImageUrl(src);
  if (!url || failed) {
    return (
      <div className={`fw-img-fallback ${className}`} role="img" aria-label={alt}>
        {fallback === "logo" ? (
          <img src="/futwearpt-logo-square.png" alt="" className="fw-img-fallback-logo" />
        ) : (
          <Shirt size={56} strokeWidth={1.2} />
        )}
        <span>FUTWEARPT</span>
      </div>
    );
  }
  return <img src={url} alt={alt} className={className} onError={() => setFailed(true)} {...props} />;
}
