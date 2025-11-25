#!/bin/bash

# Update all color values to new branding
# Primary: #701c74, Secondary: #b166b9, Accent: #b8ca47

# Find and replace in all TypeScript and CSS files
find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) -exec sed -i 's/#8b1c6d/#701c74/g' {} +
find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) -exec sed -i 's/#9333ea/#701c74/g' {} +
find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) -exec sed -i 's/#7c3aed/#6b1557/g' {} +
find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) -exec sed -i 's/#6b1557/#701c74/g' {} +

echo "Colors updated!"
echo "Primary: #701c74"
echo "Secondary: #b166b9" 
echo "Accent: #b8ca47"









