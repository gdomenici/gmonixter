#!/usr/bin/env bash


# See https://musicbrainz.org/doc/MusicBrainz_API/Search#Release
# and https://musicbrainz.org/doc/Release
# curl "https://musicbrainz.org/ws/2/release?query=%22bad%20guy22%20AND%20artist:billie%20eilish&fmt=json"


# curl "https://musicbrainz.org/ws/2/artist?query=artist:Whitesnake&fmt=json"

# curl "https://musicbrainz.org/ws/2/release?query=%22here%20i%20go%20again22%20AND%20arid:5dedf5cf-a598-4408-9556-3bf3f149f3ba&fmt=json"

#curl "https://musicbrainz.org/ws/2/release?query=%22here%20i%20go%20again22%20AND%20artist:whitesnake&fmt=json"

curl "https://musicbrainz.org/ws/2/release?query=%22Hotel+California+-+2013+Remaster%22+AND+artist%3AEagles%22&fmt=json&limit=10"