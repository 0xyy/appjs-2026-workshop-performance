import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

import { BookmarkButton } from '@/components/feed/actions/bookmark-button';
import { LikeButton } from '@/components/feed/actions/like-button';
import { ShareButton } from '@/components/feed/actions/share-button';
import { Colors } from '@/constants/theme';
import { FeedPost } from '@/data/mock-feed';

interface PostActionsBarProps {
  post: FeedPost;
  colors: typeof Colors.light;
}

export const PostActionsBar = ({ post, colors }: PostActionsBarProps) => {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [shareCount, setShareCount] = useState(0);

  const handleLike = useCallback(() => {
    setIsLiked((prevIsLiked) => {
      const nextIsLiked = !prevIsLiked;
      setLikesCount(
        (prevLikesCount) => prevLikesCount + (nextIsLiked ? 1 : -1),
      );
      return nextIsLiked;
    });
  }, []);

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <LikeButton isLiked={isLiked} colors={colors} onPress={handleLike} />
          <ShareButton
            postId={post.id}
            username={post.user.username}
            colors={colors}
            onShareComplete={() =>
              setShareCount((prevShareCount) => prevShareCount + 1)
            }
          />
        </View>
        <BookmarkButton
          initialIsBookmarked={post.isBookmarked}
          colors={colors}
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 12,
        }}
      >
        <TouchableOpacity onPress={() => router.push(`/likes/${post.id}`)}>
          <Text
            style={{ fontWeight: '600', fontSize: 14, color: colors.text }}
          >
            {likesCount.toLocaleString()} likes
          </Text>
        </TouchableOpacity>
        {shareCount > 0 && (
          <Text style={{ fontSize: 14, color: colors.icon }}>
            · {shareCount} {shareCount === 1 ? 'share' : 'shares'}
          </Text>
        )}
      </View>
    </View>
  );
};
