import api from "./api";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);

  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function pushSupported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;

  try {
    const existing = await navigator.serviceWorker.getRegistration("/");

    if (existing) return existing;

    const reg = await navigator.serviceWorker.register(
      "/service-worker.js",
      { scope: "/" }
    );

    await navigator.serviceWorker.ready;

    return reg;
  } catch (e) {
    console.error("SW register failed", e);
    return null;
  }
}

async function getReadyRegistration() {
  const reg = await registerServiceWorker();

  if (!reg) {
    throw new Error("Service worker não disponível.");
  }

  return await navigator.serviceWorker.ready;
}

export async function getPushStatus() {
  if (!pushSupported()) {
    return {
      supported: false,
      permission: "unsupported",
      subscribed: false,
    };
  }

  try {
    const reg = await getReadyRegistration();

    const sub =
      await reg.pushManager.getSubscription();

    return {
      supported: true,
      permission: Notification.permission,
      subscribed: !!sub,
    };
  } catch (e) {
    console.error("Push status failed", e);

    return {
      supported: false,
      permission: "unsupported",
      subscribed: false,
    };
  }
}

function endpoints(role) {
  const prefix =
    role === "customer"
      ? "/customers/push"
      : "/admin/push";

  return {
    subscribe: `${prefix}/subscribe`,
    unsubscribe: `${prefix}/unsubscribe`,
    test: `${prefix}/test`,
  };
}

export async function subscribeToPush(
  role = "admin",
  config = {}
) {
  if (!pushSupported()) {
    throw new Error(
      "Notificações não suportadas neste navegador."
    );
  }

  const permission =
    await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error(
      "Permissão de notificações negada."
    );
  }

  const reg = await getReadyRegistration();

  const { data } = await api.get(
    "/push/vapid-public-key"
  );

  if (!data?.key) {
    throw new Error(
      "Chave pública de push não configurada."
    );
  }

  let subscription =
    await reg.pushManager.getSubscription();

  if (subscription) {
    try {
      await subscription.unsubscribe();
    } catch {}
  }

  subscription =
    await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.key),
    });

  await api.post(
    endpoints(role).subscribe,
    {
      subscription: subscription.toJSON(),
    },
    config
  );

  return subscription;
}

export async function unsubscribeFromPush(
  role = "admin",
  config = {}
) {
  const reg = await getReadyRegistration();

  const sub =
    await reg.pushManager.getSubscription();

  if (sub) {
    await api
      .post(
        endpoints(role).unsubscribe,
        {
          subscription: sub.toJSON(),
        },
        config
      )
      .catch(() => {});

    await sub.unsubscribe();
  }

  return true;
}

export async function testPush(
  role = "admin",
  config = {}
) {
  const { data } = await api.post(
    endpoints(role).test,
    {},
    config
  );

  return data;
}
