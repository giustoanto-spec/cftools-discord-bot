# Avvio su Discloud

Usa il branch `feat/complete-cftools-features`, che contiene le nuove funzioni
e `discloud.config`. La pull request non deve essere integrata per scaricare
e caricare questo branch.

## Configurazione rapida dal pannello

Lo ZIP include i modelli Discloud. Il comando `npm run start:discloud` crea
`config/config.js`, `config/servers.js` e `config/.env` soltanto se assenti,
senza sovrascrivere configurazioni esistenti. Al primo avvio, senza credenziali,
il bot si ferma e mostra nella console i nomi delle chiavi mancanti.

Nel file manager del pannello modifica `config/.env`: inserisci
`DISCORD_BOT_TOKEN`, `CLIENT_ID`, `DISCORD_OWNER_ID`,
`CFTOOLS_API_APPLICATION_ID`, `CFTOOLS_API_SECRET`, `CFTOOLS_SERVER_API_ID`
e `SERVER_IPV4`. `SERVER_PORT` è 2302 per impostazione predefinita.
`DISCORD_ADMIN_ROLE_IDS` e `DISCORD_MOD_ROLE_IDS` accettano ID separati da virgole.
Salva e avvia nuovamente il bot. Nessun segreto è incluso nei modelli.

Le funzioni che richiedono canali specifici sono inizialmente disattivate.
Per attivare lo stato server compila `SERVER_STATUS_CHANNEL_ID`; per le altre
funzioni puoi modificare `config/servers.js` seguendo INSTALLAZIONE_IT.md.

## Configurazione manuale alternativa prima del caricamento

1. Copia `config/config.example.js` in `config/config.js` e sostituisci gli ID
   di esempio con il tuo owner e i ruoli autorizzati. Rimuovi gli sviluppatori
   di esempio e i ruoli che non usi.
2. Copia `config/servers.example.js` in `config/servers.js` e imposta gli ID
   CFTools, nome, IP, porta e i canali Discord del tuo server. Disabilita le
   funzioni di cui non hai configurato i canali.
3. Copia `config/.env.example` in `config/.env`. Inserisci il token del bot,
   `CLIENT_ID`, `CFTOOLS_API_APPLICATION_ID` e `CFTOOLS_API_SECRET`.
   Mantieni `USE_API=false`: viene ospitato un bot, senza porta HTTP pubblica.
4. Comprimi i contenuti del progetto in uno ZIP: `discloud.config` e
   `package.json` devono trovarsi direttamente nella radice dello ZIP.
   Includi la cartella `vendor`, i file di configurazione compilati e `.env`.
   Escludi `.git`, `node_modules`, test, log e vecchi ZIP. Non pubblicare questo
   archivio: contiene le credenziali che saranno consegnate all'hosting scelto.

I tre file di configurazione personali sono esclusi da Git. Per questo un
download GitHub del repository non è ancora pronto all'avvio senza completarli.
Conserva una copia del database prima di sostituire un'applicazione esistente.

## Upload e avvio

Apri il pannello Discloud, accedi, premi **+ Upload** e seleziona **Upload ZIP**.
Carica l'archivio e controlla la console: l'installazione esegue
`npm ci --omit=dev`, poi il bot parte con `npm run start:discloud`.

La configurazione richiede `VERSION=latest`, ossia la versione Node LTS
offerta da Discloud. Verifica nei log che sia Node 22 o superiore.
Se la versione disponibile è precedente, aggiorna il runtime prima di avviare.

Il file è impostato a **100 MB**, pari al limite del piano gratuito pubblicato
da Discloud. Questa quantità non è una garanzia che il bot completo rientri nel
limite: controlla il consumo reale dopo l'avvio e durante i comandi. Se raggiunge
il limite o si arresta, occorre più RAM; il progetto non attiva abbonamenti.
Se possiedi già più memoria disponibile, adegua `RAM` in `discloud.config`.

Per limitare il carico iniziale puoi disattivare `AUTO_LB_ENABLED`, chat feed e
stato automatico, per poi attivarli una funzione alla volta. Gli endpoint CFTools
richiedono i grant corretti. Su Discord il bot deve avere i permessi necessari
nei canali configurati e Message Content Intent se usi il chat feed.

## Verifica finale

- La console conferma il login del bot senza errori di configurazione.
- Il bot compare online nel tuo server Discord.
- `/server-info` recupera il server corretto.
- Un comando di sola lettura, per esempio `/whitelist view`, verifica i grant.
- RAM e database vengono controllati dopo un riavvio dal pannello.

I comandi amministrativi sono accessibili soltanto ai ruoli configurati.
Il servizio gratuito non include tutte le funzionalità dei piani superiori:
non è impostato `AUTORESTART`, che la documentazione riserva al piano Platinum
o superiore.

Documentazione ufficiale:
- https://docs.discloud.com/en/how-to-host-using/dashboard
- https://docs.discloud.com/en/configurations/discloud.config
- https://docs.discloud.com/en/configurations/discloud.config/versions
- https://discloud.com/plans
