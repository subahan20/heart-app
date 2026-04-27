// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
// These values are typically hardcoded or injected during build.
// Since I can't easily inject env vars into public files without a build step,
// I'll provide a template that use the standard Firebase structure.
firebase.initializeApp({
  apiKey: "placeholder", // Replaced by user or during build
  authDomain: "placeholder",
  projectId: "placeholder",
  storageBucket: "placeholder",
  messagingSenderId: "placeholder",
  appId: "placeholder"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title || 'Notification';
  const notificationOptions = {
    body: payload.notification.body || 'You have a new message.',
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
