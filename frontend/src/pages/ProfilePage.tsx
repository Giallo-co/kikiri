import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../api/authService';
import { userService } from '../api/userService';
import { postService } from '../api/postService';
import { storageService } from '../api/storageService';
import { useAuth } from '../hooks/useAuth';
import MainLayout from '../layouts/MainLayout';
import PostCard from '../components/PostCard';
import { User as UserIcon, Settings, UserPlus, UserMinus } from 'lucide-react';
import type { User } from '../types';

const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, token, login } = useAuth();
  const queryClient = useQueryClient();
  const userId = Number(id);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [editError, setEditError] = useState('');

  const getAvatarUrl = (targetUser?: User | null) =>
    targetUser?.profile?.avatarUrl || targetUser?.profilePictureUrl || null;

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

  const profilePictureMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.id) {
        throw new Error('Unauthorized');
      }
      if (!profilePictureFile) {
        throw new Error('Please select a profile picture.');
      }
      const { url, headers, key } = await storageService.getPresignedUrl('avatar', profilePictureFile);
      await storageService.uploadToS3(url, headers, profilePictureFile);
      const updatedUser = await storageService.confirmProfilePicture(currentUser.id, key);
      return updatedUser;
    },
    onSuccess: (updatedUser) => {
      if (token) {
        login(token, updatedUser);
      }
      setEditError('');
      setProfilePictureFile(null);
      setIsEditingProfile(false);
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
    onError: (err: any) => {
      setEditError(err?.response?.data?.message || err?.message || 'Could not update profile picture.');
    }
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
              {getAvatarUrl(user) ? (
                <img src={getAvatarUrl(user)!} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="text-gray-400" size={60} />
              )}
            </div>
            <div className="flex space-x-3 mb-2">
              {isOwnProfile ? (
                <button
                  onClick={() => {
                    setEditError('');
                    setIsEditingProfile((prev) => !prev);
                  }}
                  className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors border border-gray-300"
                >
                  <Settings size={18} />
                  <span>{isEditingProfile ? 'Close Edit' : 'Edit Profile'}</span>
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

      {isOwnProfile && isEditingProfile && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Edit Profile</h2>
          <p className="text-sm text-gray-500 mb-4">Username changes are disabled. You can update your profile picture here.</p>
          {editError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">
              {editError}
            </div>
          )}
          <div className="space-y-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setProfilePictureFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => profilePictureMutation.mutate()}
                disabled={!profilePictureFile || profilePictureMutation.isPending}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {profilePictureMutation.isPending ? 'Uploading...' : 'Save Profile Picture'}
              </button>
              <button
                onClick={() => {
                  setProfilePictureFile(null);
                  setEditError('');
                  setIsEditingProfile(false);
                }}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors border border-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-2">Posts</h2>
        {postsLoading ? (
           <div className="flex justify-center py-6">
             <div className="animate-spin rounded-sm h-6 w-6 border-b-2 border-indigo-600"></div>
           </div>
        ) : posts && posts.length > 0 ? (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={{
                ...post,
                user: {
                  ...post.user,
                  id: user.id,
                  username: user.username,
                  email: user.email,
                  profile: user.profile,
                  profilePictureUrl: user.profilePictureUrl,
                },
              }}
            />
          ))
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
