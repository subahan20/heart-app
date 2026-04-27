import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { supabase } from "./supabase";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const fcmService = {
  async init(userId) {
    try {
      // Check if browser supports notifications
      if (!("Notification" in window)) {
        console.log("This browser does not support desktop notification");
        return;
      }

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        console.log("Notification permission granted.");
        
      // Get FCM Token
      console.log("Requesting FCM token...");
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY 
      });

        if (token) {
          console.log("FCM Token:", token);
          await this.saveToken(userId, token);
        } else {
          console.log("No registration token available. Request permission to generate one.");
        }
      } else {
        console.log("Unable to get permission to notify.");
      }
    } catch (error) {
      console.error("An error occurred while retrieving token:", error);
    }
  },

  async saveToken(userId, token) {
    if (!userId || !token) return;
    try {
      const { error } = await supabase
        .from('user_tokens')
        .upsert({ 
          user_id: userId, 
          fcm_token: token 
        }, { 
          onConflict: 'user_id,fcm_token' 
        });

      if (error) throw error;
      console.log("FCM Token saved to user_tokens table.");
    } catch (error) {
      console.error("Error saving FCM token:", error);
    }
  },

  onMessageListener(callback) {
    if (typeof callback !== 'function') return;
    return onMessage(messaging, (payload) => {
      console.log("Foreground FCM received:", payload);
      callback(payload);
    });
  }
};
