// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDwFTQsXc036ziiGnrCn6yth9-kEU_Zmk8",
  authDomain: "prolobby-52040.firebaseapp.com",
  databaseURL: "https://prolobby-52040-default-rtdb.firebaseio.com",
  projectId: "prolobby-52040",
  storageBucket: "prolobby-52040.firebasestorage.app",
  messagingSenderId: "818727547888",
  appId: "1:818727547888:web:d8f5e547a4f0af1590a335",
  measurementId: "G-DYBXV0L61D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db = getDatabase(app); 