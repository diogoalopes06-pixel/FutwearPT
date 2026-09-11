import { useEffect } from "react";
import { useContent } from "../context/ContentContext";

function setMeta(name, content) {
  if (!content) return;
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setOg(prop, content) {
  if (!content) return;
  let el = document.querySelector(`meta[property="${prop}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", prop);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function useSeo({ title, description, image, url, type = "website" } = {}) {
  const { content } = useContent();
  const seo = content.seo || {};

  useEffect(() => {
    const finalTitle = title ? `${title} · ${seo.site_title || "FutWearPT"}` : seo.site_title;
    const finalDesc = description || seo.site_description;
    const finalImg = image || seo.og_image || content.hero?.image;
    const finalUrl = url || (typeof window !== "undefined" ? window.location.href : "");

    if (finalTitle) document.title = finalTitle;
    setMeta("description", finalDesc);
    setOg("og:title", finalTitle);
    setOg("og:description", finalDesc);
    setOg("og:type", type);
    setOg("og:url", finalUrl);
    setOg("og:image", finalImg);
    setMeta("twitter:card", "summary_large_image");
  }, [title, description, image, url, type, seo.site_title, seo.site_description, seo.og_image, content.hero?.image]);
}

export function LocalBusinessSchema() {
  const { content } = useContent();
  const c = content.contact;

  useEffect(() => {
    const contact = c || {};
    const json = {
      "@context": "https://schema.org",
      "@type": "Store",
      name: "FutWearPT",
      address: {
        "@type": "PostalAddress",
        streetAddress: contact.address_line1,
        addressLocality: "Abrantes",
        postalCode: (contact.address_line2 || "").split(" ")[0],
        addressCountry: "PT",
      },
      telephone: contact.phone,
      email: contact.email,
      url: typeof window !== "undefined" ? window.location.origin : "",
      sameAs: contact.facebook_url ? [contact.facebook_url] : [],
      openingHours: `Mo-Sa ${contact.hours_weekday_time?.replace(/\s*–\s*/, "-") || "08:00-20:00"}`,
    };
    let el = document.getElementById("ld-business");
    if (!el) {
      el = document.createElement("script");
      el.id = "ld-business";
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(json);
  }, [c]);

  return null;
}
