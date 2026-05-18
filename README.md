# Bundler - Shopify Custom Bundle Application

Bundler is a custom Shopify app built for seamlessly creating, managing, and applying discount bundle rules. The app provides merchants with powerful administrative tools to set up bundle triggers, product/collection exclusions, and discount logic, powering a smooth shopping experience.

## Tech Stack

- **Framework**: [React Router v7](https://reactrouter.com/) (formerly Remix)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/)
- **Database ORM**: [Prisma](https://www.prisma.io/)
- **Database Provider**: [Turso (libSQL)](https://turso.tech/) / SQLite
- **Shopify Integration**: `@shopify/shopify-app-react-router`, `@shopify/app-bridge-react`
- **Hosting / Deployment**: [Coolify](https://coolify.io/) with Docker (Nixpacks)

## Key Features

- **Bundle Rule Engine**: Configure rules specifying which products/collections trigger a bundle and the discount value applied.
- **Priority Logic**: Organize overlapping rules via priority scoring.
- **Analytics Tracking**: Count widget views, "add to cart" clicks, successful additions, and discount applications on each bundle.
- **Turso Database Integration**: Leveraging distributed edge databases using `libsql` and `@prisma/adapter-libsql`.

## Local Development

### Prerequisites

- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli/getting-started)
- Node.js (v20.19+ or v22.12+)

### Setup

Install the required dependencies:
```bash
npm install
```

Start the local development server:
```bash
npm run dev
```

> Note: For local development, the app utilizes a local SQLite database (`dev.db`). The Prisma `DATABASE_URL` will default correctly if you do not set an external Turso URL.

## Deployment via Coolify

This app is configured to be seamlessly deployed via **Coolify** using **Nixpacks** and **Docker**.

### Environment Variables

Ensure the following variables are set in your Coolify deployment:

```env
DATABASE_URL=libsql://bundler-your-db.turso.io
DATABASE_AUTH_TOKEN=your_turso_token
NIXPACKS_NODE_VERSION=22
SCOPES=read_products,write_products,read_discounts,write_discounts
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_APP_URL=https://bundler.yourdomain.com
```

### Build & Start Commands

The `package.json` contains specialized scripts to safely migrate and start the app on Turso using driver adapters.

Coolify should be configured to run:
- **Build command**: `npm run build`
- **Start command**: `npm run docker-start`

### Migration Details

Prisma CLI natively validates `sqlite` providers with `file:` protocols, which blocks `libsql://` remote URLs.

To resolve this limitation during deployments, the `docker-start` script runs `npm run setup`, calling our custom proxy script `scripts/setup.js`. This script correctly initializes Prisma client generation with a dummy protocol and runs custom libSQL migrations across HTTP if a Turso Database URL is detected.

## Shopify App Scopes

Bundler currently requests the following access scopes:
- `read_products`, `write_products`
- `read_discounts`, `write_discounts`
