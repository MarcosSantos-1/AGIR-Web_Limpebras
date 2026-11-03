import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return {
    ...config,
    name: config.name ?? "AGIR Campo",
    slug: config.slug ?? "agir-campo",
    ios: {
      ...config.ios,
      config: {
        ...config.ios?.config,
        ...(mapsKey ? { googleMapsApiKey: mapsKey } : {}),
      },
    },
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        ...(mapsKey ? { googleMaps: { apiKey: mapsKey } } : {}),
      },
    },
    plugins: [
      ...(config.plugins ?? []),
      ...(mapsKey ? [["react-native-maps", { iosGoogleMapsApiKey: mapsKey, androidGoogleMapsApiKey: mapsKey }] as [string, { iosGoogleMapsApiKey: string; androidGoogleMapsApiKey: string }]] : []),
    ],
  };
};
