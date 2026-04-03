// RE-EXPORT: Para manter compatibilidade com arquivos legados do sistema.
// Toda a lógica de inicialização agora reside centralizada em '@/firebase'.
import { db, auth, firebaseApp as app } from '@/firebase';

export { db, auth, app };
