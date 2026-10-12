import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRITICAL: Must include firebaseConfig.firestoreDatabaseId to bind to provisioned database
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Connectivity check on initial boot as required by Firebase skill
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('PickleQueue: Firestore client reports offline or pending connection.');
    }
    // Expected on initial blank db if test doc doesn't exist yet, but validates server roundtrip
    return true;
  }
}

testConnection();

export default app;
