import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";

import { imageSource } from "@/src/brand";
import { Badge, BottomNav, EmptyState, ErrorState, Header, Loading, useScreenStyles } from "@/src/components/ui";
import { eventWhen } from "@/src/format";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { fetchEvents } from "@/src/store/contentSlice";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { RSVP_LABEL } from "@/src/types";

// Events (GET /api/promotions?promotion_type=event) — partners mark whether they will attend.
export default function Events() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const events = useAppSelector((st) => st.content.events);
  const load = useCallback((page = 1) => dispatch(fetchEvents({ params: {}, page })), [dispatch]);
  useEffect(() => {
    load(1);
  }, [load]);
  const more = events.page < events.lastPage;

  return (
    <View style={s.screen} testID="events-screen">
      <Header title="Events" />
      {events.status === "loading" && !events.items.length ? <Loading /> : events.status === "failed" && !events.items.length ? <ErrorState message={events.error ?? "Could not load events"} onRetry={() => load(1)} /> : (
        <FlatList
          data={events.items}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100, gap: 12 }}
          refreshControl={<RefreshControl refreshing={events.status === "loading" && !!events.items.length} onRefresh={() => load(1)} tintColor={colors.brandPrimary} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => more && !events.loadingMore && load(events.page + 1)}
          ListHeaderComponent={<Text style={[s.bodyMuted, { marginBottom: 4 }]}>Let County Green know whether you will attend.</Text>}
          ListFooterComponent={events.loadingMore ? <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 8 }} /> : null}
          ListEmptyComponent={<EmptyState icon="calendar-outline" title="No events right now" body="Upcoming County Green events will appear here." />}
          renderItem={({ item: e }) => (
            <Pressable onPress={() => router.push(`/events/${e.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]} testID={`event-card-${e.id}`}>
              {e.image_url ? <Image source={imageSource(e.image_url)} style={styles.img} contentFit="cover" /> : null}
              <View style={{ padding: spacing.lg, gap: 6 }}>
                <View style={[s.row, { gap: 6, flexWrap: "wrap" }]}>
                  {e.tag_name ? <Badge label={e.tag_name} tone="gold" small /> : null}
                  {e.rsvp_status ? <Badge label={RSVP_LABEL[e.rsvp_status] ?? e.rsvp_status} tone={e.rsvp_status === "attending" ? "success" : "muted"} small /> : null}
                </View>
                <Text style={styles.title}>{e.title}</Text>
                {eventWhen(e) ? <Text style={s.meta}>{eventWhen(e)}</Text> : null}
                {e.short_description ? <Text style={s.bodyMuted} numberOfLines={2}>{e.short_description}</Text> : null}
              </View>
            </Pressable>
          )}
        />
      )}
      <BottomNav />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  img: { height: 160, backgroundColor: colors.forestSoft },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26, color: colors.onSurface },
}));
