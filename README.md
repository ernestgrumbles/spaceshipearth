# Spaceship Earth / Perihelion OS

A planetary bridge interface that treats Earth as a spacecraft and presents real-time astronomical, geophysical, and environmental data from the perspective of a crew member aboard Spaceship Earth.

## Current build

This first repository version focuses on the core visual concept:

- Three.js Earth render
- NASA-style Earth, cloud, night-light, and Moon textures loaded from public URLs
- Moon in frame
- Sun vector and subsolar point
- Home Port geolocation marker
- Follow Me mode
- Distance traveled since opening display
- Optional live feeds: USGS earthquakes, NOAA solar wind, ISS position

## Run locally

Because the app uses JavaScript modules, run it from a local server rather than opening the file directly:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## GitHub Pages

This repo is designed to work on GitHub Pages. Enable Pages from the repository Settings using the `main` branch and root folder.

## Mission rule

The user should always feel they are standing on the bridge of a vessel called Earth.
