import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import App from './App';

console.log('[Entry] Starting app...');

try {
  registerRootComponent(App);
  console.log('[Entry] App registered successfully.');
} catch (error) {
  console.error('[FATAL ENTRY ERROR]', error);
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '<div style="color:red; font-size:20px; padding:20px;">' + error.toString() + '<br/>' + (error.stack || '') + '</div>';
  }
}
