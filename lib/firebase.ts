import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCbnzWGiwmtS9a_bT2pfTEE8UDMcvlg86U",
    authDomain: "anhcp-efefb.firebaseapp.com",
    projectId: "anhcp-efefb",
    storageBucket: "anhcp-efefb.firebasestorage.app",
    messagingSenderId: "587574892441",
    appId: "1:587574892441:web:cc8c5905b1870a21f86508",
    measurementId: "G-ML3CM4YNS1"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
