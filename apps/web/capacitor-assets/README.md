# Capacitor asset sources

Drop the source artwork here. Codemagic regenerates iOS icon + splash
variants from these files on every `mobile/*` push.

## Required files

| File              | Purpose                                | Size          | Notes                                                                                                                                            |
| ----------------- | -------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `icon-only.png`   | App icon (Home Screen, Settings, etc.) | **1024×1024** | iOS auto-rounds the corners. Subject should fill ~70% of the frame to survive at the small sizes (60×60).                                        |
| `splash.png`      | Splash screen (shown on launch)        | **2732×2732** | Subject is centred and scaled to fit. Background pixels outside the safe area get clipped on smaller devices, so keep important content centred. |
| `splash-dark.png` | Optional dark-mode splash              | **2732×2732** | If absent, `splash.png` is used in both light + dark.                                                                                            |

## How it works

The Codemagic pipeline (`codemagic.yaml`) checks for these files after
`cap sync` and runs `pnpm cap:assets`, which uses
`@capacitor/assets generate` to write the resized variants into
`ios/App/App/Assets.xcassets/`. If the source files are missing the step
is skipped silently (defaults are used).

To regenerate locally:

```bash
cd apps/web
pnpm cap:add:ios    # if you don't already have ios/
pnpm cap:assets
```

## Splash background

`capacitor.config.ts` sets `plugins.SplashScreen.backgroundColor` — make
sure it matches the dominant colour of `splash.png` so there's no flash
at the edges on tall devices. Current value: `#1a4e6b` (navy from the
plane artwork).
