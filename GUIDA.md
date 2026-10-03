# Gran Bouffe Triveneto: come mettere online il sito (passo passo)

Servono due cose, entrambe gratuite:

- **Il sito** (la pagina che gli amici aprono): lo ospita GitHub.
- **Il database** (dove restano proposte, voti, ingredienti): lo ospita Google, con un servizio che si chiama **Firebase**. Il sito da solo non può salvare nulla, per questo serve anche il database.

Tempo totale: circa 15 minuti. Non serve la carta di credito.

## Parte A: il database (Firebase)

1. Vai su <https://console.firebase.google.com> e accedi con il tuo account Google (va bene Gmail).
2. Clicca **Crea un progetto** (Create a project). Nome: `gran-bouffe`. Vai avanti. Togli la spunta da Google Analytics. Clicca **Crea progetto** e poi **Continua**.
3. Nel menu a sinistra apri **Build** (o *Crea*) e clicca **Firestore Database**. Clicca **Crea database**.
   - Località: scegli una europea (per esempio `eur3` oppure Milano `europe-west8`).
   - Modalità: **Avvia in modalità produzione**. Clicca **Crea**.
4. Apri la scheda **Regole** (Rules). Cancella tutto il testo e incolla questo, poi clicca **Pubblica**:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.time < timestamp.date(2027, 2, 1);
       }
     }
   }
   ```
   La data fa chiudere da solo il database dopo il weekend. Se serve più tempo, cambiala.
5. Clicca l'icona a forma di **ingranaggio** accanto a "Panoramica del progetto" e scegli **Impostazioni progetto**. Scorri fino a **Le tue app** e clicca l'icona web `</>`.
   - Nome app: `gran-bouffe`. Lascia vuota la casella Hosting. Clicca **Registra app**.
   - Compare un blocco di testo con `const firebaseConfig = { ... }`. Copia solo la parte tra le parentesi graffe `{ ... }` e incollala nella chat con Claude. Non è una password: è l'indirizzo del tuo database.

## Parte B: il sito (GitHub)

6. Apri il repository su GitHub, vai su **Settings**, scorri fino in fondo a **Danger Zone** e clicca **Change repository visibility**, poi **Make public**. Conferma come richiesto.
   Così il codice del sito diventa visibile a tutti. Non contiene password.
7. Sempre in **Settings**, apri **Pages** dal menu a sinistra. In **Source** scegli **Deploy from a branch**. Come ramo scegli quello principale (`claude/gran-bouffe-recipe-platform-qajukn`) e come cartella `/docs`. Clicca **Save**.
8. Dopo 1 o 2 minuti, in cima alla pagina Pages compare l'indirizzo del sito, simile a `https://marcofurioferrario.github.io/Claude-projects/`. Questo è il link da mandare agli amici.

Quando Claude riceve la configurazione del punto 5 la inserisce nel sito. Dopo circa un minuto il sito è collegato al database.

## Parte C: primo avvio

9. Apri il link. Se vedi l'elenco vuoto, premi **Carica i 15 confermati**.
10. Scegli il tuo nome. **Marco Furio** è l'organizzatore: da lui si cambiano le fasi (Proposte, Voto, Menu, Cucina), si assegnano i piatti ai pasti e si impostano orari e data.
    Le fasi cambiano **da sole** con le scadenze: proposte e voto sul formato del menu chiudono domenica 4 ottobre alle 21:00 (ora italiana), il voto sui piatti dura da lunedì 5 ottobre 00:00 a mezzanotte. Per spostare una scadenza o spegnere il cambio automatico: **Persone → Il weekend → Modifica**. In cima a ogni pagina c'è il conto alla rovescia e il voto su quanti piatti preparare (Dieta 15, Bouffetta 18, L'importante è esagerare 22).
11. Manda il link agli amici. La prima volta scelgono il nome, poi il sito li riconosce (cookie di un anno).

## Dove sono i dati e come sono protetti

- I dati stanno nel tuo database Firestore sui server Google in Europa. Li vedi in Firebase, alla voce **Firestore Database → Dati**.
- Ogni modifica si salva subito. In alto compare "Tutto salvato".
- Se la connessione è lenta o assente, la modifica resta in coda e si salva appena torna la rete.
- Una proposta eliminata va nel **Cestino** (in fondo alla pagina Proposte) e si può ripristinare.
- Ogni 15 minuti, se ci sono novità, il sito crea una **copia di sicurezza** e tiene le ultime 60. Dalla pagina **Persone** l'organizzatore può salvarne una a mano, scaricarla come file e ripristinare una copia precedente. Prima di ogni ripristino il sito salva lo stato attuale, quindi si può sempre tornare indietro.
- Consiglio: scarica una copia sul tuo dispositivo prima del weekend e dopo la scelta del menu.

## Cose da sapere

- Chi ha il link può leggere e scrivere. Non condividerlo in pubblico.
- Non c'è una password: l'identità è il nome scelto. Chiunque può scegliere "Marco Furio" e fare l'organizzatore.
- I link delle ricette risultano "da verificare" finché non li controlla Claude.
