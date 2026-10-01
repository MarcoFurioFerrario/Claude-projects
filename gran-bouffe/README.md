# Gran Bouffe Triveneto

Web app (in italiano) per organizzare la Gran Bouffe: proposte, votazioni, selezione del menu, schede piatto, lista della spesa consolidata e cronoprogramma. Modellata sul foglio dell'edizione 2025 (Campania).

Pubblicata come artifact di claude.ai: <https://claude.ai/artifact/WFrai8Hzx76GofBwUjNkt9>

## Come si usa

1. **Persone**: accesso con il nome (nessuna password). I 15 confermati sono precaricati; si possono aggiungere altri e spuntare chi è presente.
2. **Proposte** (fase *Proposte*): ogni proposta richiede proponente (chi è loggato), almeno un responsabile della produzione, categoria e link alla ricetta.
3. **Votazioni** (fase *Voto*): ognuno ordina le proposte di ogni categoria dalla migliore alla peggiore. Il punteggio è il piazzamento medio normalizzato (100 = sempre primo).
4. **Menu** (fase *Menu*): gli organizzatori assegnano i piatti ai pasti (5 venerdì sera, 12 sabato, 5 domenica; modificabile). "Suggerisci dai voti" propone una selezione bilanciata per categoria e tempi.
5. **Scheda piatto**: proponente, responsabili, squadra (ci si può unire), ingredienti scalati sui confermati, procedimento, vini, tempi. "Genera bozza con Claude" compila una bozza da controllare.
6. **Spesa**: lista unica, somma gli ingredienti uguali tra piatti (anche con unità diverse), arrotonda per eccesso, calcola le confezioni, assegna chi compra, copia per WhatsApp o scarica CSV.
7. **Programma**: finestre di tempo utili per pasto (arrivo, orari) e cronoprogramma. Un piatto che richiede più ore di anticipo di quelle disponibili non può stare in quel pasto, a meno che la parte lunga si prepari a casa.

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
| `recipes` | `r_…` | `title`, `category`, `region`, `link`, `note`, `proposerId`, `ownerIds[]`, `teamIds[]`, `slot` (`ven-cena`, `sab-pranzo`, `sab-cena`, `dom-pranzo` o `""`), `verifica{}`, `serves`, `porzione`, `ingredients[{name,qty,unit,shop}]`, `steps[]`, `fasi[{label,ore}]`, `preparabileACasa`, `vini[{nome,bottiglie}]`, `consigli` |
| `votes` | `<participantId>` | `rank{<categoria>: [recipeId…]}` (dal migliore) |
| `spesa` | slug dell'ingrediente | `comprato`, `chi`, `pack{base,size}` |
| `settings` | `main` | `fase`, `dataVen`, `arrivo`, `riservaOre`, `margine`, `orari{}`, `cap{ven,sab,dom}` |

Seed iniziale: `seed/seed.json` (partecipanti confermati e impostazioni).

## Sviluppo

```
node build.js          # assembla src/ in index.html (il file pubblicato)
node test/flow.js      # prova end-to-end in Chromium con un db finto in memoria
```

`test/flow.js` usa dati inventati solo in memoria: non scrive nulla nell'artifact.

## Accesso

Il db condiviso accetta scritture da chi ha livello Contributor o superiore sull'artifact. Gli amici devono poter aprire la pagina con un account claude.ai e avere accesso in modifica dal menu Condividi. L'identità è solo il nome scelto all'ingresso: va bene tra amici, non è un'autenticazione.
