import React, { useState } from 'react';
import { Post } from '../types';
import { Heart, MessageCircle, Share2, User as UserIcon } from 'lucide-react';
import { postService } from '../api/postService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [likesCount, setLikesCount] = useState(post._count?.likes ?? 0);
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: () => (liked ? postService.unlikePost(post.id) : postService.likePost(post.id)),
    onSuccess: () => {
      setLiked(!liked);
      setLikesCount(liked ? likesCount - 1 : likesCount + 1);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const handleShare = async () => {
    try {
      await postService.sharePost(post.id);
      alert('Post shared successfully!');
    } catch (err) {
      console.error('Failed to share post', err);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
          {post.user.profile?.avatarUrl ? (
            <img src={post.user.profile.avatarUrl} alt={post.user.username} className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="text-gray-400" size={20} />
          )}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{post.user.username}</h3>
          <p className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="px-4 pb-3">
        <h2 className="text-xl font-bold text-gray-900 mb-2">{post.title}</h2>
        <p className="text-gray-700 whitespace-pre-wrap">{post.body}</p>
      </div>

      {post.imageKeys && post.imageKeys.length > 0 && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-1 gap-2">
             {/* Note: In a real app, we'd resolve these keys to URLs. 
                 For now, we'll assume the backend provides urls or we have a helper. */}
             <div className="bg-gray-100 aspect-video rounded-lg flex items-center justify-center text-gray-400 text-sm">
               Images attached ({post.imageKeys.length})
             </div>
          </div>
        </div>
      )}

      {post.audioKey && (
        <div className="px-4 pb-4">
          <div className="bg-indigo-50 p-3 rounded-lg flex items-center space-x-3">
             <div className="flex-1 h-2 bg-indigo-200 rounded-full overflow-hidden">
               <div className="w-1/3 h-full bg-indigo-600"></div>
             </div>
             <span className="text-xs font-medium text-indigo-700">Audio clip</span>
          </div>
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
