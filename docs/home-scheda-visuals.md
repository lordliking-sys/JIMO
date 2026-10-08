# Home e Scheda

La presentazione in `apps/mobile/src/main/` riproduce le reference del pacchetto
`JIMO_home_scheda_visual_pack.zip`. Le reference non vengono incluse nel bundle:
testi, card, indicatori, pulsanti, selettore settimane e navbar sono UI native.

Gli originali PNG sono copiati senza modifiche in
`apps/mobile/assets/jimo/main/`: `home-bg.png`, `scheda-bg.png` e
`program-days/{push,pull,legs,full-body}.png`. Il font Cormorant Garamond è quello
già presente nel pacchetto Workout; Inter rimane il font della microcopy/navbar.
I token di Home/Scheda sono locali e non cambiano il tema degli altri moduli.

## Dati e azioni

- Home legge il nome dal profilo già risolto e mantiene il saluto locale IT/EN.
  Se il nome manca, mostra il saluto senza aggiungere un nome fittizio.
- Programma, prescrizioni, sessione attiva e storico usano i query hook/cache
  esistenti. Una sessione attiva prevale sull'allenamento programmato.
- Il contatore esercizi conta esercizi conclusi con almeno una serie completata;
  non confonde serie completate con esercizi e non conta esercizi tutti saltati.
- Avvio/ripresa usano le azioni e la gestione dei conflitti del runtime già
  esistente. Aprire Home/Scheda o cambiare settimana non avvia un allenamento.
- Il calendario compatto distingue completato, oggi, programmato e vuoto;
  i completamenti sono assegnati alla data locale effettiva della sessione.
- La mini statistica Progressi mostra gli allenamenti reali delle ultime quattro
  settimane dall'endpoint summary esistente, indicando i dati salvati se stale.
  L'API non espone uno streak o una variazione percentuale globale: lo streak
  mostra `— / Non disponibile`, senza inventare numeri o un incremento.
- Scheda mostra il programma attivo, altrimenti una bozza o un programma
  disponibile; gli altri programmi e la gestione esistente restano raggiungibili.
- Le settimane sono ricavate da `startsOn` e `durationWeeks` e seguono settimane
  di calendario locali, inclusi i cambi di ora legale. Se manca uno dei due dati,
  viene mostrata soltanto **Questa settimana**. Le pill avanzano su una finestra
  di massimo tre settimane, senza scorrimento orizzontale.
- I check richiedono una sessione davvero completata del medesimo programma,
  giorno e settimana. La sessione in corso o il prossimo giorno disponibile
  determina l'accento corrente. Le altre card restano pianificate e apribili:
  nessun lock è aggiunto, poiché il motore non lo prevede.
- I nomi Push/Spinta, Pull/Tirata, Gambe/Legs e Full/Total Body selezionano
  artwork decorativi; un nome non riconosciuto usa una superficie neutra.

## Navigazione e adattamento

La navbar contiene **Home, Scheda, Progressi, Profilo**. La route `/workout`
resta disponibile tramite link diretto, con `href: null` nella navbar. Gli
allenamenti continuano ad aprirsi in `/workout/[id]`, fullscreen.

Home e Scheda possono scorrere verticalmente. Il calendario usa sette colonne
passive, i pulsanti hanno touch target di almeno 48 px, la navbar rispetta gli
inset e la timeline va su ulteriori righe se ci sono più di quattro giorni.
Non ci sono nuove animazioni; reduced motion è rispettato.

I test browser con fixture locali coprono 320×740, 390×780, 393×851, 430×860,
safe area, assenza di overflow orizzontale, IT/EN, nomi lunghi, fallback,
stati, selezione settimana e avvio/ripresa. Non sostituiscono la prova fisica
su Expo Go. Workout, builder, Progressi, Profilo, Auth, API e database non
vengono ridisegnati né modificati.
