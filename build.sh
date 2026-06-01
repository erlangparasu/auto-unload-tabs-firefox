#!/bin/bash

VERSION=$(node -p "require('./manifest.json').version")
OUTPUT="auto-unload-tabs-${VERSION}.zip"

rm -f "$OUTPUT"

zip -r "$OUTPUT" \
  manifest.json \
  background.js \
  content.js \
  popup.html \
  popup.js \
  popup.css \
  icons/ \
  -x "*.DS_Store"

echo "Created: $OUTPUT"
