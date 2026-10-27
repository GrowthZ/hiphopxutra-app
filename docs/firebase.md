// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBzIrPFLvlTmTb3-3zTO9Es46DcXSpwQj8",
  authDomain: "hiphopxutra2026.firebaseapp.com",
  projectId: "hiphopxutra2026",
  storageBucket: "hiphopxutra2026.firebasestorage.app",
  messagingSenderId: "25648095671",
  appId: "1:25648095671:web:b117cb032db01abf478832",
  measurementId: "G-VPSN1B3NKK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);