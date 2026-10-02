# Gran Bouffe Triveneto

Web app (in italiano) per organizzare la Gran Bouffe: proposte, votazioni, selezione del menu, schede piatto, lista della spesa consolidata e cronoprogramma. Modellata sul foglio dell'edizione 2025 (Campania).

Pubblicata come artifact di claude.ai: <https://claude.ai/artifact/WFrai8Hzx76GofBwUjNkt9>

## Come si usa

1. **Persone**: accesso con il nome (nessuna password). I 15 confermati sono precaricati; si possono aggiungere altri e spuntare chi è presente.
2. **Suggerimenti** (prima scheda, colorata, e pagina d'ingresso durante la fase *Proposte*; nelle altre fasi l'ingresso è Voto o Menu): catalogo di 44 piatti del Triveneto (due rassegne del gruppo), con fonte e livello di affidabilità (A/B/C), vino in abbinamento (con tipo), ingredienti, note di esecuzione e tempi. Ogni piatto ha un segnalino *Da proporre / Già proposta / Approvata (in menu)*, calcolato in tempo reale dalle proposte; "Proponi questo piatto" apre il modulo già compilato (link, regione, vino, tempi). Una banda in alto ricorda che ci sono già 44 ricette da cui attingere e fa da filtro per regione (stesso avviso nella scheda Proposte e in una pillola in testata). Filtri per testo (piatto, ingrediente, vino), tipo di vino, stato, livello; un riquadro mostra l'equilibrio tra regioni, portate e vini. I piatti della stessa *famiglia* (per esempio i dolci a spirale gubana, presnitz e putizza) vengono segnalati come simili, anche nel Menu, per evitare ripetizioni.
3. **Proposte** (fase *Proposte*): ogni proposta richiede proponente (chi è loggato), almeno un responsabile della produzione, categoria e link alla ricetta. Categorie: antipasti e snack, primi e zuppe, secondi e griglia, contorni, dolci (zuppe e griglia sono state unite a primi e secondi; i vecchi valori `zuppe` e `griglia` restano riconosciuti e un organizzatore li sistema nel database all'apertura). **Team responsabili**: chiunque può aggiungersi o togliersi dai responsabili di un piatto (pulsante sulla card e nella scheda; resta sempre almeno un responsabile); chi ha proposto il piatto, o un organizzatore, gestisce l'intero team con *Gestisci team* e modifica tutti gli altri dati. Le modifiche al team rileggono il documento e applicano solo le differenze, così le aggiunte simultanee non si perdono.
4. **Votazioni** (fase *Voto*): ognuno ordina le proposte di ogni categoria dalla migliore alla peggiore. Il punteggio è il piazzamento medio normalizzato (100 = sempre primo).
5. **Menu** (fase *Menu*): gli organizzatori assegnano i piatti ai pasti (5 venerdì sera, 12 sabato, 5 domenica; modificabile). "Suggerisci dai voti" propone una selezione bilanciata per categoria e tempi. Sotto i giorni c'è la *carta dei vini* con i vini in abbinamento dei piatti scelti e il pulsante per copiare la carta del banchetto.
6. **Scheda piatto**: proponente, team responsabili, ingredienti scalati sui confermati, procedimento, vini, tempi. "Genera bozza con Claude" compila una bozza da controllare.
7. **Spesa**: lista unica, somma gli ingredienti uguali tra piatti (anche con unità diverse), arrotonda per eccesso, calcola le confezioni, assegna chi compra, copia per WhatsApp o scarica CSV.
8. **Programma**: finestre di tempo utili per pasto (arrivo, orari) e cronoprogramma. Un piatto che richiede più ore di anticipo di quelle disponibili non può stare in quel pasto, a meno che la parte lunga si prepari a casa.

## Versione pubblica, aperta a chiunque (cartella `docs/` nella radice del repo)

L'artifact di claude.ai richiede un account e l'accesso in modifica. Per un link che funziona per tutti c'è `../docs/index.html`, la stessa app con i dati su Firestore (gratuito) e il nome ricordato con un cookie (un anno, solo il nome scelto). La procedura passo passo per un non tecnico è in [`../GUIDA.md`](../GUIDA.md).

Riassunto tecnico: progetto Firebase + Firestore con le regole a tempo della guida; `firebaseConfig` in `docs/config.js`; GitHub Pages sul ramo principale, cartella `/docs` (serve repo pubblico, o un hosting statico collegato al repo privato).

Robustezza dei dati:

- ogni scrittura è immediata, con indicatore "Salvataggio… / Tutto salvato"; dopo 7 s senza risposta resta in coda e si avvisa; persistenza offline di Firestore attiva;
- le proposte eliminate vanno nel cestino (`eliminata: true`), l'eliminazione definitiva è dell'organizzatore;
- copie di sicurezza automatiche ogni 15 minuti se ci sono state modifiche (`backups/<id>`, indice in `meta/backups`, ultime 60), prima delle azioni rischiose (suggerimento menu, svuotamento, rimozione persone, eliminazione proposte, ripristino);
- l'organizzatore può salvare una copia, scaricarla come JSON, ripristinare da una copia o da file.

## Verifica dei link (la fa Claude)

Dentro la pagina non è possibile aprire altri siti, quindi i link restano `da_verificare` finché una sessione Claude Code con accesso di rete li controlla. Procedura:

1. Leggere le proposte: `ArtifactData list recipes` sull'artifact e filtrare `verifica.stato == "da_verificare"`.
2. Aprire il link del proponente: funziona? corrisponde al piatto? è una ricetta completa?
3. Cercare la fonte più autorevole, in quest'ordine: Accademia Italiana della Cucina, Artusi (*La scienza in cucina*, Wikisource), La Cucina Italiana, Cucchiaio d'Argento, confraternite e consorzi del prodotto, enti di promozione del territorio (Veneto, FVG, Trentino-Alto Adige), poi blog che citano le fonti precedenti. I tre libri di riferimento (*La Cucina*, Anna Del Conte, Anna Gosetti della Salda) non sono consultabili online: citarli solo se si è verificata la ricetta.
4. Scrivere il risultato con `ArtifactData update recipes/<id>`:

```json
{"verifica": {"stato": "verificato|migliorato|da_sostituire|non_valido",
              "fonte": "La Cucina Italiana",
              "linkAutorevole": "https://…",
              "nota": "una riga su cosa è stato controllato",
              "data": "2026-10-01"}}
```

`verificato` = il link del proponente va bene; `migliorato` = va bene ma è stata aggiunta una fonte migliore; `da_sostituire` = link debole o incoerente, la fonte aggiunta lo rimpiazza; `non_valido` = non raggiungibile o non è una ricetta.

Quando un piatto entra in menu si possono compilare le sue schede dalla fonte verificata (`ingredients`, `steps`, `fasi`, `vini`, `serves`).

**Nota di rete**: nella sessione in cui l'app è stata costruita il proxy bloccava quasi tutti i siti di ricette. Per verificare i link va ampliato l'accesso di rete dell'ambiente.

## Dati (db dell'artifact)

| Collezione | Documento | Contenuto |
|---|---|---|
| `participants` | `p_<nome>` | `name`, `confirmed`, `organizer`, `ord` |
| `recipes` | `r_…` | `ownerIds` (team responsabili; `teamIds` è il vecchio campo delle squadre, svuotato alla prima modifica), `sugId` (piatto del catalogo da cui nasce), `title`, `category`, `region`, `link`, `note`, `proposerId`, `ownerIds[]`, `teamIds[]`, `slot` (`ven-cena`, `sab-pranzo`, `sab-cena`, `dom-pranzo` o `""`), `verifica{}`, `serves`, `porzione`, `ingredients[{name,qty,unit,shop}]`, `steps[]`, `fasi[{label,ore}]`, `preparabileACasa`, `vini[{nome,bottiglie}]`, `consigli` |
| `votes` | `<participantId>` | `rank{<categoria>: [recipeId…]}` (dal migliore) |
| `spesa` | slug dell'ingrediente | `comprato`, `chi`, `pack{base,size}` |
| `meta` | `backups` | indice delle copie: `items[{id,at,motivo,by,n}]` |
| `backups` | `b…` | copia completa: `p`,`r`,`v`,`s`,`m` (JSON) |
| `settings` | `main` | `fase`, `dataVen`, `arrivo`, `riservaOre`, `margine`, `orari{}`, `cap{ven,sab,dom}` |

Seed iniziale (artifact): `seed/seed.json`; nella versione pubblica il pulsante "Carica i 15 confermati" scrive lo stesso elenco (partecipanti confermati e impostazioni).

## Sviluppo

```
node build.js          # assembla src/ in index.html (artifact) e docs/index.html (versione pubblica)
node test/flow.js      # artifact: prova end-to-end in Chromium con un db finto in memoria
node test/sugg.js      # sezione Suggerimenti: segnalini, filtri, proposta precompilata, carta dei vini
node test/owners.js     # team responsabili: aggiungersi/togliersi, permessi, gestione del team
node test/cats.js       # zuppe unite ai primi, griglia ai secondi, dati e voti già esistenti
node test/standalone.js # versione pubblica: Firestore finto, cookie, merge dei voti
```

`test/flow.js` usa dati inventati solo in memoria: non scrive nulla nell'artifact.

## Accesso

Il db condiviso accetta scritture da chi ha livello Contributor o superiore sull'artifact. Gli amici devono poter aprire la pagina con un account claude.ai e avere accesso in modifica dal menu Condividi. L'identità è solo il nome scelto all'ingresso: va bene tra amici, non è un'autenticazione.

## Catalogo dei suggerimenti

I dati sono in `src/js/05-sugg-data.js` (`SUG`). Ogni piatto ha `lv` (livello della fonte, vuoto = da assegnare), `weak` (link generico o non coerente) e `src` (fonti). Dopo aver verificato i link aggiorna questi campi e lancia `node build.js`. Il campo `k` contiene le chiavi con cui una proposta fatta a mano viene riconosciuta come quel piatto; `f` è la famiglia usata per segnalare piatti simili. I vini con `vs:'sug'` sono abbinamenti suggeriti, non presenti nei documenti. Un vino con 0 bottiglie in una scheda è solo un abbinamento: non entra nella lista della spesa.
