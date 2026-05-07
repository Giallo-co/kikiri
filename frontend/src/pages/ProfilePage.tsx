import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../api/authService';
import { userService } from '../api/userService';
import { postService } from '../api/postService';
import { useAuth } from '../hooks/useAuth';
import MainLayout from '../layouts/MainLayout';
import PostCard from '../components/PostCard';
import { User as UserIcon, Settings, UserPlus, UserMinus } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const userId = Number(id);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => authService.getProfile(userId),
    enabled: !!userId,
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['userPosts', userId],
    queryFn: () => postService.getUserPosts(userId),
    enabled: !!userId,
  });

  const { data: following } = useQuery({
    queryKey: ['following', currentUser?.id],
    queryFn: () => userService.getFollowing(currentUser!.id),
    enabled: !!currentUser?.id,
  });

  const isFollowing = following?.some((f) => f.id === userId);
  const isOwnProfile = currentUser?.id === userId;

  const followMutation = useMutation({
    mutationFn: () => (isFollowing ? userService.unfollowUser(currentUser!.id, userId) : userService.followUser(currentUser!.id, userId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['following', currentUser?.id] });
    },
  });

  if (userLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="text-center py-12">User not found</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
        <div className="h-32 bg-indigo-600"></div>
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <div className="w-32 h-32 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center overflow-hidden shadow-md">
              {user.profile?.avatarUrl ? (
                <img src={user.profile.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="text-gray-400" size={60} />
              )}
            </div>
            <div className="flex space-x-3 mb-2">
              {isOwnProfile ? (
                <button className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors border border-gray-300">
                  <Settings size={18} />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <button
                  onClick={() => followMutation.mutate()}
                  className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-semibold transition-colors ${
                    isFollowing
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserMinus size={18} />
                      <span>Unfollow</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.username}</h1>
            <p className="text-gray-500">{user.email}</p>
            {user.profile?.bio && (
              <p className="mt-4 text-gray-700 leading-relaxed max-w-2xl">
                {user.profile.bio}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-2">Posts</h2>
        {postsLoading ? (
           <div className="flex justify-center py-6">
             <div className="animate-spin rounded-sm h-6 w-6 border-b-2 border-indigo-600"></div>
           </div>
        ) : posts && posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-gray-500">No posts yet.</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ProfilePage;
