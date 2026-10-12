# Happovaltteri · Suomen kovin JavaScript-koodari

Matrix-henkinen React-sivu (Vite + React 19). Canvas-pohjainen koodisade, glitch-otsikko,
terminaalianimaatio, bullet time (hiiri nimen päälle) ja punainen/sininen pilleri -teemat.

## Kehitys
```bash
npm install
npm run dev
```

## Tietokanta
Palvelin lukee `DATABASE_URL`-ympäristömuuttujan (Postgres) ja luo taulun `pill_choices` itse käynnistyessään.
Ilman muuttujaa sivu toimii normaalisti, mutta pilleritilastot ovat pois käytöstä.
API: `POST /api/pill` `{ "pill": "red|green|blue" }` ja `GET /api/stats`.

## Tuotanto (NordicHost)
```bash
npm run build   # tekee dist/-kansion
npm start       # server.js tarjoilee dist/-kansion portissa $PORT
```
