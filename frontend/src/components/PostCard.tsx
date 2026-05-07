import React, { useState } from 'react';
import type { Post } from '../types';
import { Heart, Share2, User as UserIcon } from 'lucide-react';
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
    <div id={`post-${postIdentifier}`} className="bg-slate-900/80 rounded-2xl border border-indigo-800/60 shadow-lg shadow-indigo-950/40 overflow-hidden">
      <div className="p-4 flex items-center space-x-3">
        <div className="w-8 h-8 rounded-full bg-slate-700 ring-2 ring-violet-400/40 flex-shrink-0 flex items-center justify-center overflow-hidden">
          {postAvatar ? (
            <img src={postAvatar} alt={postUsername} className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="text-slate-300" size={16} />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-100 truncate">{postUsername}</h3>
          <p className="text-xs text-slate-400">{new Date(post.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="px-4 pb-3">
        <h2 className="text-xl font-bold text-violet-200 mb-2">{post.title}</h2>
        <p className="text-slate-200 whitespace-pre-wrap">{post.body}</p>
      </div>

      {postImageUrls.length > 0 && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-3">
            {postImageUrls.map((imageUrl, index) => (
              <img
                key={`${postIdentifier}-image-${index}`}
                src={imageUrl}
                alt={`${post.title} image ${index + 1}`}
                className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover border border-indigo-800/50 shadow-sm shadow-indigo-950/40"
              />
            ))}
          </div>
        </div>
      )}

      {postAudioUrl && (
        <div className="px-4 pb-4">
          <audio controls className="w-full opacity-90" preload="none" src={postAudioUrl}>
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      <div className="px-4 py-3 border-t border-indigo-900/40 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <button
            onClick={() => likeMutation.mutate()}
            className={clsx(
              "flex items-center space-x-2 transition-colors",
              liked ? "text-rose-400" : "text-slate-300 hover:text-rose-400"
            )}
          >
            <Heart size={20} fill={liked ? "currentColor" : "none"} />
            <span className="text-sm font-medium">{likesCount}</span>
          </button>
        </div>
        <button
          onClick={handleShare}
          className="text-slate-300 hover:text-emerald-300 transition-colors"
        >
          <Share2 size={20} />
        </button>
      </div>
    </div>
  );
};

export default PostCard;
