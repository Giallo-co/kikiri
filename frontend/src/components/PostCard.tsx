import React, { useState } from 'react';
import type { Post } from '../types';
import { Heart, MessageCircle, Share2, User as UserIcon } from 'lucide-react';
import { postService } from '../api/postService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const postIdentifier = post.postId || String(post.id);
  const postUser = post.user;
  const postUsername = postUser?.username || 'User';
  const postAvatar = postUser?.profile?.avatarUrl || postUser?.profilePictureUrl || null;
  const postImageUrls = post.imageUrls ?? [];
  const postAudioUrl = post.audioUrl ?? null;
  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [likesCount, setLikesCount] = useState(post._count?.likes ?? 0);
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: () => (liked ? postService.unlikePost(postIdentifier) : postService.likePost(postIdentifier)),
    onSuccess: () => {
      setLiked(!liked);
      setLikesCount(liked ? likesCount - 1 : likesCount + 1);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const handleShare = async () => {
    try {
      await postService.sharePost(postIdentifier);
      const deepLink = `${window.location.origin}/profile/${post.userId}#post-${postIdentifier}`;
      await navigator.clipboard.writeText(deepLink);
      alert('Post link copied to clipboard!');
    } catch (err) {
      console.error('Failed to share post', err);
    }
  };

  return (
    <div id={`post-${postIdentifier}`} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
          {postAvatar ? (
            <img src={postAvatar} alt={postUsername} className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="text-gray-400" size={20} />
          )}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{postUsername}</h3>
          <p className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="px-4 pb-3">
        <h2 className="text-xl font-bold text-gray-900 mb-2">{post.title}</h2>
        <p className="text-gray-700 whitespace-pre-wrap">{post.body}</p>
      </div>

      {postImageUrls.length > 0 && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-1 gap-2">
            {postImageUrls.map((imageUrl, index) => (
              <img
                key={`${postIdentifier}-image-${index}`}
                src={imageUrl}
                alt={`${post.title} image ${index + 1}`}
                className="w-full rounded-lg object-cover"
              />
            ))}
          </div>
        </div>
      )}

      {postAudioUrl && (
        <div className="px-4 pb-4">
          <audio controls className="w-full" preload="none" src={postAudioUrl}>
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <button
            onClick={() => likeMutation.mutate()}
            className={clsx(
              "flex items-center space-x-2 transition-colors",
              liked ? "text-red-500" : "text-gray-500 hover:text-red-500"
            )}
          >
            <Heart size={20} fill={liked ? "currentColor" : "none"} />
            <span className="text-sm font-medium">{likesCount}</span>
          </button>
          <div className="flex items-center space-x-2 text-gray-500">
            <MessageCircle size={20} />
            <span className="text-sm font-medium">{post._count?.comments ?? 0}</span>
          </div>
        </div>
        <button
          onClick={handleShare}
          className="text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <Share2 size={20} />
        </button>
      </div>
    </div>
  );
};

export default PostCard;
