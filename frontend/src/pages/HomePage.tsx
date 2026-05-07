import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { postService } from '../api/postService';
import { useAuth } from '../hooks/useAuth';
import MainLayout from '../layouts/MainLayout';
import PostCard from '../components/PostCard';

const HomePage: React.FC = () => {
  const { user } = useAuth();

  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['feed', user?.id],
    queryFn: () => postService.getFeed(user!.id),
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          Error loading feed. Please try again later.
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {posts && posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.postId || post.id} post={post} />)
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-gray-500 text-lg">Your feed is empty. Start following users!</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default HomePage;
