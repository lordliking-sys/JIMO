# Popup Scheda e navbar flottante

Specifica e reference: `JIMO_popup_navbar_refinement.zip`, `PROMPT_CODEX.txt`, `01_popup_reference.png` e `02_navbar_reference.png`. I mockup guidano la UI; tutti i controlli sono componenti React Native. Gli artwork dell'app rimangono quelli originali.

## Popup centrali

`QuickPlanPopup` usa un unico modal nativo per Nuova scheda/Cambia scheda, anche quando si passa dalla lista al form. `ProgramPopup` centra il pannello chiaro da 84% della larghezza, massimo 460 px, radius 30 px, padding 20/24 px e shadow morbida. Lo sfondo della Scheda resta visibile attraverso un backdrop scuro traslucido; il popup blocca i comandi sottostanti.

- Nuova scheda: nome, descrizione opzionale, durata iniziale di 8 settimane con controlli +/- e input numerico, data opzionale con il date picker esistente, Crea scheda e Annulla. Usa lo stesso schema Zod e la stessa mutation API; salva una bozza e chiude sulla stessa Scheda. Il pass successivo aggiunge il popup essenziale di Modifica e rimuove le settimane dalla pagina principale: [daily-plan-refinements.md](daily-plan-refinements.md).
- Cambia scheda: righe con nome/durata, pill rosa ATTIVA con check e pill grigia NON ATTIVA con freccia. La conferma è inline; Attiva usa la mutation esistente, aggiorna i dati e chiude il popup. La modifica di una scheda rimane raggiungibile dalla conferma o tenendo premuta la riga; le azioni di accessibilità espongono lo stesso comando.
- X e Android back chiudono il popup vuoto. Le modifiche non salvate richiedono una conferma di scarto; il tap sul backdrop le preserva. I comandi di chiusura restano bloccati durante il salvataggio/attivazione.
- Intestazione e footer rimangono fuori dallo scroll interno. Gli eventi della tastiera limitano l'altezza disponibile; il campo focalizzato viene rivelato nel viewport effettivo dello scroll. Su web si leggono direttamente le coordinate del port per evitare misure asincrone superate; su native si ignorano misure relative a un campo che ha perso il focus. Il popup rimane centrale anche con spazio ridotto.
- Apertura con fade e scale 0.96→1 in 200 ms, senza spring/bounce. Reduced motion mostra immediatamente il risultato finale.

L'editor completo di una scheda e gli editor di giorni/esercizi mantengono i loro overlay già approvati. Il passaggio a quell'editor attende la chiusura del popup su iOS. Non cambia la route Scheda.

## Navbar e Progressi

`FloatingTabBar` sostituisce soltanto la presentazione del tab bar del navigator esistente. Mantiene le quattro destinazioni, lo stato di selezione, gli eventi tabPress/tabLongPress e il tab Workout nascosto.

La capsula usa margini laterali 16/24 px, distanza inferiore safe area + 12 px, altezza 80 px (fino a 84 px con testo ingrandito), radius 34 px, fondo chiaro leggermente traslucido e shadow rosa morbida. La pill interna mantiene la stessa geometria per ogni tab. Icona/label attive sono pink; le altre charcoal. I quattro target rimangono sopra 48 px.

Reanimated interpola la posizione della pill in 240 ms con easing cubic; l'icona selezionata passa da 0.96 a 1.05 e torna a 1. La label interpola colore/opacità in 230 ms. I cambi rapidi sostituiscono l'animazione in corso; reduced motion disabilita le transizioni.

La navbar comunica al navigator l'intera altezza occupata, inclusi gap e safe area. Il padding già basato su `useBottomTabBarHeight` conserva il contenuto scrollabile sopra la capsula, senza modificare il layout Home. Panoramica/Forza/Volume/Frequenza ora sono dentro il body Progressi, dopo il padding superiore; i dati, filtri e grafici sono invariati.

## Verifica e limiti

Le prove usano soltanto fixture locali: nessuna connessione a Neon, Clerk, OpenAI o production. Non sono modificate API, schema, Auth, cache/sync o workout engine; nessuna migration è creata o applicata.

Le viewport browser sono 320×740, 390×780, 393×851 e 430×860, con safe area da 24/47 px sopra e 48/34 px sotto. Si verificano dismiss/X/Escape, preservazione delle modifiche, creazione bozza e double tap, attivazione, liste lunghe, spazio ridotto dalla tastiera, pill e cambi rapidi, animazione abilitata/reduced motion, tab Progressi dentro il body e scroll sopra la navbar. Il test nativo esegue il callback `onRequestClose` del componente Modal per Android; il rendering OS e la tastiera fisica richiedono una prova Expo Go su dispositivo reale.

Lint, typecheck e 189 test locali sono superati, di cui 149 mobile. I 61 casi browser selezionati sono superati nella verifica finale, inclusi i flussi precedenti della Scheda, il fix dati Home e l'isolamento dell'avatar per account. Il confronto SHA-256 conferma 244 file protetti invariati, comprendenti artwork, Home, API, Auth, cache/sync, schema condiviso e workout engine.

`pnpm build` superato: sei task, con export Android/iOS/web e `EXPO_PUBLIC_AUTH_TEST=false`. `pnpm format:check` superato. La scansione delle credenziali nei sorgenti e nei bundle è superata senza mostrare alcun valore riservato. Nessun APK/IPA, migration o deploy è eseguito.
