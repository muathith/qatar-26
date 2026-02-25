import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyD1f1ZZVypnG0V6ARFatdRr4BHlzYcYtWA",
  authDomain: "aqqqaq.firebaseapp.com",
  projectId: "aqqqaq",
  storageBucket: "aqqqaq.firebasestorage.app",
  messagingSenderId: "912808047810",
  appId: "1:912808047810:web:54a1aed435a35d2735375b",
  measurementId: "G-J4B73TLHZM"
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)
const auth = getAuth(app)

export { app, db, auth }
