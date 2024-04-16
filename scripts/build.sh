#!/usr/bin/env bash

# Clear previous builds
rm -rf ./dist && mkdir ./dist && mkdir ./dist/images
# Copy package.jsnon and lockfile to dist
cp ./package.json ./package-lock.json ./dist/
# Install dependencies in build dir
cd ./dist
npm install --omit=dev --only=production --ignore-scripts
cd ..
# Compile TypeScript to JavaScript
npx -y tsc -p ./tsconfig.prod.json
