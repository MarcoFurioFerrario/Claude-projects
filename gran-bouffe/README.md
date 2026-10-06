# Gran Bouffe Triveneto

Web app (in italiano) per organizzare la Gran Bouffe: proposte, votazioni, selezione del menu, schede piatto, lista della spesa consolidata e cronoprogramma. Modellata sul foglio dell'edizione 2025 (Campania).

Pubblicata come artifact di claude.ai: <https://claude.ai/artifact/WFrai8Hzx76GofBwUjNkt9>

## Come si usa

1. **Persone**: accesso con il nome (nessuna password). I 15 confermati sono precaricati; si possono aggiungere altri e spuntare chi è presente.
2. **Suggerimenti** (prima scheda, colorata, e pagina d'ingresso durante la fase *Proposte*; nelle altre fasi l'ingresso è Voto o Menu): catalogo di 44 piatti del Triveneto (due rassegne del gruppo), con **foto**, fonte e livello di affidabilità (A/B/C), vino in abbinamento (con tipo), ingredienti, note di esecuzione e tempi. **Nell'elenco restano solo i piatti non ancora proposti**: appena uno viene proposto la sua scheda sparisce (e riappare se la proposta viene tolta); i piatti già proposti si vedono in Proposte e contano nell'Equilibrio. "Proponi questo piatto" apre il modulo già compilato (link, regione, vino, tempi, foto). Una banda in alto dice quante ricette restano da proporre, quante sono già state proposte (e quante in menu) e fa da filtro per regione (stesso avviso nella scheda Proposte e in una pillola in testata). Filtri per testo (piatto, ingrediente, vino), portata, tipo di vino, livello. Il riquadro **Equilibrio** (sempre aperto, raggiungibile dal pulsante «Cosa manca?» nella banda) mostra per regione, portata e tipo di vino quanti piatti ci sono già (in menu / proposti) e quanti restano da proporre, con barre **divise per regione** (un colore per regione, lo stesso delle etichette: Veneto blu, Friuli-V.G. verde, Trentino-A.A. arancio, grigio se la regione non è indicata; colore pieno = già proposti, tratteggiato = ancora da proporre), così si vede subito se in ogni portata c'è equilibrio tra le regioni (sotto la barra «Nessun piatto proposto di: …» e nel riepilogo «Regioni assenti per portata»), numeri scritti, un verdetto in parole («Ne mancano almeno 2», «Poca scelta», «Tante rispetto alle altre») e un pulsante «Vedi i N da proporre» che filtra l'elenco. Le portate si confrontano con le quote del formato scelto (Dieta, Bouffetta) oppure, con «L'importante è esagerare», fra loro. I piatti della stessa *famiglia* (per esempio i dolci a spirale gubana, presnitz e putizza) vengono segnalati come simili, anche nel Menu, per evitare ripetizioni.
3. **Il libro** (scheda dopo i Suggerimenti): dal libro *Giorni Golosi* (Marco Ferrario, Trenta Editore, 2013) le ricette delle pagine su Trentino-Alto Adige (pp. 30-33), Veneto (pp. 34-37) e Friuli-Venezia Giulia (pp. 38-41), cioè le tre ricette complete (Apfelschmarren, Pinsa, Gubana) e tutte quelle solo citate nell'introduzione della regione, e le riflessioni storico-culturali (perché la festa è dolce, le ricette che evolvono come i viventi, la mela e il Simposio di Platone, la Befana e la rigenerazione del pane vecchio, lo scisma d'Occidente e il pastafarianesimo, i dolci dei morti). Le ricette citate sono tra le Proposte con il segno «Dal libro» e il filtro «Solo dal libro»; nella scheda del piatto un riquadro mostra pagina, nota del libro e, per le tre ricette complete, la ricetta per 6 persone con il pulsante «Usa questa ricetta nella scheda» (compila ingredienti, procedimento, persone e attese). Dati in `src/js/07-libro.js`. Le proposte nate dal libro hanno `daLibro: true` e `libroId`; quelle già proposte dagli amici (Tiramisù, Gubana, Frico, Kaiserschmarrn) sono riconosciute dal titolo. Restano in elenco «citati, ricetta ancora da trovare» i piatti senza una fonte accessibile (Golosessi, Maronada, Tampelun, Busolai, Pane dei Morti friulano), con il pulsante «Proponi».
4. **Proposte** (fino alla scadenza): in cima due strade affiancate, **A** scegliere tra i Suggerimenti (modulo precompilato) oppure **B** proporre un piatto fuori elenco. Ogni proposta richiede proponente (chi è loggato), almeno un responsabile della produzione, categoria e link alla ricetta. Categorie: antipasti e snack, primi e zuppe, secondi e griglia, contorni, dolci (zuppe e griglia sono state unite a primi e secondi; i vecchi valori `zuppe` e `griglia` restano riconosciuti e un organizzatore li sistema nel database all'apertura). **Team responsabili**: chiunque può aggiungersi o togliersi dai responsabili di un piatto (pulsante sulla card e nella scheda; resta sempre almeno un responsabile); chi ha proposto il piatto, o un organizzatore, gestisce l'intero team con *Gestisci team* e modifica tutti gli altri dati. Le modifiche al team rileggono il documento e applicano solo le differenze, così le aggiunte simultanee non si perdono.
5. **Scadenze e banda in alto** (la banda bordata compare **solo nella scheda Votazioni**, per non appesantire le altre; la barra «Fase del progetto» resta ovunque): conto alla rovescia live e tre tappe. Nelle Proposte, finché sono aperte, una riga ricorda quando chiudono. Proposte e voto sul formato chiudono **domenica 4 ottobre alle 21:00** (ora italiana, UTC+2); il voto sui piatti dura 24 ore, da **lunedì 5 ottobre 00:00 a mezzanotte**; poi menu e spesa. Le fasi cambiano da sole con le scadenze (la fase effettiva è la più avanzata tra quella scelta dall'organizzatore nella barra delle fasi e quella che dicono le scadenze); dopo la scadenza solo gli organizzatori possono ancora proporre piatti. Date e interruttore delle fasi automatiche sono in *Persone → Il weekend → Modifica* (le date si leggono e si scrivono in ora italiana; l'ora legale è gestita).
6. **Formato del menu** (voto in cima, aperto da subito e chiuso insieme alle proposte): *Dieta* 15 piatti (ven 3, sab 4+4, dom 4), *Bouffetta* 18 (ven 4 = antipasto, primo, secondo, dolce; sab 5+5; dom 4), *L'importante è esagerare* 22 senza vincoli su portata e pasto. Un voto a testa, modificabile fino alla chiusura (`votes/<id>.formato`). Finché si vota il menu resta su 22 piatti ("provvisorio"); a voto chiuso vale il più votato, a parità il più abbondante; l'organizzatore può fissare il formato dal menu a tendina della banda (in Votazioni). Il formato guida i tetti per giorno e per pasto nel Menu e il pulsante "Suggerisci dai voti" (Bouffetta: il venerdì riceve una portata per tipo; Esagerare: nessuna quota per portata).
7. **Votazioni** (fase *Voto*): classifica **con tetto**. Per ogni portata ognuno assegna le sue prime posizioni, al massimo 6 per antipasti, primi, secondi e dolci e 4 per i contorni (`RANK_CAP` in `src/js/10-logic.js`; con meno proposte le posizioni sono meno), scegliendo il numero accanto a ogni piatto oppure **trascinandolo** (maniglia ⠿, mouse e dito) nello slot; i piatti non messi in classifica restano «fuori classifica». Se si sceglie una posizione già occupata, il piatto che c'era scende alla prima posizione libera sotto, altrimenti esce dalla classifica (un avviso dice cosa è successo); le posizioni vuote si chiudono al salvataggio. **Punti:** 1° posto = N+1, … ultimo posto classificabile = 2, fuori classifica = 0 (stesso ordine che si avrebbe dando −1 ai non classificati, con la scala spostata di 1 per non avere numeri negativi). **Spareggio automatico:** a parità di punti vince chi ha più primi posti, poi più secondi posti e così via; se restano identici a cavallo del limite della quota, i risultati mostrano «Pari merito» e decide l'organizzatore. Vecchie classifiche complete già salvate vengono lette solo fino al tetto. Trascinamento in `src/js/31-rank-drag.js` (Pointer Events: durante il trascinamento la pagina non si ridisegna).
8. **Menu** (fase *Menu*), a **due colonne**: a sinistra il menu pasto per pasto da venerdì sera a domenica pranzo (con contatori e tetti del formato scelto), a destra gli **exit poll**, cioè i 5 piatti più votati finora per portata (punti, votanti, barra; «In menu · pasto» se già scelti; gli altri candidati sono in un riquadro chiuso). Gli organizzatori assegnano i piatti **trascinandoli** dalla maniglia ⠿ (da un pasto all'altro, dagli exit poll a un pasto, da un pasto agli exit poll per toglierli; mouse e dito, `src/js/32-menu-drag.js`) oppure dal menu a tendina «Sposta» di ogni piatto. Chi non è organizzatore vede tutto ma non sposta. "Suggerisci dai voti" propone una selezione bilanciata per categoria e tempi. Sotto le colonne c'è la *carta dei vini* con i vini in abbinamento dei piatti scelti e il pulsante per copiare la carta del banchetto.
9. **Scheda piatto**: foto del piatto con nome della fonte e link alla pagina d'origine (anche sulle card di Proposte; proponente, responsabili e organizzatori la aggiungono, cambiano o tolgono dalla scheda; se l'immagine non si carica resta il link alla fonte), proponente, team responsabili, ingredienti scalati sui confermati, procedimento, vini, tempi. "Genera bozza con Claude" compila una bozza da controllare.
10. **Spesa**: lista unica, somma gli ingredienti uguali tra piatti (anche con unità diverse), arrotonda per eccesso, calcola le confezioni, assegna chi compra, copia per WhatsApp o scarica CSV.
11. **Programma**: finestre di tempo utili per pasto (arrivo, orari) e cronoprogramma. Un piatto che richiede più ore di anticipo di quelle disponibili non può stare in quel pasto, a meno che la parte lunga si prepari a casa.

## Versione pubblica, aperta a chiunque (cartella `docs/` nella radice del repo)

L'artifact di claude.ai richiede un account e l'accesso in modifica. Per un link che funziona per tutti c'è `../docs/index.html`, la stessa app con i dati su Firestore (gratuito) e il nome ricordato con un cookie (un anno, solo il nome scelto). La procedura passo passo per un non tecnico è in [`../GUIDA.md`](../GUIDA.md).

Riassunto tecnico: progetto Firebase + Firestore con le regole a tempo della guida; `firebaseConfig` in `docs/config.js`; GitHub Pages sul ramo principale, cartella `/docs` (serve repo pubblico, o un hosting statico collegato al repo privato).

Robustezza dei dati:

- ogni scrittura è immediata, con indicatore "Salvataggio… / Tutto salvato"; dopo 7 s senza risposta resta in coda e si avvisa; persistenza offline di Firestore attiva;
- le proposte eliminate vanno nel cestino (`eliminata: true`), l'eliminazione definitiva è dell'organizzatore;
- copie di sicurezza automatiche ogni 15 minuti se ci sono state modifiche (`backups/<id>`, indice in `meta/backups`, ultime 60), prima delle azioni rischiose (suggerimento menu, svuotamento, rimozione persone, eliminazione proposte, ripristino);
- l'organizzatore può salvare una copia, scaricarla come JSON, ripristinare da una copia o da file.

## Fonti affidabili (whitelist)

L'elenco è in `src/js/00-core.js` (`FONTI`): Accademia Italiana della Cucina e Wikisource (Artusi) come riferimenti (livello A); Taccuini Gastrosofici (affidabile se contiene la ricetta cercata), Cucchiaio d'Argento, La Cucina Italiana, AIFB, Turismo FVG, Consorzio DOC Friuli, Qualità Trentino, Visit Trentino, Alto Adige (alto-adige.com, suedtirol.info, genusslandsuedtirol.it) e Tirol come editoria ed enti del territorio (livello B). I link che puntano a questi domini mostrano "✓ affidabile" sulla scheda e l'editor di proposta ricorda le fonti da preferire. Per aggiungere un dominio basta una riga in `FONTI`.

## Foto dei piatti

Il campo `foto` di ogni proposta contiene solo l'**indirizzo** dell'immagine (non viene copiata) più `pagina` (la pagina della fonte da cui viene), `fonte` (nome) e `data`; sotto la foto compaiono sempre fonte e link. Le foto devono venire dalle fonti della whitelist.

### Foto dei Suggerimenti e immagini create con AI

Ogni piatto del catalogo ha la sua foto in `src/js/06-sugg-foto.js` (`SUG_FOTO`): dove esiste una foto in una fonte affidabile c'è l'indirizzo dell'immagine con la pagina d'origine; per gli altri 8 piatti (Toc' in braide, Pastissada, Schie con polenta, Minestra de bobici, Seppie al nero, Brasato al Teroldego, Carne salada e fasoi, Bigoli co' l'arna) l'immagine è **creata con AI** a partire dalla ricetta (generatore gratuito Pollinations.AI), salvata in `docs/img/ai/` e segnalata ovunque con il segno **«Creata con AI»** e la didascalia «non è una foto del piatto vero». Il segno resta quando il piatto viene proposto (`foto.ai = true`) e sparisce se si sostituisce l'immagine con una foto vera da *Cambia foto*. Sono illustrazioni: possono avere dettagli sbagliati. Per aggiungerne altre: salva l'immagine in `docs/img/ai/<id>.jpg` e aggiungi la voce con `ai:true` in `SUG_FOTO`.

### Barra delle schede

Sta subito sotto il titolo: pulsanti con bordo e ombra, scheda attiva piena, contatori. Sullo schermo stretto scorre in orizzontale (dito, trackpad o frecce ‹ › che compaiono solo dove c'è altro da scoprire) e mantiene la posizione e la scheda attiva visibile a ogni ridisegno. La fase del progetto (Proposte, Voto, Menu, Cucina) è un indicatore a tratti con etichetta, volutamente diverso dalle schede; l'organizzatore può toccare una fase per cambiarla.

`tools/foto.js` le recupera in automatico: per ogni proposta apre la fonte di riferimento (`verifica.linkAutorevole`) e il link del proponente, ma solo se il sito è nella whitelist, prende l'immagine principale della pagina (`og:image`, poi JSON-LD, poi `twitter:image`), scarta loghi e pixel di tracciamento, controlla che l'indirizzo risponda davvero con un'immagine e salva solo il campo `foto`.

```
node tools/foto.js              # prova a secco: stampa cosa farebbe
node tools/foto.js --scrivi     # salva su Firestore
node tools/foto.js --solo r_abc --forza
```

Serve un ambiente che raggiunga i siti delle fonti. Nel sandbox in cui l'app è stata costruita il proxy blocca tutto (risposta 403): da lì lo script elenca le proposte e il motivo, ma non scarica nulla. Domini da consentire per le 27 proposte attuali: `cucchiaio.it`, `turismofvg.it`, `aifb.it`, `docfriuli.eu`, `tirol.at`, `suedtirol.info`, `alto-adige.com`, `genusslandsuedtirol.it`, `trentinoqualita.it`, `taccuinigastrosofici.it` e `firestore.googleapis.com`, più gli host dove le fonti tengono le immagini (lo script dice quali blocca). In alternativa si aggiunge la foto a mano dalla scheda del piatto.

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

**Stato al 3 ottobre 2026.** Per i piatti con link assente, non valido o generico (Salame all'aceto, Granseola, Capriolo in salmì, Tirtlan, Tripudio di wurstel, Carré di costine) e per quattro link giornalistici (Brovada e muset, Cjarsons, Fegato alla veneziana, Tiramisù) è stata aggiunta in `verifica.linkAutorevole` una fonte trovata con la ricerca web. **Le pagine non sono state aperte** (il sandbox non raggiunge i siti di ricette): titolo e indirizzo vengono dai risultati di ricerca, e la nota di ogni scheda lo dice. Il link del proponente non è stato modificato.

**Nota di rete**: nella sessione in cui l'app è stata costruita il proxy bloccava quasi tutti i siti di ricette. Per verificare i link va ampliato l'accesso di rete dell'ambiente.

## Dati (db dell'artifact)

| Collezione | Documento | Contenuto |
|---|---|---|
| `participants` | `p_<nome>` | `name`, `confirmed`, `organizer`, `ord` |
| `recipes` | `r_…` | `foto{url,pagina,fonte,autore,data}`, `ownerIds` (team responsabili; `teamIds` è il vecchio campo delle squadre, svuotato alla prima modifica), `sugId` (piatto del catalogo da cui nasce), `title`, `category`, `region`, `link`, `note`, `proposerId`, `ownerIds[]`, `teamIds[]`, `slot` (`ven-cena`, `sab-pranzo`, `sab-cena`, `dom-pranzo` o `""`), `verifica{}`, `serves`, `porzione`, `ingredients[{name,qty,unit,shop}]`, `steps[]`, `fasi[{label,ore}]`, `preparabileACasa`, `vini[{nome,bottiglie}]`, `consigli` |
| `votes` | `<participantId>` | `rank{<categoria>: [recipeId…]}` (le prime posizioni, dal migliore, in lista compatta), `rankAt{<categoria>: ms}` (quando è stata salvata, per il segno «Nuova»), `formato` (`dieta`, `bouffetta`, `esagerare`) |
| `spesa` | slug dell'ingrediente | `comprato`, `chi`, `pack{base,size}` |
| `meta` | `backups` | indice delle copie: `items[{id,at,motivo,by,n}]` |
| `backups` | `b…` | copia completa: `p`,`r`,`v`,`s`,`m` (JSON) |
| `settings` | `main` | `fase`, `dataVen`, `arrivo`, `riservaOre`, `margine`, `orari{}`, `scad{propFine,votoIni,votoFine}` (ISO con offset), `scadAuto`, `formato` (vuoto = decide il voto). Il vecchio `cap` non è più usato: i tetti vengono dal formato |

Seed iniziale (artifact): `seed/seed.json`; nella versione pubblica il pulsante "Carica i 15 confermati" scrive lo stesso elenco (partecipanti confermati e impostazioni).

## Sviluppo

```
node build.js          # assembla src/ in index.html (artifact) e docs/index.html (versione pubblica)
node test/flow.js      # artifact: prova end-to-end in Chromium con un db finto in memoria
node test/sugg.js      # sezione Suggerimenti: solo piatti da proporre, foto e segno AI, Equilibrio, filtri, proposta precompilata, carta dei vini
node test/rank.js      # voto a posizioni: numero a mano, spostamento dei doppioni, trascinamento (mouse e dito), punteggio, spareggio a cascata, pari merito
node test/menu-dnd.js    # Menu a due colonne: pasti, exit poll top 5, trascinamento (da exit poll, tra pasti, verso exit poll), permessi, telefono
node test/menu-layout.js # scheda Menu: colonne dei giorni e pasti, titoli leggibili (chiaro, scuro, telefono)
node test/tabs.js      # barra delle schede: frecce, scorrimento, scheda attiva visibile, posizione, fase del progetto
node test/band.js       # scadenze, countdown, fasi automatiche, voto sul formato, scelta A/B in Proposte, whitelist
node test/libro.js      # «Giorni Golosi»: vista Il libro, segno Dal libro, filtro, riquadro e ricetta del libro nella scheda
node test/foto.js       # foto del piatto: card, scheda, aggiunta/cambio/rimozione, fonte citata, immagine non raggiungibile
node test/foto-tool.js  # tools/foto.js contro un server finto (pagine, immagini, API Firestore)
node test/owners.js     # team responsabili: aggiungersi/togliersi, permessi, gestione del team
node test/cats.js       # zuppe unite ai primi, griglia ai secondi, dati e voti già esistenti
node test/standalone.js # versione pubblica: Firestore finto, cookie, merge dei voti
```

`test/flow.js` usa dati inventati solo in memoria: non scrive nulla nell'artifact. I test usano un orologio finto (`window.GB_NOW`, sabato 3 ottobre 2026, 12:00) così non dipendono dal giorno in cui girano.

## Accesso

Il db condiviso accetta scritture da chi ha livello Contributor o superiore sull'artifact. Gli amici devono poter aprire la pagina con un account claude.ai e avere accesso in modifica dal menu Condividi. L'identità è solo il nome scelto all'ingresso: va bene tra amici, non è un'autenticazione.

## Catalogo dei suggerimenti

I dati sono in `src/js/05-sugg-data.js` (`SUG`). Ogni piatto ha `lv` (livello della fonte, vuoto = da assegnare), `weak` (link generico o non coerente) e `src` (fonti). Dopo aver verificato i link aggiorna questi campi e lancia `node build.js`. Il campo `k` contiene le chiavi con cui una proposta fatta a mano viene riconosciuta come quel piatto; `f` è la famiglia usata per segnalare piatti simili. I vini con `vs:'sug'` sono abbinamenti suggeriti, non presenti nei documenti. Un vino con 0 bottiglie in una scheda è solo un abbinamento: non entra nella lista della spesa.
