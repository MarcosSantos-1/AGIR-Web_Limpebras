# Welcome to your HeroUI Native app 👋

This is an [Expo](https://expo.dev) project preconfigured with
[HeroUI Native](https://heroui.com/docs/native), [Uniwind](https://docs.uniwind.dev)
(Tailwind CSS for React Native), and [Expo Router](https://docs.expo.dev/router/introduction)
with a bottom-tab layout.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. The tabs themselves live under `src/app/(tabs)/`. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## What's preconfigured

- **HeroUI Native** (`heroui-native`) wrapped in `HeroUINativeProvider` and `GestureHandlerRootView` in `src/app/_layout.tsx`
- **Uniwind** + **Tailwind CSS** wired through `metro.config.js` and `src/global.css`
- All HeroUI Native mandatory peer dependencies: `react-native-reanimated`, `react-native-gesture-handler`, `react-native-worklets`, `react-native-safe-area-context`, `react-native-svg`, `react-native-screens`
- `@gorhom/bottom-sheet` for bottom-sheet UIs
- `@expo/vector-icons` (Ionicons) for tab bar icons
- TypeScript with `strict: true` and `@/*` path alias to `./src/*`
- React Compiler enabled

## APK de teste (Android)

Execute os comandos nesta pasta (`mobile`), que contém o projeto Expo do app:

```bash
npx eas-cli env:push preview --path .env
npx eas-cli build --platform android --profile preview
```

O arquivo `.env` local é ignorado pelo Git e não acompanha o upload do código.
O primeiro comando envia a configuração ao ambiente `preview` do EAS. Use apenas
as variáveis públicas `EXPO_PUBLIC_*` do template; elas ficam incorporadas ao APK.
Atualize esse ambiente quando mudar Firebase, o endereço da API ou a chave do Maps.

A otimização nativa R8 está desativada em `app.config.ts` como medida temporária:
o APK anterior fechava antes de carregar o JavaScript, durante a criação do
`androidx.work.impl.WorkDatabase`. Reative a otimização somente após corrigir a
compatibilidade das dependências Android e validar um APK release em aparelho.

## Cache e validação no aparelho

Levantamentos, fichas, pontos personalizados, registros e histórico têm uma cópia
local por usuário, com validade de 24 horas. As assinaturas da nuvem continuam
ativas e substituem a cópia local quando chegam dados atuais. O cache serve para
leitura rápida; a conclusão de uma vistoria continua exigindo envio à nuvem.
Rascunhos e fotos ficam no armazenamento próprio do editor, separados desse cache.

Para conferir isolamento de contas, expiração e a ordem das atualizações:

```bash
node --test tests/cache-store.test.mjs
npm run typecheck
npm run lint
```

## Learn more

- [HeroUI Native components](https://heroui.com/docs/native) — full component reference
- [Expo documentation](https://docs.expo.dev/) — Expo fundamentals and guides
- [Uniwind documentation](https://docs.uniwind.dev) — Tailwind for React Native
- [Expo Router](https://docs.expo.dev/router/introduction) — file-based routing
