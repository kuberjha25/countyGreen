import { Linking, Text, type TextProps } from "react-native";

import { useTheme } from "@/src/theme";

// An `<a href="…">label</a>` from the admin's hyperlink option, or a bare http(s)/www URL.
const LINK = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>|((?:https?:\/\/|www\.)[^\s<]+)/gi;
// Punctuation that ends the sentence rather than the URL ("visit example.com.").
const TRAILING = /[.,;:!?)\]'"]+$/;

const open = (url: string) => Linking.openURL(/^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`).catch(() => undefined);

// Admin-written text (news content, event descriptions) with its links tappable.
export function LinkifiedText({ children, ...rest }: Omit<TextProps, "children"> & { children?: string | null }) {
  const { colors } = useTheme();
  const text = children ?? "";
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    const [whole, href, labelText, bare] = m;
    const at = m.index ?? 0;
    let end = at + whole.length;
    let url = href;
    let shown = labelText.replace(/<[^>]+>/g, "") || href;
    if (bare) {
      url = bare.replace(TRAILING, "");
      shown = url;
      end = at + url.length;
    }
    if (at > last) parts.push(text.slice(last, at));
    parts.push(
      <Text key={at} accessibilityRole="link" onPress={() => open(url)} style={{ color: colors.brandPrimary, textDecorationLine: "underline" }}>
        {shown}
      </Text>,
    );
    last = end;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <Text {...rest}>{parts}</Text>;
}
