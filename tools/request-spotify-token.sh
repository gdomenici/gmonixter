#!/usr/bin/env bash

# See:
# https://developer.spotify.com/documentation/web-api/tutorials/getting-started#create-an-app
# and
# https://developer.spotify.com/dashboard/8ff46945b7414e13a7cabb0e9ac3ca8d/settings

# Use playlist: https://open.spotify.com/playlist/1Bpgr72vuJwYXYqbdahtOO

curl -X POST "https://accounts.spotify.com/api/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=client_credentials&client_id=8ff46945b7414e13a7cabb0e9ac3ca8d&client_secret=ba4f17e84dbb48c9ba8f3c3caa36caf6"
