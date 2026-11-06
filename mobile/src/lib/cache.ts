import AsyncStorage from "@react-native-async-storage/async-storage";
import { createCache } from "./cache-store";

export const fieldCache = createCache(AsyncStorage);
export { cachedSubscription } from "./cache-store";
