# OOTB Express Application

Yet another simple express app generator that comes with out-of-the-box typescript support.

### Generate simple express template

run `npx ootb-express-app`  
This will:
* Prompt for your name, project name, extra dependencies and extra dev dependencies
* Install `express`, `helmet`, `cors` and `morgan` as dependencies + all the extra dependencies you specified
* Install `eslint`, `eslint-config-airbnb-base`, `eslint-plugin-import` and `nodemon` as dev dependencies +  all the extra dev dependencies you specified
* Configures `.eslintrc.json` file
* Creates a basic `index.js` file
* Creates a basic middlewares file

### Generate express template with options
You can also supply the `ts` and `git` options.  
E.g `npx ootb-express-app git ts` or `npx ootb-express-app ts`.    
The `git` option will also initialize git in your project directory.  
The `ts` option will add typescript support:
* It will install `typescript`, `ts-node` and `tsconfig-paths` as dependencies
* It will install `@types/node`, `@types/express`, `@types/cors`, `@types/helmet`, `@types/morgan`, `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` as dev dependencies
* Configure .eslintrc.json with typescript support
* Creates a basic `index.ts` file
* Creates a basic middlewares file