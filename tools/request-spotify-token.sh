#!/usr/bin/env bash

# See:
# https://developer.spotify.com/documentation/web-api/tutorials/getting-started#create-an-app
# and
# https://developer.spotify.com/dashboard/8ff46945b7414e13a7cabb0e9ac3ca8d/settings

# Causes the .env variables to be set in the shell
set -a && source .env && set +a

SPOTIFY_RESPONSE=$(curl -X POST "https://accounts.spotify.com/api/token" \
      -H "Content-Type: application/x-www-form-urlencoded" \
      -d "grant_type=client_credentials&client_id=${SPOTIFY_CLIENT_ID}&client_secret=${SPOTIFY_CLIENT_SECRET}")
SPOTIFY_TOKEN=$(echo "$SPOTIFY_RESPONSE" | jq -r ".access_token")

# Featured playlists:
# curl -X GET "https://api.spotify.com/v1/browse/featured-playlists" \
#       -H "Authorization: Bearer $SPOTIFY_TOKEN"

# Categories:
curl -X GET "https://api.spotify.com/v1/browse/categories?limit=50" \
      -H "Authorization: Bearer $SPOTIFY_TOKEN"
