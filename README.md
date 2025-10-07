# RickShare – Scaffold

This project provides a basic scaffold for **RickShare**, a short-distance rickshaw ride-sharing app.

- **Backend**: Node.js + Express
- **Frontend**: Plain HTML/CSS/JS (can be upgraded to React later)
- **Map**: Leaflet.js with OpenStreetMap tiles
- **QR Codes**: qrcode.js placeholder integration

## Structure

```
client/
  index.html           # Root HTML, loads Leaflet + qrcode.js and app script
  assets/
    styles.css         # Basic UI styles and map dimensions
  src/
    main.js            # Map init, simple ride creation flow, QR generation
server/
  package.json         # Backend deps, scripts
  src/
    index.js           # Express app bootstrap, routes mount, health endpoint
    routes/
      rides.js         # Rides REST endpoints
    controllers/
      ridesController.js  # Rides business logic
    services/
      db.js            # JSON-file-backed mock DB service
    db/
      mock.json        # Mock data file (auto-created at runtime if missing)
    middleware/
      errorHandler.js  # Central error handler
```

## Run backend

From `server/`:

```bash
npm install
npm run dev
```

The API listens on `http://localhost:4000`.

- List rides: `GET http://localhost:4000/api/rides`
- Create ride: `POST http://localhost:4000/api/rides`

Example create body:

```json
{
  "riderName": "Anika",
  "pickup": { "lat": 12.9716, "lng": 77.5946 },
  "destination": { "lat": 12.9352, "lng": 77.6245 }
}
```

## Open client

Open `client/index.html` directly in a browser. For modern browsers, you can also serve it via a simple file server:

```bash
npx serve client
```

Click the map to set pickup; Alt/Option+Click to set destination. Press "Create Ride" to POST to the backend and generate a QR for the returned ride ID.

## Notes

- This scaffold is intentionally minimal and ready to swap the mock DB with Firebase.
- If you want a React client, we can add a Vite React setup next.
