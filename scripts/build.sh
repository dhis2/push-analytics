#!/usr/bin/env bash

# Note: showing the output of various commands is confusing so output
# is surpressed by piping to >/dev/null 2>&1

VERSION="${1:-UNKNOWN_VERSION}"
FILE_NAME=push-analytics-$VERSION.tar.gz

# Clear previous builds
rimraf ./dist && mkdir ./dist && mkdir ./dist/images
# Copy package.jsnon and lockfile to dist
cp ./package.json ./package-lock.json ./dist/
# Install dependencies in build dir
cd ./dist
npm install --omit=dev >/dev/null 2>&1
cd ..
# Compile TypeScript to JavaScript (suppress output)
npx -y tsc -p ./tsconfig.prod.json ./dist >/dev/null 2>&1
# Compress the ./dist folder (suppress output)
tar -zcvf ./$FILE_NAME ./dist ./dist >/dev/null 2>&1
# Colocate the compressed file with the uncompressed assets
mv ./$FILE_NAME ./dist/$FILE_NAME
# Compute the file size
FILE_SIZE_KB=$(du -k ./dist/$FILE_NAME | cut -f1)
FILE_SIZE_MB=$(bc <<<"scale=2; $FILE_SIZE_KB/1024")
echo "Created build artifact './dist/push-analytics.tar.gz' ("$FILE_SIZE_MB" MB)"
