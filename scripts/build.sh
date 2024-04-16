#!/usr/bin/env bash

# Note: showing the output of various commands is confusing so output
# is surpressed by piping to >/dev/null 2>&1

# Clear previous builds
rm -r ./dist && mkdir ./dist && mkdir ./dist/images
# Copy package.jsnon and lockfile to dist
cp ./package.json ./package-lock.json ./dist/
# Install dependencies in build dir
cd ./dist
npm install --omit=dev >/dev/null 2>&1
cd ..
# Compile TypeScript to JavaScript (suppress output)
npx -y tsc -p ./tsconfig.prod.json ./dist >/dev/null 2>&1
