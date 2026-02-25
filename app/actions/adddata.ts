import { db } from '@/lib/firebase'
import { doc, setDoc } from 'firebase/firestore'

export async function addData(data: Record<string, unknown>) {
  try {
    const docRef = doc(db, 'pays', data.id as string)
    await setDoc(docRef, data, { merge: true })
    console.log("Document written with ID: ", docRef.id)
  } catch (e) {
    console.error("Error adding document: ", e)
    throw e
  }
}
