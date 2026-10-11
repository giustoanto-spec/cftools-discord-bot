# CFTools Discord Bot — installazione e nuove funzioni

## Requisiti

- Node.js 22 o 24, oppure Docker con Compose.
- Un'applicazione Discord con bot e un server Discord in cui invitarlo.
- Un'applicazione CFTools Data API con accesso autorizzato al server e alla banlist.
- GameLabs installato sul server DayZ per le azioni GameLabs.

## Configurazione

```sh
cp config/.env.example config/.env
cp config/config.example.js config/config.js
cp config/servers.example.js config/servers.js
npm ci
```

In `config/.env` imposta `DISCORD_BOT_TOKEN`, `CLIENT_ID`,
`CFTOOLS_API_APPLICATION_ID` e `CFTOOLS_API_SECRET`. Conserva i segreti
soltanto nella configurazione locale. Il repository esclude questi file dal controllo versione.

In `config/config.js` sostituisci gli ID di esempio con il tuo `ownerId`,
i ruoli amministratori/moderatori e gli eventuali sviluppatori autorizzati.
Invita il bot con gli scope `bot` e `applications.commands`. Abilita il
Message Content Intent nel portale Discord se utilizzi il chat feed.

In ogni voce di `config/servers.js` imposta nome, `CFTOOLS_SERVER_API_ID`,
`SERVER_IPV4` e `SERVER_PORT`. Configura i canali delle funzioni esistenti
oppure disabilita quelle che non usi (`USE_CHAT_FEED`, `USE_KILL_FEED`,
`AUTO_LB_ENABLED`). Non lasciare gli ID di esempio attivi.

Per le nuove funzioni aggiungi:

```js
CFTOOLS_BANLIST_ID: 'ID_DELLA_BANLIST',
RCON_ENABLED: true,
GAMELABS_CUSTOM_ACTIONS: [
  // Sostituisci il codice con un'azione realmente registrata sul tuo server.
  { code: 'MyCustomAction', name: 'La mia azione', context: 'world' }
],
SERVER_STATUS_ENABLED: true,
SERVER_STATUS_CHANNEL_ID: 'ID_CANALE_STATO',
SERVER_STATUS_MESSAGE_ID: '',
SERVER_STATUS_INTERVAL_IN_MINUTES: 5,
```

RCon, stato automatico e azioni personalizzate sono disattivati negli esempi.
Banlist e whitelist richiedono gli opportuni grant nell'applicazione CFTools;
la disponibilità degli endpoint dipende dalle autorizzazioni del tuo account.
La whitelist del server va abilitata anche in CFTools: aggiungere una voce
con il bot non cambia l'impostazione globale della whitelist.

## Avvio

```sh
npm start
```

Con `REFRESH_SLASH_COMMAND_API_DATA=true` il bot registra i comandi all'avvio.
Attendi la propagazione dei comandi globali su Discord. Per Docker:

```sh
touch cftools-discord-bot.db
docker compose up -d --build
docker compose logs -f client
```

Mantieni il database e i file di configurazione persistenti sul computer/VPS
che ospita il bot. Il bot deve restare in esecuzione per aggiornare lo stato.

## Comandi aggiunti o completati

Tutti questi comandi richiedono il livello **Administrator** del bot e un
server esplicito. Le risposte sono private e le menzioni disattivate.

| Funzione | Comandi | Dettagli |
| --- | --- | --- |
| RCon | `/rcon server command` | Una singola istruzione, massimo 512 caratteri. CFTools conferma l'accettazione senza restituire l'output della console. |
| Coda prioritaria | `/priority-queue view`, `add`, `remove` | ID Steam64, durata e commento. Gli errori API non producono una conferma di successo. |
| Whitelist | `/whitelist view`, `add`, `remove` | Gestione per giocatore, comprese voci permanenti o a scadenza. |
| Banlist | `/banlist view`, `add`, `remove` | Ban per giocatore; visualizzazione paginata, motivo obbligatorio e rimozione tramite uno specifico `ban-id`. |
| GameLabs | `/gamelabs-action server action reference parameters` | Codici configurati per server, con suggerimenti automatici e parametri JSON tipizzati. |
| Stato server | Configurazione `SERVER_STATUS_*` | Un messaggio aggiornato periodicamente con online/offline, giocatori, coda e indirizzo. |

Per `add`, `duration` accetta **1–365 giorni** oppure **-1** per una voce
permanente. Zero e altri valori negativi sono rifiutati.
Per rimuovere un ban, recupera l'ID con `/banlist view`: il bot verifica che
appartenga al giocatore e alla banlist configurata. L'operazione elimina quella
voce, inclusa la sua cronologia in CFTools; non elimina gli altri ban.

Esempio di parametri GameLabs:

```json
{
  "amount": { "dataType": "int", "valueInt": 3 },
  "enabled": { "dataType": "boolean", "valueBoolean": true },
  "message": { "dataType": "string", "valueString": "Ciao" }
}
```

Sono accettati `int`, `float`, `string`, `boolean`, `vector` e `cf_itemlist`,
secondo il formato dell'SDK. Per `vector` usa `valueVectorX`, `valueVectorY`
e `valueVectorZ`. Il significato dei parametri dipende dall'azione installata.
I contesti validi sono `world`, `player`, `vehicle`, `object`; gli ultimi tre
richiedono un `reference` valido per quella risorsa. Per un giocatore usa il
Game Session ID corrente, non lo Steam64.

Il canale di stato richiede **View Channel**, **Send Messages**, **Embed Links**
e **Read Message History**. Il messaggio viene modificato anziché ripubblicato.
Al riavvio il bot lo cerca fra gli ultimi 100 messaggi del canale; per canali
molto attivi imposta `SERVER_STATUS_MESSAGE_ID` con l'ID del messaggio creato
dal bot. Errori di rete/API producono “Status unavailable”, distinto da “Offline”.
L'intervallo ammesso è 1–1440 minuti. Lo stato riflette i dati pubblicati da
CFTools, che possono avere un proprio ritardo di aggiornamento.

## Verifica

```sh
npm test
```

I test verificano gestione delle durate, errori API, operazioni su ban/whitelist/
priorità, validazione GameLabs, richieste RCon, recupero dei messaggi di stato,
registrazione di tutti i comandi e cache del token. Usano API simulate e non
effettuano modifiche al server DayZ. Il collaudo reale richiede le tue credenziali,
i grant e un server configurato. Nessun token è incluso nel progetto.

La heatmap delle statistiche resta disabilitata nel codice originale; questa
estensione copre le sei funzioni amministrative pianificate nel README.
