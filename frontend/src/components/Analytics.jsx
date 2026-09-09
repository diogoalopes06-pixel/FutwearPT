import { useEffect } from "react";
import { useContent } from "../context/ContentContext";

let injectedGA = false;
let injectedFB = false;

export default function Analytics() {
  const { content } = useContent();
  const { google_analytics_id, meta_pixel_id } = content.analytics || {};

  useEffect(() => {
    if (google_analytics_id && !injectedGA) {
      injectedGA = true;
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${google_analytics_id}`;
      document.head.appendChild(s);
      const inline = document.createElement("script");
      inline.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${google_analytics_id}');
      `;
      document.head.appendChild(inline);
    }
    if (meta_pixel_id && !injectedFB) {
      injectedFB = true;
      const inline = document.createElement("script");
      inline.innerHTML = `
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
        document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${meta_pixel_id}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(inline);
    }
  }, [google_analytics_id, meta_pixel_id]);

  return null;
}
