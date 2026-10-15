# Refinement soft fantasy pink

La specifica è il testo allegato insieme a `mockup_riferimento.zip`. Il mockup
composito è solo un riferimento: nessuno screenshot viene renderizzato come UI.

La nuova Home usa `apps/mobile/assets/jimo/anime-theme/hero_home.png`, copiato
senza trasformazioni dal pacchetto. SHA-256:
`aaa293e464d013a68dec1265768cef5653dde7a4c1ae4f3ba2de5f88eefeacef`.
Il mapping Home precedente è superato da questo asset. Gli altri PNG originali
restano invariati.

Il crop mantiene orientamento, proporzioni, capelli, mano e scarpa della posa
seduta. Il banner nella parte superiore del PNG è fuori dalla finestra hero.
L'altezza della sola Home è proporzionata alla larghezza; un provider geometrico
locale impedisce che questo ritocco allarghi anche le hero delle altre tab.
HOME resta in alto a sinistra, con il saluto contenuto nella colonna sinistra.

Il fondo e le superfici principali condividono il rosino `#FFF7FA`. Le superfici
secondarie restano blush; popup, navbar, bordi e ombre derivano dalla stessa
palette. `@jimo/ui` fornisce profondità, luce superiore dei pulsanti e ombra
interna dei campi, riutilizzate nei form e nei dialog. Pressed, disabled, busy,
focus, accessibilità e reduced motion restano gestiti dai componenti reali.
Inter e Cormorant Garamond sono invariati, senza nuovi font o asset generati.

I giorni con allenamento hanno icona manubrio, accento e fondo rosa; i riposi
restano righe neutre. I dettagli degli esercizi sono solo nel dialog giorno.
L'eliminazione è un'azione testo centrata sotto Modifica giorno, con conferma.
L'ordinamento preesistente resta disponibile dal controllo Riordina vicino al
conteggio esercizi, senza il precedente pulsante Altre azioni.

I controlli numerici mantengono label, meno, valore e più sulla stessa riga anche
durante la digitazione. Il valore è un vero input; a 320 px la colonna numerica
si compatta conservando target di almeno 48 px. Per il piramidale le ripetizioni
sono esplicitamente riferite alla serie selezionata, senza duplicare un target
generico. Dati, schemi e prescrizioni non cambiano.
Sul web lo scroll automatico che rivela il campo non deve chiudere la tastiera:
il dialog usa `keyboardDismissMode="none"` su questa piattaforma, mantenendo
`on-drag` nativo. La regressione verifica visibilità e focus a viewport ridotto.

Il personaggio trasparente del Profilo è circa l'8% più piccolo; seduta, bordo
del body e avatar fra le gambe restano ancorati agli stessi landmark. Il dialog
foto mantiene camera, galleria, annullamento e rimozione esistenti. Progressi
usa lo stesso originale, con blur atmosferico e luce ambientale leggermente
più visibili, senza creare un nuovo ritaglio grafico.

Calendario Home, giorni vuoti/riposo, Start/Riprendi e modifiche usano i DTO e
le mutation/cache già esistenti. Le verifiche browser controllano che aggiunte,
modifiche e cancellazioni si riflettano nella Home, anche con sync indisponibile;
non viene introdotta una seconda copia dei dati della giornata.

Le prove UI usano fixture locali con credenziali esterne rimosse dal processo.
Viewport: 320×740, 390×780, 393×851 e 430×860, inclusi safe area e testo al 130%.
La tastiera browser è una simulazione con riduzione del viewport: la verifica
su tastiera fisica ed Expo Go resta distinta. API, schema, migrazioni, motore
workout e production non sono modificati.
