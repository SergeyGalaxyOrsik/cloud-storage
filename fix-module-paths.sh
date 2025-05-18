#!/bin/bash

echo "Fixing NestJS module path aliases..."

# Make sure the right paths are configured in tsconfig.json
echo "Updating tsconfig.json..."
cat > tsconfig.json << EOF
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "es2017",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false,
    "paths": {
      "@app/common": ["libs/common/src"],
      "@app/common/*": ["libs/common/src/*"],
      "@app/activities": ["libs/activities/src"],
      "@app/activities/*": ["libs/activities/src/*"]
    }
  }
}
EOF

# Create symbolic links in node_modules to ensure proper module resolution
echo "Creating symbolic links for @app namespace..."
mkdir -p node_modules/@app

# Check if libs/common exists and create a symlink
if [ -d "libs/common" ]; then
  echo "Creating symlink for @app/common"
  ln -sf ../../libs/common node_modules/@app/common
fi

# Check if libs/activities exists and create a symlink
if [ -d "libs/activities" ]; then
  echo "Creating symlink for @app/activities"
  ln -sf ../../libs/activities node_modules/@app/activities
fi

echo "Module path fixes applied successfully!" 