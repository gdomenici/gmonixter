#!/usr/bin/env bash

# curl "https://musicbrainz.org/ws/2/recording?query=%22never%20gonna%20give%20you%20up%22%20AND%20artist:rick%20astley&fmt=json"

# curl "https://musicbrainz.org/ws/2/release?query=%22never%20gonna%20give%20you%20up%22%20AND%20artist:rick%20astley&fmt=json"

# See https://musicbrainz.org/doc/MusicBrainz_API/Search#Release
# and https://musicbrainz.org/doc/Release
curl "https://musicbrainz.org/ws/2/release?query=%22bad%20guy22%20AND%20artist:billie%20eilish&fmt=json"
