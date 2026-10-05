import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth";
import { BRAND, IMAGES, LEAF } from "@/src/brand";
import { Button } from "@/src/components/ui";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

// Screen 5 · Registration Success (after profile Step 4)
export default function Welcome() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const scale = useSharedValue(0.2);
  const halo = useSharedValue(0.9);

  useEffect(() => {
    scale.value = withDelay(150, withSpring(1, { damping: 12, stiffness: 140 }));
    halo.value = withRepeat(withSequence(withTiming(1.12, { duration: 1400, easing: Easing.inOut(Easing.ease) }), withTiming(0.95, { duration: 1400, easing: Easing.inOut(Easing.ease) })), -1, true);
  }, [scale, halo]);

  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const haloStyle = useAnimatedStyle(() => ({ transform: [{ scale: halo.value }] }));

  return (
    <View style={styles.screen} testID="welcome-screen">
      <Image source={IMAGES["hero-sunset"]} style={styles.bg} contentFit="cover" />
      <LinearGradient colors={[colors.scrimEnd, colors.forestDeep, colors.forestDeep]} locations={[0, 0.45, 1]} style={styles.bg} />

      <Animated.View entering={FadeIn.duration(600)} style={[styles.brandRow, { paddingTop: insets.top + 16 }]}>
        <Image source={LEAF} style={{ width: 28, height: 28, tintColor: colors.brandSecondary }} contentFit="contain" />
        <Text style={styles.brand}>{BRAND.name.toUpperCase()}</Text>
      </Animated.View>

      <View style={styles.center}>
        <View style={styles.checkWrap}>
          <Animated.View style={[styles.halo, haloStyle]} />
          <Animated.View style={[styles.check, checkStyle]}>
            <Ionicons name="checkmark" size={46} color={colors.forestDeep} />
          </Animated.View>
        </View>
        <Animated.View entering={FadeInDown.delay(350).duration(600)}>
          <Text style={styles.thank}>Thank You</Text>
          <Text style={styles.forSignup}>for Sign Up</Text>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(600).duration(600)} style={styles.divider} />
        <Animated.View entering={FadeInUp.delay(750).duration(600)} style={{ alignItems: "center", gap: 6 }}>
          <Text style={styles.created}>Your Account has been Created</Text>
          <Text style={styles.family}>Welcome to County Greens Family{user?.first_name ? `, ${user.first_name}` : ""}</Text>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.delay(950).duration(600)} style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <Button label="Let's get started" icon="arrow-forward" variant="gold" onPress={() => router.replace("/(tabs)/home")} testID="welcome-get-started-button" />
        <Text style={styles.meta}>{BRAND.tagline.toUpperCase()}</Text>
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.forestDeep },
  bg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  brand: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 3.2, color: colors.onImage },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  checkWrap: { width: 160, height: 160, alignItems: "center", justifyContent: "center", marginBottom: spacing.xl },
  halo: { position: "absolute", width: 150, height: 150, borderRadius: 75, borderWidth: 1, borderColor: colors.brandSecondary, opacity: 0.55 },
  check: { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center", shadowColor: colors.brandSecondary, shadowOpacity: 0.45, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  thank: { fontFamily: fonts.display, fontSize: 48, lineHeight: 52, color: colors.onImage, textAlign: "center" },
  forSignup: { fontFamily: fonts.displayItalic, fontSize: 30, color: colors.brandSecondary, textAlign: "center", marginTop: -4 },
  divider: { width: 40, height: 1, backgroundColor: colors.brandSecondary, marginVertical: spacing.xl, opacity: 0.8 },
  created: { fontFamily: fonts.medium, fontSize: 15, color: colors.onImage, textAlign: "center" },
  family: { fontFamily: fonts.body, fontSize: 14, color: colors.onImageMuted, textAlign: "center", lineHeight: 21 },
  footer: { paddingHorizontal: spacing.xl, gap: 16, alignItems: "center" },
  meta: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 2.6, color: colors.onImageMuted, borderRadius: radius.pill },
}));
