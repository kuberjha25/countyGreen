import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth";
import { BRAND, IMAGES, LOGO_WHITE } from "@/src/brand";
import { fonts, makeStyles, useTheme } from "@/src/theme";

// Screen 1 · Splash / Welcome
export default function Splash() {
  const router = useRouter();
  const { ready, token, user } = useAuth();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      if (!token || !user) router.replace("/(auth)/login");
      else if (!user.profile_completed) router.replace("/(auth)/profile-type");
      else router.replace("/(tabs)/home");
    }, 1600);
    return () => clearTimeout(t);
  }, [ready, token, user, router]);

  return (
    <View style={styles.screen} testID="splash-screen">
      <Image source={IMAGES["hero-sunset"]} style={styles.bg} contentFit="cover" />
      <LinearGradient colors={[colors.scrimStart, colors.scrimEnd, colors.forestDeep]} locations={[0, 0.55, 1]} style={styles.bg} />
      <Animated.View entering={FadeIn.duration(900)} style={styles.center}>
        <Image source={LOGO_WHITE} style={styles.logo} contentFit="contain" />
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(500).duration(700)} style={[styles.bottom, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={styles.tagline}>{BRAND.tagline}</Text>
        <Text style={styles.meta}>{BRAND.status.toUpperCase()} · {BRAND.location.toUpperCase()}</Text>
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.forestDeep },
  bg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  logo: { width: 230, height: 200 },
  bottom: { alignItems: "center", paddingHorizontal: 32 },
  tagline: { fontFamily: fonts.displayItalic, fontSize: 30, color: colors.onImage, textAlign: "center" },
  meta: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 3, color: colors.brandSecondary, marginTop: 12 },
}));
