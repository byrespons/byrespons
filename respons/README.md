# Respons

Kjør `node respons/server.mjs` fra prosjektmappen med Node.js installert. Åpne http://127.0.0.1:8765 og velg **Prøv en eksempelhistorie**.

Intervjuet har fem spørsmål. Oppfølgingsspørsmålet viser et utdrag fra kundens eget svar, og bokutkastet setter sammen teksten om minnet. Svar, utkast og prøvevarer lagres lokalt i nettleseren. Du kan åpne et lagret utkast via Mine prosjekter. Bruk fiktive opplysninger under utprøving.

Formatene og tilleggsvalgene har eksempelpriser. Ved PDF-valg kan du bruke nettleserens utskriftsdialog til å lagre bokteksten som PDF. Softcover og hardcover kan prøves som formatvalg i en simulert bestilling.

`story.js` inneholder de lokale reglene for utkast og formatforslag. OpenAI-tilkobling er et eget steg etter den lokale testen. En fremtidig API-nøkkel hører hjemme på serveren.

## Koble Alma til OpenAI

Sett `OPENAI_API_KEY` og `OPENAI_MODEL` i miljøet til den lokale serveren og start serveren på nytt. Bruk en modell API-prosjektet ditt har tilgang til. Oppbevar nøkkelen utenfor kildekoden. Bruk fiktive intervjusvar til første test.

Valget **Skriv historien med Alma** sender intervjuteksten til OpenAI. Bildene lagres i nettleseren og følger med i forhåndsvisningen og når du lagrer PDF fra utskriftsdialogen. Brukeren kan også velge et lokalt utkast.

Alma tilbyr 4 eller 8 ekstra sider under intervjuet, med henholdsvis 2 eller 4 ekstra spørsmål. Prisene og sidetallet vises i bestillingsflyten. Prototypens PDF er en utskriftsvisning og settes ikke opp som en bok med det valgte sidetallet.

Når du velger **Se prøvebestilling**, åpnes bokforhåndsvisningen på omslaget. Bla gjennom oppslagene for å se bokteksten og bildene. Forhåndsvisningen bruker den godkjente, redigerte teksten.

## Konto og prosjektlagring

Kjør `account.sql` én gang i SQL Editor i et Supabase-prosjekt. Sett
`SUPABASE_URL` og `SUPABASE_PUBLISHABLE_KEY` i servermiljøet. Bruk prosjektets
publishable key. Serveren deler denne med nettleseren. Supabase-koden for
privilegert tilgang trengs ikke. Prosjekter tillater bare lesing og skriving av
rader som eies av den innloggede kontoen.

I Supabase Auth må e-postmalene for Magic Link og Confirm signup vise `{{ .Token }}` slik at
Respons kan be om en sekssifret kode. Konfigurer godkjent e-postlevering før
eksterne testere inviteres. Start serveren på nytt etter miljøendringene.

Gjester kan lage og redigere et utkast mens fanen er åpen. Prosjektet sendes
til Supabase ved eksplisitt lagring etter innlogging. Tidligere lokale
prototypeprosjekter overføres ikke automatisk.

For den lokale oppstarten med `start-alma.zsh` kan de to Supabase-verdiene
legges i `.env.local` ved siden av `.env.example`. Oppstartsprogrammet
leser filen automatisk. OpenAI-nøkkelen kan fortsatt legges inn via Terminal.
