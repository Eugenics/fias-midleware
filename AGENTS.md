# Repository Guidelines

## Project Structure & Module Organization

This project serves as an intermediate infrastructure layer for the sibling projects `../fias-parser` and `../fias-downloader`. It provides Docker Compose services for Grafana monitoring, GeoServer, PostGIS storage, and an OpenLayers map client.

- `docker-compose.yml`: services, port mappings, persistent volumes, and networks.
- `Makefile`: commands for managing the deployment.
- `web/`: map client, Node tests, Vite build, and Nginx WMS proxy.
- `README.md`: map client setup and usage.
- `deploy/grafana/provisioning/datasources/datasource.yml`: Prometheus connection settings.
- `deploy/grafana/provisioning/dashboards/dashboards.yml`: file-based dashboard provisioning.
- `deploy/grafana/dashboards/fias-downloader.json`: dashboard panels and PromQL queries.

## Build, Test, and Development Commands

Run commands from the repository root with Docker Compose available:

- `make help`: display deployment commands.
- `make map-up`: build/start the map client at port `8080` (override with `MAP_CLIENT_PORT`).
- `make map-logs`: inspect map client logs.
- `docker compose config --quiet`: validate Compose configuration without starting services.
- `make compose-up`: start all services; Grafana uses port `3000`, GeoServer uses `8181`.
- `make compose-down`: stop and remove containers while retaining the named data volume.
- `make compose-rebuild`: remove containers **and volumes**, then start with `--build` in the foreground. This deletes persisted Grafana, GeoServer, and PostGIS data.
- `docker compose logs grafana`: inspect startup and provisioning errors.

Grafana uses the external network `fias-downloader-network`, which must already exist. Compose automatically creates `fias-geoserver-network` for GeoServer and PostGIS on startup and removes it on `compose-down`. Prometheus must be reachable from Grafana at `http://fias-downloader-prometheus:9090`; this repository does not start Prometheus.

## Coding Style & Naming Conventions

Use two-space indentation for YAML and JSON, and tabs for Makefile recipes. Preserve existing dashboard formatting and descriptive panel titles. Keep datasource UID `prometheus` consistent across provisioning and dashboard references. Use descriptive, hyphenated dashboard filenames and unique panel IDs. No formatter or linter configuration is included.

## Testing Guidelines

For map client changes, run `cd web && npm ci && npm test && npm run build`; tests use the built-in Node runner. No coverage threshold is configured. Validate dashboard syntax with `python3 -m json.tool deploy/grafana/dashboards/fias-downloader.json > /dev/null` and validate Compose before submitting changes. For dashboard changes, start Grafana, check provisioning logs, and confirm affected panels display expected data against the running Prometheus service. Save dashboard changes in the tracked JSON file.

## Commit & Pull Request Guidelines

Git history is unavailable in this workspace, so no established commit convention can be verified. Use concise, imperative commit subjects, such as `Fix download progress query`. Describe the change, validation performed, and any network or persistence impact in pull requests. Link relevant issues and include screenshots for visible dashboard changes.

## Security & Configuration Tips

The Compose file uses local-development credentials `admin` / `admin`. Replace them before exposing Grafana beyond a trusted development environment; never commit real credentials.

## GeoServer Storage

In GeoServer, add a PostGIS store with host `postgis`, port `5432`, database `geoserver`, schema `public`, and user `geoserver`. The password defaults to `geoserver` for local development; override it with `POSTGIS_PASSWORD` before first startup. Initialization variables only apply to an empty data volume. PostgreSQL is accessible within the Docker network; no host port is published. The image initializes PostGIS automatically; GeoServer stores must be configured separately.
