#!/usr/bin/env bash

VERSION="${1:-UNKNOWN_VERSION}"
FILE_NAME=push-analytics-$VERSION.tar.gz

# This script fully assumes the build script has done its thing
# Compress the ./dist folder
tar -zcvf ./$FILE_NAME ./dist ./dist
# Colocate the compressed file with the uncompressed assets
mv ./$FILE_NAME ./dist/$FILE_NAME
# Compute the file size
FILE_SIZE_KB=$(du -k ./dist/$FILE_NAME | cut -f1)
FILE_SIZE_MB=$(bc <<<"scale=2; $FILE_SIZE_KB/1024")
echo "Created build artifact './dist/$FILE_NAME' ($FILE_SIZE_MB MB)"
