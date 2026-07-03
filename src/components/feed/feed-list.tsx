import { useCallback } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { FeedItem } from '@/components/feed/feed-item';
import { SuggestedPostsSection } from '@/components/feed/suggestions/suggested-posts-section';
import { FeedListItem } from '@/data/mock-feed';

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList<FeedListItem>);

export const FeedList = ({ data }: { data: FeedListItem[] }) => {
  const contentHeight = useSharedValue(0);
  const layoutHeight = useSharedValue(0);
  const progress = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((e) => {
    const offset = e.contentOffset.y;
    const max = Math.max(1, contentHeight.value - layoutHeight.value);
    progress.value = Math.min(1, Math.max(0, offset / max));
  });

  const handleContentSizeChange = (_w: number, h: number) => {
    contentHeight.value = h;
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    layoutHeight.value = e.nativeEvent.layout.height;
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<FeedListItem>) =>
      item.type === 'suggestions' ? (
        <SuggestedPostsSection posts={item.posts} />
      ) : (
        <FeedItem item={item} />
      ),
    [],
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, progressStyle]} />
      </View>
      <AnimatedFlashList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        getItemType={(item) => item.type}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        onScroll={scrollHandler}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayout}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  content: {
    paddingBottom: 20,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF3B30',
  },
});
