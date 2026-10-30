SHELL := /bin/bash

.PHONY: help compose-up compose-down compose-rebuild import-osm map-up map-logs

help:
	@echo "  make map-up          - build/start map client at http://localhost:8080"
	@echo "  make map-logs        - show map client logs"
	@echo "  make compose-up      - docker compose up"
	@echo "  make compose-down    - docker compose down"
	@echo "  make compose-rebuild - docker compose down -v && up --build"
	@echo "  make import-osm      - import all geofabric/pbf/*.pbf files into PostGIS"

compose-up:
	docker compose up -d

map-up:
	docker compose up -d --build map-client

map-logs:
	docker compose logs --tail=100 -f map-client

compose-down:
	docker compose down

compose-rebuild:
	docker compose down -v
	docker compose up --build

import-osm:
	@set -e; \
	cd geofabric/imposm; \
	shopt -s nullglob; \
	files=(../pbf/*.pbf); \
	if [ $${#files[@]} -eq 0 ]; then \
		echo "No PBF files found in geofabric/pbf" >&2; \
		exit 1; \
	fi; \
	cache_flag=-overwritecache; \
	for file in "$${files[@]}"; do \
		echo "Reading $$file"; \
		./imposm import -mapping mapping.yml -read "$$file" "$$cache_flag"; \
		cache_flag=-appendcache; \
	done; \
	./imposm import -mapping mapping.yml -write -connection postgis://geoserver:geoserver@localhost:5435/geoserver -deployproduction
