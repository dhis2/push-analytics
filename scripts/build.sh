#!/usr/bin/env bash

# Note: showing the output of various commands is confusing so output
# is surpressed by piping to >/dev/null 2>&1
echo "arg 1 $1"
echo "version var $version"
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
tar -zcvf ./push-analytics.tar.gz ./dist ./dist >/dev/null 2>&1
# Colocate the compressed file with the uncompressed assets
mv ./push-analytics.tar.gz ./dist/push-analytics.tar.gz
# Compute the file size
FILE_SIZE_KB=$(du -k ./dist/push-analytics.tar.gz | cut -f1)
FILE_SIZE_MB=$(bc <<<"scale=2; $FILE_SIZE_KB/1024")
echo "Created build artifact './dist/push-analytics.tar.gz' ("$FILE_SIZE_MB" MB)"
