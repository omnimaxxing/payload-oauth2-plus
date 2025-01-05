# @omnipixel/payload-oauth2-plus

Enhanced OAuth2 plugin for Payload CMS with Apple OAuth support. This package extends the excellent [payload-oauth2](https://github.com/WilsonLe/payload-oauth2) plugin with additional features and improvements.

## Features

✨ Everything from the original payload-oauth2, plus:
- Full Apple OAuth support with `form_post` response mode
- Improved type safety
- Better error handling


## Installation

```bash
npm install @omnipixel/payload-oauth2-plus
# or
yarn add @omnipixel/payload-oauth2-plus
# or
pnpm add @omnipixel/payload-oauth2-plus
```

## Usage

```typescript
import { OAuth2Plugin } from '@omnipixel/payload-oauth2-plus'

// Configure your OAuth providers
export const appleOAuth = OAuth2Plugin({
  // ... your config
})
```

## Credits

This package is a fork of [payload-oauth2](https://github.com/WilsonLe/payload-oauth2) by Wilson Le, enhanced with Apple OAuth support and other improvements.

## License

MIT
