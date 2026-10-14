# Artwork anime fantasy originali

Source of truth: `JIMO_anime_theme_assets.zip` e il suo `README_CODEX.txt`. I sei PNG sono copiati byte per byte in `apps/mobile/assets/jimo/anime-theme/`. Il confronto SHA-256 con lo ZIP originale conferma che nessun file è stato rigenerato, ritoccato, ricompresso o ridimensionato.

| File originale                   | Uso                                                                                     |
| -------------------------------- | --------------------------------------------------------------------------------------- |
| `home-hero-reference.png`        | Hero Home, catgirl al tramonto                                                          |
| `scheda-hero-reference.png`      | Artwork guerriera conservato nel pack originale                                         |
| `progressi-hero-reference.png`   | Hero Progressi, atmosfera crimson                                                       |
| `profilo-terrace-background.png` | Sfondo del hero Profilo                                                                 |
| `profilo-character-overlay.png`  | Personaggio trasparente che oltrepassa il bordo del hero Profilo                        |
| `profilo-mood-reference.png`     | Hero gotico della Scheda, su richiesta successiva; riferimento di atmosfera del Profilo |

I PNG contengono artwork; titoli, pulsanti, calendari, avatar, schede e grafici rimangono componenti React Native interattivi.

## Crop e leggibilità

`heroArtworkFrame` preserva il rapporto d'aspetto originale e allinea il crop verso i volti delle illustrazioni panoramiche. L'allineamento verticale protegge il volto anche in una viewport larga. Gli overlay di contrasto sono layer UI: non modificano i PNG. Il titolo Progressi sale di 4 px. I placeholder Workout e la palette dei controlli esistenti restano invariati.

Home conserva calendario settimanale, piano di oggi e prossimi esercizi. Il suo body riusa `SectionBody`, con lo stesso bordo arrotondato delle altre sezioni e contenuto direttamente nella superficie principale.

## Composizione Profilo

Lo sfondo terrazza rimane dietro la superficie arrotondata. `ProfileCharacter` è un livello trasparente separato, sopra la superficie, con `pointerEvents="none"`: lascia accessibili avatar e comandi. Il rail della terrazza e la seduta del personaggio coincidono con il bordo del body. Le gambe si estendono sopra la parte inferiore della UI.

`profileArtworkLayout` usa coordinate dell'originale 1024×1536: seduta a y=850 e centro del dock avatar a (512,1250). L'avatar circolare da 84 px occupa la zona trasparente tra le gambe. Nome ed email seguono il fondo del personaggio, senza sovrapporsi agli stivali. Le dimensioni si adattano allo spazio disponibile e alla safe area.

`ProfileAvatar` e `useLocalAvatar` sono invariati: foto locale, monogramma, permessi, cambio/rimozione, persistenza e isolamento per account continuano a funzionare. Il dock non ha ombre o halo scuro. Il fade condiviso della status bar mantiene il contrasto e sfuma nel hero, anche mentre le gambe scorrono sul body. Il clipping dei sottoelementi è disabilitato per conservare l'overflow del PNG durante lo scroll nativo.

## Funzionalità preservate

La Scheda continua a mostrare soltanto il programma attivo, con settimane, giornate e gestione in overlay. Creazione in bozza, cambio/attivazione, eliminazione con storico preservato, ricerca esercizi e thumbnail sono invariati. EMOM reale con preparazione di 10 secondi, round automatici e timer fluido, Piramidale reale, sync, Auth, API e schema database sono invariati. Le anteprime obsolete restano escluse dalla UI. Nessuna migration o connessione a Neon/production è richiesta da questo lavoro.

## Verifiche

- Test dei landmark di crop e composizione, inclusa una viewport larga.
- 183 test locali superati; lint e typecheck superati.
- Build monorepo superata: sei task, inclusi gli export Expo Android, iOS e web con la configurazione normale.
- 39 casi browser superati: 320×740, 390×780, 393×851, 430×860, testo al 130%, safe area, interazione avatar, persistenza e cambio account, calendario, flusso Scheda e metriche reali tramite fixture locali.
- Confronto byte per byte dei file protetti e SHA-256 di tutti e sei gli artwork originali.
- Scansione credenziali superata su 718 file, inclusi i bundle generati; nessun contenuto riservato stampato.

Le prove browser verificano React Native Web; rendering, status bar e picker camera/galleria su dispositivo fisico richiedono la verifica su Expo Go. I test non contattano Clerk, Neon o OpenAI reali.
